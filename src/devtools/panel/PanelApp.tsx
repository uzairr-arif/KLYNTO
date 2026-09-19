import { useEffect, useMemo, useState } from 'react';
import type { ScanResult } from '@core/models';
import { analyze } from '@core/scanner/analyze';
import { useSettings, useTheme } from '../../ui/hooks/useSettings';
import { EmptyState, Spinner, Tabs } from '../../ui/components/Controls';
import { ScoreRing } from '../../ui/components/Score';
import {
  FindingsList,
  FindingCountSummary,
  categoryTiles,
  CategoryTile,
} from '../../ui/components/Findings';
import { entryToLite, evidenceFromHar, type HarEntryLite } from '../lib/har';

/* Minimal typing for the chrome.devtools.network surface. */
interface DevtoolsRequestEntry {
  request: { url: string; method: string };
  response: {
    status: number;
    statusText: string;
    headers: Array<{ name: string; value: string }>;
    cookies: Array<{
      name: string;
      value: string;
      path?: string;
      domain?: string;
      expires?: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: string;
    }>;
  };
  _resourceType?: string;
  startedDateTime: string;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'findings', label: 'Findings' },
  { id: 'headers', label: 'Headers' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'cors', label: 'CORS' },
  { id: 'network', label: 'Network' },
];

export function PanelApp() {
  const { settings } = useSettings();
  useTheme(settings);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<HarEntryLite[]>([]);
  const [active, setActive] = useState('overview');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const devtools = (
      chrome as unknown as {
        devtools: {
          inspectedWindow: {
            eval: (expr: string, cb: (result: string, error?: unknown) => void) => void;
          };
          network: {
            getHAR: (cb: (har: { entries: DevtoolsRequestEntry[] }) => void) => void;
            onRequestFinished: {
              addListener: (cb: (entry: DevtoolsRequestEntry) => void) => void;
            };
            onNavigated: { addListener: (cb: (url: string) => void) => void };
          };
        };
      }
    ).devtools;

    devtools.inspectedWindow.eval('location.href', (result) => {
      setPageUrl(typeof result === 'string' ? result : null);
    });

    devtools.network.getHAR((har) => {
      setEntries(har.entries.map(entryToLite));
      setReady(true);
    });

    devtools.network.onRequestFinished.addListener((entry) => {
      setEntries((prev) => {
        const next = [...prev, entryToLite(entry)];
        return next.length > 400 ? next.slice(next.length - 400) : next;
      });
    });

    devtools.network.onNavigated.addListener((url) => {
      setPageUrl(url);
      setEntries([]);
    });
  }, []);

  const mainEntry = useMemo(() => {
    const documents = entries.filter((e) => e.resourceType === 'document');
    return documents.find((e) => e.url === pageUrl) ?? documents[documents.length - 1] ?? null;
  }, [entries, pageUrl]);

  const scan: ScanResult | null = useMemo(() => {
    if (!pageUrl) return null;
    const evidence = evidenceFromHar(pageUrl, entries);
    if (!evidence) return null;
    return analyze(evidence, {
      analyzeCookies: settings.analyzeCookies,
      analyzeCors: settings.analyzeCors,
      disabledRuleIds: settings.disabledRuleIds,
    });
  }, [pageUrl, entries, settings]);

  if (!ready && !scan) {
    return (
      <EmptyState icon="◌" title="Reading network data…">
        <Spinner />
      </EmptyState>
    );
  }

  if (!scan) {
    return (
      <EmptyState icon="◎" title="No document response captured">
        Reload the inspected page so Klynto can read its responses from the DevTools network log.
        The Klynto DevTools panel needs no site permissions.
      </EmptyState>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="brand-name">KLYNTO</span>
        <span className="mono small muted">{scan.target.hostname}</span>
        <span className="xs faint">{entries.length} requests captured</span>
      </div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      <div className="panel-body">
        {active === 'overview' && (
          <>
            <div className="panel-score">
              <ScoreRing score={scan.scores.overall} grade={scan.scores.grade} size={96} />
              <div className="small muted">
                <FindingCountSummary findings={scan.findings} />
              </div>
            </div>
            <div className="panel-tiles">
              {categoryTiles(scan).map((tile) => (
                <CategoryTile key={tile.moduleId} tile={tile} />
              ))}
            </div>
          </>
        )}
        {active === 'findings' && <FindingsList scan={scan} showPasses={settings.showPasses} />}
        {active === 'headers' && <HeadersView scan={scan} mainEntry={mainEntry} />}
        {active === 'cookies' && <CookiesView scan={scan} />}
        {active === 'cors' && <CorsView scan={scan} />}
        {active === 'network' && <NetworkView scan={scan} />}
      </div>
    </div>
  );
}

function HeadersView({ scan, mainEntry }: { scan: ScanResult; mainEntry: HarEntryLite | null }) {
  return (
    <div className="card">
      <div className="card-title">Main document response</div>
      <div className="small muted">
        Status {mainEntry ? mainEntry.status : scan.target.url} · {scan.transport.redirectCount}{' '}
        redirect(s) · {scan.transport.scheme.toUpperCase()}
      </div>
      <div style={{ marginTop: 10 }}>
        {mainEntry ? (
          mainEntry.responseHeaders.map((h, i) => (
            <div className="header-row" key={i}>
              <span className="name">{h.name}</span>
              <span className="value">{h.value}</span>
            </div>
          ))
        ) : (
          <p className="small faint">No captured headers for the main document yet.</p>
        )}
      </div>
    </div>
  );
}

function CookiesView({ scan }: { scan: ScanResult }) {
  if (scan.setCookie.length === 0) {
    return <EmptyState icon="◍" title="No Set-Cookie headers observed" />;
  }
  return (
    <div className="card">
      <div className="card-title">Set-Cookie headers ({scan.setCookie.length})</div>
      {scan.setCookie.map((cookie, i) => (
        <div className="header-row" key={i}>
          <span className="name mono xs">{cookie.url}</span>
          <span className="value mono xs">{cookie.header}</span>
        </div>
      ))}
    </div>
  );
}

function CorsView({ scan }: { scan: ScanResult }) {
  const corsRequests = (scan.requests ?? []).filter((r) => r.cors !== undefined);
  if (corsRequests.length === 0) {
    return <EmptyState icon="⇄" title="No CORS responses observed" />;
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>URL</th>
            <th>Allow-Origin</th>
            <th>Credentials</th>
          </tr>
        </thead>
        <tbody>
          {corsRequests.map((r, i) => (
            <tr key={i}>
              <td className="mono xs">{r.url}</td>
              <td className="mono xs">{r.cors?.allowOrigin}</td>
              <td>{r.cors?.credentials ? 'true' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NetworkView({ scan }: { scan: ScanResult }) {
  const requests = scan.requests ?? [];
  if (requests.length === 0) {
    return <EmptyState icon="≡" title="No requests captured yet" />;
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Request</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr key={i}>
              <td>{r.insecure ? <span style={{ color: 'var(--severity-high)' }}>⚠</span> : ''}</td>
              <td
                className="mono xs"
                style={{
                  maxWidth: 420,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={r.url}
              >
                {r.url}
              </td>
              <td className="muted xs">{r.type}</td>
              <td className="mono xs">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
