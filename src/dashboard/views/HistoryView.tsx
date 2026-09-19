import { useEffect, useState } from 'react';
import type { ScanResult } from '@core/models';
import { clearHistory, deleteScan, getHistory } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { EmptyState } from '../../ui/components/Controls';
import { scoreColor } from '../../ui/components/Score';
import { FindingCountSummary } from '../../ui/components/Findings';
import { formatDateTime, timeAgo } from '../../shared/utils';
import { ScanDetail } from './DashboardView';

export function HistoryView({ onOpenScan }: { onOpenScan: () => void }) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const reload = () => {
    void getHistory(browserApi.storageLocal()).then(setScans);
  };

  useEffect(reload, []);

  const filtered = scans.filter((scan) =>
    filter ? scan.target.hostname.includes(filter.toLowerCase()) : true,
  );
  const selected = filtered.find((s) => s.id === selectedId);

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Scans</h1>
        <div className="view-actions">
          <input
            placeholder="Filter by host…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 200 }}
          />
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              void clearHistory(browserApi.storageLocal()).then(reload);
            }}
            disabled={scans.length === 0}
          >
            Clear history
          </button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState icon="≡" title="No scans recorded">
          Scans appear here as you inspect sites with Klynto. Everything is stored locally.
        </EmptyState>
      ) : selected ? (
        <div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 12 }}
            onClick={() => setSelectedId(null)}
          >
            ← Back to list
          </button>
          <ScanDetail scan={selected} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Score</th>
                <th>Findings</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((scan) => (
                <tr key={scan.id} className="clickable" onClick={() => setSelectedId(scan.id)}>
                  <td className="mono">{scan.target.hostname}</td>
                  <td>
                    <strong style={{ color: scoreColor(scan.scores.grade) }}>
                      {scan.scores.overall >= 0 ? scan.scores.overall : '-'}
                    </strong>
                  </td>
                  <td className="muted">
                    <FindingCountSummary findings={scan.findings} />
                  </td>
                  <td className="muted" title={formatDateTime(scan.timestamp)}>
                    {timeAgo(scan.timestamp)}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Delete scan"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteScan(browserApi.storageLocal(), scan.id).then(reload);
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onOpenScan}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
