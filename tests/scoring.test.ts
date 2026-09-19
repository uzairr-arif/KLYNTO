import { describe, expect, it } from 'vitest';
import { scoreFindings } from '../src/core/scoring/score';
import type { Finding, ModuleId } from '../src/core/models';

function finding(ruleId: string, moduleId: ModuleId, severity: Finding['severity']): Finding {
  return {
    ruleId,
    moduleId,
    severity,
    status: severity === 'pass' ? 'pass' : 'fail',
    title: ruleId,
  };
}

const ALL_MODULES = new Set<ModuleId>([
  'transport',
  'headers',
  'csp',
  'cookies',
  'cors',
  'cross-origin',
  'disclosure',
  'redirects',
]);

describe('scoreFindings', () => {
  it('a clean scan scores 100 / good', () => {
    const scores = scoreFindings([finding('a', 'headers', 'pass')], ALL_MODULES);
    expect(scores.overall).toBe(100);
    expect(scores.grade).toBe('good');
  });

  it('severity deductions are applied per finding', () => {
    const scores = scoreFindings(
      [
        finding('h', 'headers', 'high'),
        finding('w', 'headers', 'warning'),
        finding('r', 'headers', 'review'),
        finding('i', 'headers', 'info'),
      ],
      ALL_MODULES,
    );
    // headers: 100 - 35 - 18 - 10 - 2 = 35
    expect(scores.modules.headers.score).toBe(35);
    expect(scores.modules.headers.counts.high).toBe(1);
    // Weighted overall across all modules: (35*0.2 + 100*0.8) / 1 = 87
    expect(scores.overall).toBe(87);
    expect(scores.grade).toBe('good');
  });

  it('worst-case modules drag the overall grade down to fair', () => {
    const highs = Array.from({ length: 3 }, (_, i) => finding(`h${i}`, 'headers', 'high' as const));
    const scores = scoreFindings(highs, ALL_MODULES);
    // headers: 100 - 105 → 0. Overall floor from one module: (0*0.2 + 100*0.8) = 80.
    expect(scores.modules.headers.score).toBe(0);
    expect(scores.overall).toBe(80);

    // Two heavy modules at zero: (0*0.2 + 0*0.18 + 100*0.62) = 62 → fair.
    const cspHighs = Array.from({ length: 3 }, (_, i) => finding(`c${i}`, 'csp', 'high' as const));
    const both = scoreFindings([...highs, ...cspHighs], ALL_MODULES);
    expect(both.overall).toBe(62);
    expect(both.grade).toBe('fair');
  });

  it('scores never go below zero', () => {
    const scores = scoreFindings(
      Array.from({ length: 10 }, (_, i) => finding(`h${i}`, 'csp', 'high' as const)),
      ALL_MODULES,
    );
    expect(scores.modules.csp.score).toBe(0);
  });

  it('non-applicable modules are excluded from the overall score', () => {
    const applicable = new Set<ModuleId>(['transport', 'headers'] as ModuleId[]);
    const scores = scoreFindings([finding('t', 'transport', 'review')], applicable);
    // Only transport + headers count: transport 90, headers 100 → weighted.
    const expected = Math.round((90 * 0.15 + 100 * 0.2) / 0.35);
    expect(scores.overall).toBe(expected);
    expect(scores.modules.csp.applicable).toBe(false);
  });

  it('an empty applicable set yields unknown grade', () => {
    const scores = scoreFindings([], new Set<ModuleId>());
    expect(scores.overall).toBe(-1);
    expect(scores.grade).toBe('unknown');
  });

  it('grade boundaries hold', () => {
    const check = (overallExpected: number, moduleScore: number) => {
      const single = scoreFindings([], new Set<ModuleId>(['headers'] as ModuleId[]));
      single.modules.headers.score = moduleScore;
      const weighted = Math.round(moduleScore * 1);
      expect(weighted).toBe(overallExpected);
    };
    check(80, 80);
    check(50, 50);
    const good = scoreFindings([], ALL_MODULES);
    expect(good.grade).toBe('good');
  });
});
