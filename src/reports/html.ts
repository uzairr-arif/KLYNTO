import type { ScanResult } from '@core/models';
import { MODULE_META } from '@core/models';
import { getRule } from '@core/rules/registry';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Self-contained, print-to-PDF-friendly HTML report. */
export function toHtmlReport(scan: ScanResult): string {
  const problems = scan.findings.filter((f) => f.status === 'fail');
  const passes = scan.findings.filter((f) => f.status === 'pass');
  const gradeColor =
    scan.scores.grade === 'good' ? '#10b981' : scan.scores.grade === 'fair' ? '#f59e0b' : '#ef4444';

  const findingHtml = problems
    .map((finding) => {
      const rule = getRule(finding.ruleId);
      const refs = (rule?.references ?? [])
        .map((r) => `<a href="${esc(r.url)}">${esc(r.label)}</a>`)
        .join(' · ');
      return `
      <section class="finding">
        <header>
          <span class="sev ${finding.severity}">${esc(finding.severity)}</span>
          <h3>${esc(finding.title)}</h3>
        </header>
        <p class="meta mono">${esc(finding.ruleId)} · ${esc(finding.moduleId)}</p>
        ${rule ? `<p><strong>What this means.</strong> ${esc(rule.explanation)}</p>` : ''}
        ${rule ? `<p><strong>Why it matters.</strong> ${esc(rule.impact)}</p>` : ''}
        ${rule ? `<p><strong>Recommended action.</strong> ${esc(rule.recommendation)}</p>` : ''}
        ${finding.detail ? `<p class="mono detail">${esc(finding.detail)}</p>` : ''}
        ${refs ? `<p class="refs">${refs}</p>` : ''}
      </section>`;
    })
    .join('\n');

  const passHtml = passes
    .map((p) => `<li><span class="mono">${esc(p.ruleId)}</span> - ${esc(p.title)}</li>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Klynto Report - ${esc(scan.target.hostname)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f5f6f8; color: #0f172a; }
  .page { max-width: 860px; margin: 0 auto; padding: 40px 32px; }
  header.report { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: 0.08em; }
  .brand .shield { width: 28px; height: 28px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #4b5563; font-size: 13px; }
  .scorecard { display: flex; gap: 16px; align-items: center; background: #fff; border: 1px solid #e3e7ee; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .score { font-size: 40px; font-weight: 700; color: ${gradeColor}; }
  .grade { font-size: 13px; color: #4b5563; text-transform: capitalize; }
  .counts { margin-left: auto; display: flex; gap: 12px; font-size: 13px; }
  .pill { padding: 3px 10px; border-radius: 999px; font-weight: 600; }
  .pill.high { background: #fee2e2; color: #dc2626; }
  .pill.warning { background: #fef3c7; color: #b45309; }
  .pill.review { background: #fef9c3; color: #a16207; }
  .pill.info { background: #dbeafe; color: #1d4ed8; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 28px 0 12px; }
  .finding { background: #fff; border: 1px solid #e3e7ee; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; }
  .finding header { display: flex; align-items: center; gap: 10px; }
  .finding h3 { font-size: 15px; margin: 0; }
  .sev { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
  .sev.high { background: #fee2e2; color: #dc2626; }
  .sev.warning { background: #fef3c7; color: #b45309; }
  .sev.review { background: #fef9c3; color: #a16207; }
  .sev.info { background: #dbeafe; color: #1d4ed8; }
  .meta { font-size: 12px; color: #9ca3af; margin: 4px 0 10px; }
  .finding p { font-size: 13.5px; line-height: 1.55; margin: 6px 0; }
  .detail { background: #f8fafc; border: 1px solid #e3e7ee; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; word-break: break-all; }
  .refs a { font-size: 12.5px; margin-right: 8px; }
  ul.passes { padding-left: 20px; }
  ul.passes li { font-size: 13.5px; margin: 4px 0; color: #334155; }
  footer { margin-top: 40px; color: #9ca3af; font-size: 12px; text-align: center; }
  @media print { body { background: #fff; } .page { padding: 0; } }
</style>
</head>
<body>
<div class="page">
  <header class="report">
    <div class="brand">
      <svg class="shield" viewBox="0 0 128 128"><path d="M64 6 L114 25 V62 C114 92 94 112 64 122 C34 112 14 92 14 62 V25 Z" fill="#2dd4bf"/><rect x="42" y="38" width="13" height="52" rx="2.5" fill="#062b26"/><path d="M60 64 L84 38 H99 L72 68 L99 90 H84 L60 66 Z" fill="#062b26"/></svg>
      KLYNTO
    </div>
    <div class="meta">Security Report</div>
  </header>

  <h1>${esc(scan.target.hostname)}</h1>
  <p class="meta">${esc(scan.target.url)}<br>Scanned ${new Date(scan.timestamp).toLocaleString()} · Klynto v${esc(scan.extensionVersion ?? '?')} · ${esc(scan.source)} scan</p>

  <div class="scorecard">
    <div>
      <div class="score">${scan.scores.overall >= 0 ? scan.scores.overall : '-'}</div>
      <div class="grade">${esc(scan.scores.grade)} posture</div>
    </div>
    <div class="counts">
      ${problems.filter((f) => f.severity === 'high').length ? `<span class="pill high">${problems.filter((f) => f.severity === 'high').length} high</span>` : ''}
      ${problems.filter((f) => f.severity === 'warning').length ? `<span class="pill warning">${problems.filter((f) => f.severity === 'warning').length} warning</span>` : ''}
      ${problems.filter((f) => f.severity === 'review').length ? `<span class="pill review">${problems.filter((f) => f.severity === 'review').length} review</span>` : ''}
      ${problems.filter((f) => f.severity === 'info').length ? `<span class="pill info">${problems.filter((f) => f.severity === 'info').length} info</span>` : ''}
    </div>
  </div>

  <h2>Modules</h2>
  <div class="scorecard" style="display:block">
    ${Object.entries(scan.scores.modules)
      .filter(([, m]) => m.applicable)
      .map(
        ([id, m]) =>
          `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13.5px">
             <span>${esc(MODULE_META[id as keyof typeof MODULE_META].label)}</span>
             <strong>${m.score}</strong>
           </div>`,
      )
      .join('')}
  </div>

  <h2>Findings (${problems.length})</h2>
  ${findingHtml || '<p class="meta">No issues found by the enabled rules.</p>'}

  <h2>Passing controls (${passes.length})</h2>
  <ul class="passes">${passHtml}</ul>

  <footer>
    Generated locally by Klynto - the web security inspector that runs entirely in your browser. No data left this machine.
  </footer>
</div>
</body>
</html>`;
}
