import { SEVERITY_ORDER, type Severity } from '@core/models';

const LABELS: Record<Severity, string> = {
  high: 'High',
  warning: 'Warning',
  review: 'Review',
  info: 'Info',
  pass: 'Pass',
  na: 'N/A',
};

export const SEVERITY_ICONS: Record<Severity, string> = {
  high: '✕',
  warning: '⚠',
  review: '⚠',
  info: 'ℹ',
  pass: '✓',
  na: '-',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge sev-${severity}`}>
      <span className="dot" aria-hidden />
      {LABELS[severity]}
    </span>
  );
}

export function SeverityIcon({ severity }: { severity: Severity }) {
  return (
    <span className={`sev-${severity}`} style={{ fontWeight: 700 }}>
      {SEVERITY_ICONS[severity]}
    </span>
  );
}

export function severityLabel(severity: Severity): string {
  return LABELS[severity];
}

export function sortedBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}
