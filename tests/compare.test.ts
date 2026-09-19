import { describe, expect, it } from 'vitest';
import { detectRegressions, diffScans } from '../src/core/compare/diff';
import type { Finding, ScanResult } from '../src/core/models';
import { buildTarget } from '../src/core/parser/urls';

function finding(ruleId: string, severity: Finding['severity']): Finding {
  return {
    ruleId,
    moduleId: 'headers',
    severity,
    status: severity === 'pass' ? 'pass' : 'fail',
    title: ruleId,
  };
}

let counter = 0;
function scan(findings: Finding[]): ScanResult {
  counter += 1;
  return {
    id: `scan-${counter}`,
    target: buildTarget('https://example.com/')!,
    timestamp: 1_700_000_000_000 + counter,
    source: 'active',
    durationMs: 1,
    transport: {
      scheme: 'https',
      isLocal: false,
      hsts: null,
      redirectCount: 0,
      httpsUpgradeInChain: false,
      httpsDowngradeInChain: false,
      mixedContentCount: 0,
    },
    setCookie: [],
    findings,
    scores: {
      overall: 100,
      grade: 'good',
      counts: { pass: 0, info: 0, review: 0, warning: 0, high: 0, na: 0 },
      modules: {} as ScanResult['scores']['modules'],
    },
  };
}

describe('detectRegressions', () => {
  it('flags pass → problem-severity transitions', () => {
    const previous = scan([finding('KLYNTO-HDR-010', 'pass'), finding('KLYNTO-HDR-012', 'pass')]);
    const current = scan([finding('KLYNTO-HDR-010', 'review'), finding('KLYNTO-HDR-012', 'pass')]);
    const regressions = detectRegressions(previous, current);
    expect(regressions).toHaveLength(1);
    expect(regressions[0].ruleId).toBe('KLYNTO-HDR-010');
    expect(regressions[0].currentSeverity).toBe('review');
  });

  it('does not flag info-level transitions or new findings', () => {
    const previous = scan([finding('KLYNTO-HDR-012', 'pass')]);
    const current = scan([
      finding('KLYNTO-HDR-010', 'review'), // new finding, no previous pass
      finding('KLYNTO-HDR-012', 'info'), // downgrade, not a regression
    ]);
    expect(detectRegressions(previous, current)).toHaveLength(0);
  });
});

describe('diffScans', () => {
  it('classifies regressions and improvements', () => {
    const a = scan([
      finding('KLYNTO-HDR-010', 'pass'),
      finding('KLYNTO-HDR-012', 'review'),
      finding('KLYNTO-HDR-013', 'warning'),
    ]);
    const b = scan([
      finding('KLYNTO-HDR-010', 'warning'),
      finding('KLYNTO-HDR-012', 'pass'),
      finding('KLYNTO-HDR-013', 'warning'),
    ]);
    const diffs = diffScans(a, b);
    const byId = new Map(diffs.map((d) => [d.ruleId, d]));
    expect(byId.get('KLYNTO-HDR-010')?.kind).toBe('regression');
    expect(byId.get('KLYNTO-HDR-012')?.kind).toBe('improvement');
    expect(byId.get('KLYNTO-HDR-013')?.kind).toBe('same');
  });
});
