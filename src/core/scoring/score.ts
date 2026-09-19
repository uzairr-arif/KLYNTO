import type { Finding, ModuleId, ScoreGrade, ScoreSummary, Severity } from '../models';
import { MODULE_IDS } from '../models';

/** Score deduction per non-pass finding severity. */
const DEDUCTIONS: Partial<Record<Severity, number>> = {
  high: 35,
  warning: 18,
  review: 10,
  info: 2,
};

/** Relative weight of each module in the overall score. */
export const MODULE_WEIGHTS: Record<ModuleId, number> = {
  transport: 0.15,
  headers: 0.2,
  csp: 0.18,
  cookies: 0.15,
  cors: 0.12,
  'cross-origin': 0.08,
  disclosure: 0.07,
  redirects: 0.05,
};

function emptyCounts(): Record<Severity, number> {
  return { pass: 0, info: 0, review: 0, warning: 0, high: 0, na: 0 };
}

function gradeFor(score: number): ScoreGrade {
  if (score < 0) return 'unknown';
  if (score >= 80) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Compute module and overall posture scores from findings.
 *
 * The score is transparent: each non-pass finding deducts a fixed amount by
 * severity, module scores are independent, and the overall score is a weighted
 * mean of the applicable modules only. Findings matter more than the number - 
 * the UI treats the score as secondary context.
 */
export function scoreFindings(findings: Finding[], applicableModules: Set<ModuleId>): ScoreSummary {
  const modules = {} as Record<
    ModuleId,
    { score: number; applicable: boolean; counts: Record<Severity, number> }
  >;
  const counts = emptyCounts();

  for (const moduleId of MODULE_IDS) {
    modules[moduleId] = {
      score: 100,
      applicable: applicableModules.has(moduleId),
      counts: emptyCounts(),
    };
  }

  for (const finding of findings) {
    counts[finding.severity] += 1;
    const module = modules[finding.moduleId];
    if (!module) continue;
    module.counts[finding.severity] += 1;
    const deduction = DEDUCTIONS[finding.severity] ?? 0;
    module.score = Math.max(0, module.score - deduction);
  }

  const applicable = MODULE_IDS.filter((id) => modules[id].applicable);
  if (applicable.length === 0) {
    return {
      overall: -1,
      grade: 'unknown',
      counts,
      modules,
    };
  }

  const totalWeight = applicable.reduce((sum, id) => sum + MODULE_WEIGHTS[id], 0);
  const weighted = applicable.reduce((sum, id) => sum + modules[id].score * MODULE_WEIGHTS[id], 0);
  const overall = Math.round(weighted / Math.max(totalWeight, Number.EPSILON));

  return {
    overall,
    grade: gradeFor(overall),
    counts,
    modules,
  };
}
