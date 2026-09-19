import { useCallback, useEffect, useState } from 'react';
import type { ScanResult } from '@core/models';
import { useSettings, useTheme } from '../ui/hooks/useSettings';
import { browserApi } from '../platform/browser';
import { originPatternsForHost, safeUrlParse } from '../shared/utils';
import { sendToBackground, type TabScanPayload } from '../shared/messages';
import { ScoreRing } from '../ui/components/Score';
import {
  CategoryTile,
  FindingsList,
  FindingCountSummary,
  categoryTiles,
} from '../ui/components/Findings';
import { EmptyState, Spinner } from '../ui/components/Controls';
import { Logo } from '../ui/components/Logo';

type PopupState =
  | { kind: 'loading' }
  | { kind: 'not-inspectable'; url?: string }
  | { kind: 'needs-permission'; host: string }
  | { kind: 'scanning'; previous?: ScanResult | null }
  | { kind: 'ready'; scan: ScanResult; regressions: TabScanPayload['regressions'] }
  | { kind: 'error'; message: string };

export function App() {
  const { settings } = useSettings();
  useTheme(settings);
  const [state, setState] = useState<PopupState>({ kind: 'loading' });

  const evaluate = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const tab = await browserApi.getActiveTab();
      const url = tab?.url;
      if (!url || !/^https?:/i.test(url)) {
        setState({ kind: 'not-inspectable', url });
        return;
      }
      const payload = await sendToBackground<TabScanPayload>({
        type: 'tab/getScan',
        tabId: tab.id!,
      });
      if (payload.scan) {
        setState({ kind: 'ready', scan: payload.scan, regressions: payload.regressions });
      } else if (payload.granted) {
        setState({ kind: 'scanning', previous: null });
        const scan = await sendToBackground<ScanResult>({
          type: 'tab/rescan',
          url,
          tabId: tab.id,
        });
        setState({ kind: 'ready', scan, regressions: [] });
      } else {
        const host = safeUrlParse(url)?.hostname ?? '';
        setState({ kind: 'needs-permission', host });
      }
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  const grantAndScan = useCallback(async (host: string) => {
    const granted = await browserApi.requestOrigins(originPatternsForHost(host));
    if (!granted) return;
    const tab = await browserApi.getActiveTab();
    if (tab?.url) {
      setState({ kind: 'scanning' });
      try {
        const scan = await sendToBackground<ScanResult>({
          type: 'tab/rescan',
          url: tab.url,
          tabId: tab.id,
        });
        setState({ kind: 'ready', scan, regressions: [] });
      } catch (error) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }, []);

  const rescan = useCallback(async () => {
    const tab = await browserApi.getActiveTab();
    if (!tab?.url) return;
    setState({ kind: 'scanning', previous: state.kind === 'ready' ? state.scan : null });
    try {
      const scan = await sendToBackground<ScanResult>({
        type: 'tab/rescan',
        url: tab.url,
        tabId: tab.id,
      });
      setState({ kind: 'ready', scan, regressions: [] });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, [state]);

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="popup-brand">
          <Logo size={18} />
          <span className="brand-name">KLYNTO</span>
        </div>
        <div className="popup-header-actions">
          <button
            className="btn btn-ghost btn-sm"
            title="Settings"
            onClick={() => void browserApi.openExtensionPage('options.html')}
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="popup-body">
        {state.kind === 'loading' && (
          <EmptyState icon="" title="Inspecting…">
            <Spinner />
          </EmptyState>
        )}

        {state.kind === 'not-inspectable' && (
          <EmptyState icon="◎" title="Nothing to inspect here">
            {state.url?.startsWith('chrome-extension://')
              ? 'Open a website to inspect its security configuration.'
              : 'Klynto inspects http:// and https:// pages. Open a website, then click Klynto.'}
          </EmptyState>
        )}

        {state.kind === 'needs-permission' && (
          <div className="popup-permission">
            <Logo size={36} />
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Inspect {state.host}?</h3>
            <p className="small muted" style={{ textAlign: 'center', maxWidth: 280 }}>
              Klynto analyzes responses locally in your browser. Granting access lets Klynto observe
              responses for <strong>{state.host}</strong> only. You can revoke access any time in
              Settings.
            </p>
            <button className="btn btn-primary" onClick={() => void grantAndScan(state.host)}>
              Enable inspection
            </button>
            <p className="xs faint" style={{ maxWidth: 280, textAlign: 'center' }}>
              No data ever leaves your browser. Klynto has no servers and no telemetry.
            </p>
          </div>
        )}

        {state.kind === 'scanning' && (
          <div className="popup-permission">
            <Spinner />
            <p className="small muted">Analyzing {state.previous ? 'again' : ''}…</p>
          </div>
        )}

        {state.kind === 'error' && (
          <EmptyState icon="!" title="Scan failed">
            {state.message}
          </EmptyState>
        )}

        {state.kind === 'ready' && (
          <ScanView
            scan={state.scan}
            regressions={state.regressions}
            onRescan={() => void rescan()}
            showPasses={settings.showPasses}
          />
        )}
      </main>

      <footer className="popup-footer">
        <button
          className="btn btn-sm"
          onClick={() => void rescan()}
          disabled={state.kind === 'scanning' || state.kind === 'loading'}
        >
          ↻ Rescan
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => {
            const tab = state.kind === 'ready' ? state.scan.target.url : undefined;
            const hash = tab ? `scan?url=${encodeURIComponent(tab)}` : '';
            void browserApi.openExtensionPage('dashboard.html', hash);
            window.close();
          }}
        >
          Open Klynto
        </button>
      </footer>
    </div>
  );
}

function ScanView({
  scan,
  regressions,
  onRescan,
  showPasses,
}: {
  scan: ScanResult;
  regressions: TabScanPayload['regressions'];
  onRescan: () => void;
  showPasses: boolean;
}) {
  return (
    <>
      <div className="popup-target">
        <div className="target-host mono">{scan.target.hostname}</div>
        <div className="target-meta">
          <span className={`badge ${scan.target.protocol === 'https' ? 'sev-pass' : 'sev-high'}`}>
            {scan.target.protocol.toUpperCase()}
          </span>
          <span className="xs faint">
            {scan.source === 'passive' ? 'live traffic' : 'active scan'} ·{' '}
            {new Date(scan.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {regressions.length > 0 && (
        <div className="banner warning" style={{ marginBottom: 'var(--space-3)' }}>
          <span style={{ fontWeight: 700 }}>!</span>
          <div>
            <strong>Security regression detected</strong>
            <div className="small">
              {regressions.length === 1
                ? regressions[0].title
                : `${regressions.length} controls regressed since the previous scan`}
            </div>
          </div>
        </div>
      )}

      <div className="popup-score">
        <ScoreRing score={scan.scores.overall} grade={scan.scores.grade} size={112} />
        <div className="popup-findings-summary small muted">
          <FindingCountSummary findings={scan.findings} />
        </div>
      </div>

      <div className="popup-tiles">
        {categoryTiles(scan).map((tile) => (
          <CategoryTile key={tile.moduleId} tile={tile} />
        ))}
      </div>

      <div className="popup-findings">
        <FindingsList scan={scan} showPasses={showPasses} />
      </div>

      <button className="btn btn-ghost btn-sm rescan-inline" onClick={onRescan}>
        ↻ Rescan this page
      </button>
    </>
  );
}
