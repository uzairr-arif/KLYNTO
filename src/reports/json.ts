import type { ScanResult } from '@core/models';
import { getRule } from '@core/rules/registry';

/** Machine-readable export (developers). */
export function toJsonReport(scan: ScanResult): string {
  return JSON.stringify(
    {
      kind: 'klynto-report',
      version: 1,
      target: scan.target,
      timestamp: new Date(scan.timestamp).toISOString(),
      source: scan.source,
      transport: scan.transport,
      score: {
        overall: scan.scores.overall,
        grade: scan.scores.grade,
        modules: Object.fromEntries(
          Object.entries(scan.scores.modules)
            .filter(([, m]) => m.applicable)
            .map(([id, m]) => [id, { score: m.score, counts: m.counts }]),
        ),
      },
      findings: scan.findings.map((finding) => {
        const rule = getRule(finding.ruleId);
        return {
          id: finding.ruleId,
          module: finding.moduleId,
          severity: finding.severity,
          status: finding.status,
          title: finding.title,
          explanation: rule?.explanation,
          impact: rule?.impact,
          recommendation: rule?.recommendation,
          evidence: finding.evidence,
          references: rule?.references,
        };
      }),
    },
    null,
    2,
  );
}
