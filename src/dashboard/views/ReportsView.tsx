import { useEffect, useState } from 'react';
import type { ScanResult } from '@core/models';
import { getHistory } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { EmptyState } from '../../ui/components/Controls';
import { downloadScanReport, openHtmlReport } from '../../reports/download';
import { CopyButton } from '../../ui/components/Finding';
import { formatDateTime } from '../../shared/utils';

export function ReportsView() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    void getHistory(browserApi.storageLocal()).then((history) => {
      setScans(history);
      if (history.length > 0) setSelectedId(history[0].id);
    });
  }, []);

  const selected = scans.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!selected) {
      setMarkdown('');
      return;
    }
    // Regenerate markdown when the scan changes (import here avoids cycles).
    void import('../../reports/markdown').then(({ toMarkdownReport }) => {
      setMarkdown(toMarkdownReport(selected));
    });
  }, [selected]);

  if (scans.length === 0) {
    return (
      <div className="dash-view">
        <header className="view-header">
          <h1>Reports</h1>
        </header>
        <EmptyState icon="⇩" title="No scans to report">
          Inspect a website first - every scan can be exported as JSON, Markdown or a print-ready
          HTML report.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Reports</h1>
      </header>

      <div className="card">
        <div className="card-title">Select a scan</div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ width: '100%', maxWidth: 480 }}
        >
          {scans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              {scan.target.hostname} - {formatDateTime(scan.timestamp)} - {scan.scores.overall}
            </option>
          ))}
        </select>

        {selected && (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => downloadScanReport(selected, 'json')}>
                ⇩ JSON
              </button>
              <button className="btn" onClick={() => downloadScanReport(selected, 'md')}>
                ⇩ Markdown
              </button>
              <button className="btn" onClick={() => downloadScanReport(selected, 'html')}>
                ⇩ HTML report
              </button>
              <button className="btn btn-primary" onClick={() => openHtmlReport(selected)}>
                Preview HTML report
              </button>
            </div>
            <p className="xs faint" style={{ marginTop: 8 }}>
              JSON for machines · Markdown for GitHub issues · HTML is self-contained and
              print-to-PDF friendly (Ctrl+P in the preview tab).
            </p>
          </>
        )}
      </div>

      {markdown && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Markdown preview</div>
            <CopyButton text={markdown} />
          </div>
          <pre
            className="mono small"
            style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto' }}
          >
            {markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
