import type { Finding, Regression, ScanResult, Severity } from '../models';
import { isProblemSeverity } from '../models';

function statusByRule(scan: ScanResult): Map<string, Finding> {
  const map = new Map<string, Finding>();
  for (const finding of scan.findings) {
    map.set(finding.ruleId, finding);
  }
  return map;
}

export interface FindingDiff {
  ruleId: string;
  module: string;
  previous?: Severity;
  current?: Severity;
  /** 'regression' got worse, 'improvement' got better, 'changed' informational shift. */
  kind: 'regression' | 'improvement' | 'changed' | 'same';
}

const SEVERITY_RANK: Record<Severity, number> = {
  pass: 0,
  na: 0,
  info: 1,
  review: 2,
  warning: 3,
  high: 4,
};

/** Detect regressions: rules that passed before and now fail with a problem severity. */
export function detectRegressions(previous: ScanResult, current: ScanResult): Regression[] {
  const prev = statusByRule(previous);
  const regressions: Regression[] = [];
  for (const finding of current.findings) {
    const before = prev.get(finding.ruleId);
    if (!before) continue;
    if (
      before.status === 'pass' &&
      finding.status === 'fail' &&
      isProblemSeverity(finding.severity)
    ) {
      regressions.push({
        ruleId: finding.ruleId,
        title: finding.title,
        currentSeverity: finding.severity,
        detectedAt: current.timestamp,
        previousScanId: previous.id,
        previousTimestamp: previous.timestamp,
      });
    }
  }
  return regressions;
}

/** Full side-by-side diff used by the Compare view. */
export function diffScans(a: ScanResult, b: ScanResult): FindingDiff[] {
  const mapA = statusByRule(a);
  const mapB = statusByRule(b);
  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const diffs: FindingDiff[] = [];
  for (const ruleId of ids) {
    const fa = mapA.get(ruleId);
    const fb = mapB.get(ruleId);
    if (!fa && !fb) continue;
    const prev = fa?.severity;
    const current = fb?.severity;
    let kind: FindingDiff['kind'] = 'same';
    if (prev !== current) {
      const rankPrev = prev ? SEVERITY_RANK[prev] : -1;
      const rankCurrent = current ? SEVERITY_RANK[current] : -1;
      if (rankCurrent > rankPrev) kind = 'regression';
      else if (rankCurrent < rankPrev) kind = 'improvement';
      else kind = 'changed';
    }
    diffs.push({
      ruleId,
      module: (fa ?? fb)!.moduleId,
      previous: prev,
      current,
      kind,
    });
  }
  return diffs;
}
