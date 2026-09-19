import type { ScanResult } from '@core/models';
import type { BatchRun } from '@core/storage/storage';
import { toJsonReport } from './json';
import { toMarkdownReport } from './markdown';
import { toHtmlReport } from './html';

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export function safeFileHost(scan: ScanResult): string {
  return scan.target.hostname.replace(/[^a-z0-9.-]/gi, '') || 'scan';
}

export function downloadScanReport(scan: ScanResult, format: 'json' | 'md' | 'html'): void {
  const host = safeFileHost(scan);
  const stamp = new Date(scan.timestamp).toISOString().slice(0, 10);
  switch (format) {
    case 'json':
      downloadFile(`klynto-${host}-${stamp}.json`, toJsonReport(scan), 'application/json');
      break;
    case 'md':
      downloadFile(`klynto-${host}-${stamp}.md`, toMarkdownReport(scan), 'text/markdown');
      break;
    case 'html':
      downloadFile(`klynto-${host}-${stamp}.html`, toHtmlReport(scan), 'text/html');
      break;
  }
}

export function openHtmlReport(scan: ScanResult): void {
  const blob = new Blob([toHtmlReport(scan)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Batch results as CSV. */
export function batchToCsv(run: BatchRun): string {
  const rows: string[] = ['url,score,grade,high,warning,review,info'];
  for (const scan of run.results) {
    const counts = scan.scores.counts;
    rows.push(
      [
        scan.target.url,
        scan.scores.overall,
        scan.scores.grade,
        counts.high,
        counts.warning,
        counts.review,
        counts.info,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
  }
  return rows.join('\n');
}
