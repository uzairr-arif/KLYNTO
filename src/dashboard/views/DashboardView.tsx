import { useEffect, useMemo, useState } from 'react';
import type { ScanResult } from '@core/models';
import { getLatestByOrigin, getHistory } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { EmptyState, Spinner } from '../../ui/components/Controls';
import { ScoreBreakdown, ScoreRing } from '../../ui/components/Score';
import { FindingsList, FindingCountSummary } from '../../ui/components/Findings';
import { formatDateTime, safeUrlParse } from '../../shared/utils';

export function ScanDetail({ scan }: { scan: ScanResult }) {
  const parsed = safeUrlParse(scan.target.url);
  return (
    <div>
      <div className="scan-detail-header">
        <div>
          <h2 className="mono">{scan.target.hostname}</h2>
          <div className="small muted">{scan.target.url}</div>
          <div className="small faint" style={{ marginTop: 4 }}>
            {formatDateTime(scan.timestamp)} · {scan.source} scan ·{' '}
            {scan.scores.overall >= 0 ? `score ${scan.scores.overall}` : 'not scored'}
          </div>
        </div>
        <ScoreRing score={scan.scores.overall} grade={scan.scores.grade} size={104} />
      </div>

      <div className="scan-detail-grid">
        <div className="card">
          <div className="card-title">Transport</div>
          <div className="header-row">
            <span className="name">Scheme</span>
            <span className="value">{scan.transport.scheme.toUpperCase()}</span>
          </div>
          <div className="header-row">
            <span className="name">HSTS</span>
            <span className="value">{scan.transport.hsts ?? 'not present'}</span>
          </div>
          <div className="header-row">
            <span className="name">Redirects</span>
            <span className="value">{scan.transport.redirectCount}</span>
          </div>
          <div className="header-row">
            <span className="name">Mixed content</span>
            <span className="value">
              {scan.transport.mixedContentCount > 0
                ? `${scan.transport.mixedContentCount} insecure`
                : 'none'}
            </span>
          </div>
          {parsed && parsed.port && (
            <div className="header-row">
              <span className="name">Port</span>
              <span className="value">{parsed.port}</span>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Score breakdown</div>
          <ScoreBreakdown scores={scan.scores} />
        </div>
      </div>

      <div className="small muted" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
        <FindingCountSummary findings={scan.findings} />
      </div>

      <FindingsList scan={scan} />
    </div>
  );
}

export function DashboardView({ scanUrl, scanning }: { scanUrl?: string; scanning: boolean }) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getHistory(browserApi.storageLocal()),
      getLatestByOrigin(browserApi.storageLocal()),
    ])
      .then(([history, latest]) => {
        if (!mounted) return;
        // Latest-per-origin first (fresh state of each site), then history.
        const merged = new Map<string, ScanResult>();
        for (const scan of history) merged.set(scan.id, scan);
        for (const scan of Object.values(latest)) merged.set(scan.id, scan);
        const ordered = [...merged.values()].sort((a, b) => b.timestamp - a.timestamp);
        setScans(ordered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [scanUrl, scanning]);

  const selected = useMemo(() => {
    if (selectedId) return scans.find((s) => s.id === selectedId) ?? null;
    return scans[0] ?? null;
  }, [scans, selectedId]);

  if (loading || scanning) {
    return (
      <EmptyState icon="" title={scanning ? 'Scanning…' : 'Loading scans'}>
        <Spinner />
      </EmptyState>
    );
  }

  if (scans.length === 0) {
    return (
      <EmptyState icon="◎" title="No scans yet">
        Open any website and click the Klynto toolbar icon, or run a Batch Scan. Klynto inspects the
        security configuration of pages you visit - entirely locally.
      </EmptyState>
    );
  }

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Dashboard</h1>
        <div className="view-actions"></div>
      </header>
      <div className="scan-picker">
        {scans.slice(0, 8).map((scan) => (
          <button
            key={scan.id}
            className={`scan-chip ${selected?.id === scan.id ? 'active' : ''}`}
            onClick={() => setSelectedId(scan.id)}
          >
            <span className="mono">{scan.target.hostname}</span>
            <span
              className="chip-score"
              style={{
                color:
                  scan.scores.grade === 'good'
                    ? 'var(--severity-pass)'
                    : scan.scores.grade === 'fair'
                      ? 'var(--severity-warning)'
                      : 'var(--severity-high)',
              }}
            >
              {scan.scores.overall >= 0 ? scan.scores.overall : '-'}
            </span>
          </button>
        ))}
      </div>
      {selected && <ScanDetail scan={selected} />}
    </div>
  );
}
