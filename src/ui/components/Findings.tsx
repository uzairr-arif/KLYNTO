import type { Finding, ModuleId, ScanResult } from '@core/models';
import { MODULE_META, MODULE_IDS, SEVERITY_ORDER, isProblemSeverity } from '@core/models';
import { FindingRow } from './Finding';
import { SEVERITY_ICONS } from './SeverityBadge';

export interface CategoryTileData {
  moduleId: ModuleId;
  worst: string | null;
  problemCount: number;
  applicable: boolean;
}

export function categoryTiles(scan: ScanResult): CategoryTileData[] {
  return MODULE_IDS.map((moduleId) => {
    const module = scan.scores.modules[moduleId];
    const moduleFindings = scan.findings.filter(
      (f) => f.moduleId === moduleId && isProblemSeverity(f.severity),
    );
    const worst =
      SEVERITY_ORDER.find((severity) => moduleFindings.some((f) => f.severity === severity)) ??
      null;
    return {
      moduleId,
      worst,
      problemCount: moduleFindings.length,
      applicable: module.applicable,
    };
  });
}

export function CategoryTile({ tile, onClick }: { tile: CategoryTileData; onClick?: () => void }) {
  const meta = MODULE_META[tile.moduleId];
  const status = !tile.applicable
    ? { icon: '-', cls: 'sev-na', text: 'N/A' }
    : tile.worst
      ? {
          icon: SEVERITY_ICONS[tile.worst as keyof typeof SEVERITY_ICONS],
          cls: `sev-${tile.worst}`,
          text: `${tile.problemCount} finding${tile.problemCount === 1 ? '' : 's'}`,
        }
      : { icon: '✓', cls: 'sev-pass', text: 'OK' };

  return (
    <button
      className={`tile ${status.cls}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span className="tile-label">
        {meta.shortLabel}
        <span className={`sev-${tile.worst ?? (tile.applicable ? 'pass' : 'na')}`}>
          {status.icon}
        </span>
      </span>
      <span className="tile-status">{status.text}</span>
    </button>
  );
}

/** Full findings list grouped by module. */
export function FindingsList({
  scan,
  showPasses = true,
  defaultOpenFirst = false,
}: {
  scan: ScanResult;
  showPasses?: boolean;
  defaultOpenFirst?: boolean;
}) {
  const modules = MODULE_IDS.filter((id) => scan.scores.modules[id].applicable);
  let opened = false;

  return (
    <div>
      {modules.map((moduleId) => {
        const findings = scan.findings.filter(
          (f) => f.moduleId === moduleId && (showPasses || f.status !== 'pass'),
        );
        if (findings.length === 0) return null;
        const problems = findings.filter((f) => isProblemSeverity(f.severity));
        if (!showPasses && problems.length === 0) return null;
        return (
          <section key={moduleId} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="uppercase-label" style={{ marginBottom: 6 }}>
              {MODULE_META[moduleId].label}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {findings.map((finding) => {
                const firstProblem = problems[0];
                const shouldOpen =
                  defaultOpenFirst &&
                  !opened &&
                  firstProblem &&
                  finding.ruleId === firstProblem.ruleId;
                if (shouldOpen) opened = true;
                return (
                  <FindingRow key={finding.ruleId} finding={finding} defaultOpen={!!shouldOpen} />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function FindingCountSummary({ findings }: { findings: Finding[] }) {
  const high = findings.filter((f) => f.severity === 'high').length;
  const warning = findings.filter((f) => f.severity === 'warning').length;
  const review = findings.filter((f) => f.severity === 'review').length;
  const info = findings.filter((f) => f.severity === 'info').length;
  const pass = findings.filter((f) => f.status === 'pass').length;
  const parts: string[] = [];
  if (high) parts.push(`${high} high`);
  if (warning) parts.push(`${warning} warning${warning === 1 ? '' : 's'}`);
  if (review) parts.push(`${review} review`);
  if (info) parts.push(`${info} info`);
  parts.push(`${pass} passing`);
  return <>{parts.join(' · ')}</>;
}
