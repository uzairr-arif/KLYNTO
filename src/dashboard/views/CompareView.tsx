import { useEffect, useMemo, useState } from 'react';
import type { ScanResult } from '@core/models';
import { diffScans } from '@core/compare/diff';
import { getHistory } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { getRule } from '@core/rules/registry';
import { MODULE_META } from '@core/models';
import { EmptyState } from '../../ui/components/Controls';
import { SeverityBadge, SEVERITY_ICONS } from '../../ui/components/SeverityBadge';
import { scoreColor } from '../../ui/components/Score';

function severityCell(severity: ScanResult['findings'][number]['severity'] | undefined) {
  if (!severity) return <span className="faint">-</span>;
  return (
    <span className={`sev-${severity}`} style={{ fontWeight: 700 }}>
      {SEVERITY_ICONS[severity]}
    </span>
  );
}

export function CompareView() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  useEffect(() => {
    void getHistory(browserApi.storageLocal()).then((history) => {
      setScans(history);
      if (history.length >= 2) {
        setLeftId(history[1].id);
        setRightId(history[0].id);
      } else if (history.length === 1) {
        setLeftId(history[0].id);
        setRightId(history[0].id);
      }
    });
  }, []);

  const left = scans.find((s) => s.id === leftId);
  const right = scans.find((s) => s.id === rightId);
  const diffs = useMemo(() => (left && right ? diffScans(left, right) : []), [left, right]);
  const changes = diffs.filter((d) => d.kind !== 'same');

  if (scans.length === 0) {
    return (
      <div className="dash-view">
        <header className="view-header">
          <h1>Compare</h1>
        </header>
        <EmptyState icon="⇄" title="Nothing to compare yet">
          Run at least two scans (e.g. production and staging) and compare them here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Compare</h1>
        <div className="view-actions small muted">
          {left && right && `${changes.length} difference(s)`}
        </div>
      </header>

      <div className="compare-pickers">
        <label className="compare-picker">
          <span className="uppercase-label">Baseline</span>
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)}>
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.target.hostname} - {new Date(scan.timestamp).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="compare-picker">
          <span className="uppercase-label">Comparison</span>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)}>
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.target.hostname} - {new Date(scan.timestamp).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {left && right && (
        <>
          <div className="compare-scores">
            <div className="card">
              <div className="uppercase-label">Baseline</div>
              <div className="compare-host mono">{left.target.hostname}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(left.scores.grade) }}>
                {left.scores.overall >= 0 ? left.scores.overall : '-'}
              </div>
            </div>
            <div className="card">
              <div className="uppercase-label">Comparison</div>
              <div className="compare-host mono">{right.target.hostname}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(right.scores.grade) }}>
                {right.scores.overall >= 0 ? right.scores.overall : '-'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Module</th>
                  <th>Baseline</th>
                  <th>Comparison</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((diff) => {
                  const rule = getRule(diff.ruleId);
                  const title = rule?.passTitle ?? diff.ruleId;
                  return (
                    <tr key={diff.ruleId}>
                      <td>
                        <span className="mono xs faint">{diff.ruleId}</span>
                        <div className="small">{title}</div>
                      </td>
                      <td className="muted small">
                        {MODULE_META[diff.module as keyof typeof MODULE_META]?.shortLabel ??
                          diff.module}
                      </td>
                      <td>{severityCell(diff.previous)}</td>
                      <td>{severityCell(diff.current)}</td>
                      <td>
                        {diff.kind === 'regression' && (
                          <span style={{ color: 'var(--severity-high)', fontWeight: 600 }}>
                            ▼ regression
                          </span>
                        )}
                        {diff.kind === 'improvement' && (
                          <span style={{ color: 'var(--severity-pass)', fontWeight: 600 }}>
                            ▲ improved
                          </span>
                        )}
                        {diff.kind === 'changed' && <span className="muted">changed</span>}
                        {diff.kind === 'same' && <span className="faint">same</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export { SeverityBadge };
