import type { ScanResult } from '@core/models';
import { getRule } from '@core/rules/registry';

/** GitHub-friendly Markdown export. */
export function toMarkdownReport(scan: ScanResult): string {
  const lines: string[] = [];
  const problems = scan.findings.filter((f) => f.status === 'fail');

  lines.push('# Klynto Security Report');
  lines.push('');
  lines.push(`**Target:** ${scan.target.url}`);
  lines.push(
    `**Scanned:** ${new Date(scan.timestamp).toISOString()} (Klynto v${scan.extensionVersion ?? '?'})`,
  );
  lines.push(
    `**Posture score:** ${scan.scores.overall >= 0 ? `${scan.scores.overall}/100 (${scan.scores.grade})` : 'n/a'}`,
  );
  lines.push('');

  const summary = scan.findings.filter((f) => f.status === 'pass').length;
  lines.push(`**Summary:** ${problems.length} finding(s) · ${summary} control(s) passing`);
  lines.push('');

  lines.push('## Findings');
  lines.push('');
  if (problems.length === 0) {
    lines.push('No issues found by the enabled rules.');
    lines.push('');
  }
  for (const finding of problems) {
    const rule = getRule(finding.ruleId);
    lines.push(`### ${finding.title}`);
    lines.push('');
    lines.push(`- **ID:** \`${finding.ruleId}\``);
    lines.push(`- **Module:** ${finding.moduleId}`);
    lines.push(`- **Severity:** ${finding.severity}`);
    lines.push('');
    if (rule) {
      lines.push(`**What this means.** ${rule.explanation}`);
      lines.push('');
      lines.push(`**Why it matters.** ${rule.impact}`);
      lines.push('');
      lines.push(`**Recommendation.** ${rule.recommendation}`);
      lines.push('');
    }
    if (finding.detail) {
      lines.push(`> ${finding.detail.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
    if (rule && rule.references.length > 0) {
      lines.push(`References: ${rule.references.map((r) => `[${r.label}](${r.url})`).join(' · ')}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    '_Generated locally by Klynto - the web security inspector that runs entirely in your browser._',
  );
  return lines.join('\n');
}
