import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanResult } from '@core/models';
import { BATCH_PORT_NAME, type BatchEvent, type BatchStartMessage } from '../../shared/messages';
import { BATCH_LIMITS } from '../../shared/constants';
import { originPatternsForHost, safeUrlParse } from '../../shared/utils';
import { browserApi } from '../../platform/browser';
import { EmptyState } from '../../ui/components/Controls';
import { scoreColor } from '../../ui/components/Score';
import { batchToCsv, downloadFile } from '../../reports/download';

interface BatchState {
  running: boolean;
  batchId: string | null;
  done: number;
  total: number;
  current: string;
  results: ScanResult[];
  errors: Array<{ url: string; error: string }>;
  notice: string;
}

const INITIAL: BatchState = {
  running: false,
  batchId: null,
  done: 0,
  total: 0,
  current: '',
  results: [],
  errors: [],
  notice: '',
};

/** Distinct hosts of a URL list, for the site-access prompt. */
function distinctHosts(urls: string[]): string[] {
  const hosts = new Set<string>();
  for (const url of urls) {
    const host = safeUrlParse(url)?.hostname.toLowerCase();
    if (host) hosts.add(host);
  }
  return [...hosts];
}

export function BatchView() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<BatchState>(INITIAL);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    return () => {
      portRef.current?.disconnect();
    };
  }, []);

  const start = useCallback(async () => {
    const urls = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && /^https?:\/\//i.test(line))
      .slice(0, BATCH_LIMITS.maxUrls);

    if (urls.length === 0) return;

    // Klynto can only observe origins the user granted. Request access for all
    // listed hosts in a single prompt before scanning.
    const hosts = distinctHosts(urls);
    const patterns = hosts.flatMap(originPatternsForHost);
    const granted = await browserApi.hasOrigins(patterns);
    if (!granted) {
      const ok = await browserApi.requestOrigins(patterns);
      if (!ok) {
        setState((prev) => ({
          ...prev,
          notice:
            browserApi.isFirefox()
            ? 'Firefox grants site access per extension: enable access for Klynto in about:addons (Permissions tab), then run the batch again. Nothing was scanned.'
            : 'Site access was not granted - Klynto can only observe responses for origins you approve. Nothing was scanned.',
        }));
        return;
      }
    }

    const batchId = `batch-${Date.now().toString(36)}`;
    setState({ ...INITIAL, running: true, batchId, total: urls.length });

    const port = chrome.runtime.connect({ name: BATCH_PORT_NAME });
    portRef.current = port;
    port.onMessage.addListener((event: BatchEvent) => {
      setState((prev) => {
        switch (event.type) {
          case 'progress':
            return { ...prev, done: event.done, total: event.total, current: event.current };
          case 'result':
            return { ...prev, results: [...prev.results, event.scan] };
          case 'error':
            return { ...prev, errors: [...prev.errors, { url: event.url, error: event.error }] };
          case 'done':
            return { ...prev, running: false };
          default:
            return prev;
        }
      });
    });
    port.onDisconnect.addListener(() => {
      setState((prev) => ({ ...prev, running: false }));
    });
    const startMessage: BatchStartMessage = { type: 'start', batchId, urls };
    port.postMessage(startMessage);
  }, [input]);

  const finished = !state.running && (state.results.length > 0 || state.errors.length > 0);

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Batch Scan</h1>
        <div className="view-actions">
          {finished && (
            <button
              className="btn btn-sm"
              onClick={() =>
                downloadFile(
                  `klynto-batch-${new Date().toISOString().slice(0, 10)}.csv`,
                  batchToCsv({
                    id: state.batchId ?? '',
                    startedAt: 0,
                    targets: [],
                    results: state.results,
                    errors: state.errors,
                  }),
                  'text/csv',
                )
              }
            >
              ⇩ Export CSV
            </button>
          )}
        </div>
      </header>

      <p className="small muted" style={{ marginBottom: 12 }}>
        Enter URLs to scan (one per line, max {BATCH_LIMITS.maxUrls}). Klynto requests access only
        for the origins you list and loads each target once in a hidden tab to observe its real
        response. {state.running ? 'Scanning in progress…' : ''}
      </p>

      <textarea
        rows={5}
        placeholder={'https://example.com\nhttps://api.example.com\nhttps://staging.example.com'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={state.running}
        style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
      />

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
        <button
          className="btn btn-primary"
          onClick={() => void start()}
          disabled={state.running || input.trim().length === 0}
        >
          {state.running ? 'Scanning…' : 'Run batch scan'}
        </button>
        {state.running && <div className="spinner" style={{ alignSelf: 'center' }} />}
      </div>

      {state.notice && (
        <div className="banner info" style={{ marginBottom: 16 }}>
          {state.notice}
        </div>
      )}

      {state.running && (
        <>
          <div className="progressbar" style={{ marginBottom: 6 }}>
            <div
              style={{
                width: `${state.total > 0 ? (state.done / state.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="xs faint mono" style={{ marginBottom: 16 }}>
            {state.done}/{state.total} - {state.current}
          </div>
        </>
      )}

      {state.results.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Score</th>
                <th>High</th>
                <th>Warning</th>
                <th>Review</th>
                <th>Info</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((scan) => (
                <tr key={scan.id}>
                  <td className="mono">{scan.target.url}</td>
                  <td>
                    <strong style={{ color: scoreColor(scan.scores.grade) }}>
                      {scan.scores.overall >= 0 ? scan.scores.overall : '-'}
                    </strong>
                  </td>
                  <td
                    style={{ color: scan.scores.counts.high ? 'var(--severity-high)' : undefined }}
                  >
                    {scan.scores.counts.high}
                  </td>
                  <td
                    style={{
                      color: scan.scores.counts.warning ? 'var(--severity-warning)' : undefined,
                    }}
                  >
                    {scan.scores.counts.warning}
                  </td>
                  <td
                    style={{
                      color: scan.scores.counts.review ? 'var(--severity-review)' : undefined,
                    }}
                  >
                    {scan.scores.counts.review}
                  </td>
                  <td className="muted">{scan.scores.counts.info}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.errors.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title" style={{ color: 'var(--severity-high)' }}>
            Errors ({state.errors.length})
          </div>
          {state.errors.map((err) => (
            <div key={err.url} className="small mono">
              {err.url} - <span className="muted">{err.error}</span>
            </div>
          ))}
        </div>
      )}

      {!state.running && state.results.length === 0 && state.errors.length === 0 && (
        <EmptyState icon="⊞" title="Scan a list of targets">
          Useful for checking every environment of a project: production, staging, admin, API.
          Results are saved locally and each target is scanned once.
        </EmptyState>
      )}
    </div>
  );
}
