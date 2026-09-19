export type Severity = 'pass' | 'info' | 'review' | 'warning' | 'high' | 'na';

export const SEVERITY_ORDER: readonly Severity[] = [
  'high',
  'warning',
  'review',
  'info',
  'pass',
  'na',
] as const;

/** Severities that count as actionable problems (shown prominently). */
export const PROBLEM_SEVERITIES: readonly Severity[] = ['high', 'warning', 'review'] as const;

export function isProblemSeverity(severity: Severity): boolean {
  return PROBLEM_SEVERITIES.includes(severity);
}

export function worstSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER.indexOf(a) <= SEVERITY_ORDER.indexOf(b) ? a : b;
}
