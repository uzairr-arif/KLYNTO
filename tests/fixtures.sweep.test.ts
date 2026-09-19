import { describe, expect, it } from 'vitest';
import secureFixture from './fixtures/secure/secure-response.json';
import missingFixture from './fixtures/insecure/missing-security-headers.json';
import weakCspFixture from './fixtures/csp/weak-csp.json';
import corsFixture from './fixtures/cors/cors-wildcard.json';
import cookiesFixture from './fixtures/cookies/cookies-insecure.json';
import httpFixture from './fixtures/insecure/http-site.json';
import { makeEvidence, runRules } from './helpers';
import type { HttpHeader } from '../src/core/models';

const FIXTURES: Array<[string, { url: string; headers: HttpHeader[]; setCookie?: string[] }]> = [
  ['secure/secure-response.json', secureFixture],
  ['insecure/missing-security-headers.json', missingFixture],
  ['csp/weak-csp.json', weakCspFixture],
  ['cors/cors-wildcard.json', corsFixture],
  ['cookies/cookies-insecure.json', cookiesFixture],
  ['insecure/http-site.json', httpFixture],
];

describe('fixture sweep', () => {
  for (const [name, fixture] of FIXTURES) {
    it(`analyzes ${name} without errors and produces well-formed findings`, () => {
      const result = runRules(makeEvidence(fixture));
      expect(result.id).toBeTruthy();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      for (const finding of result.findings) {
        expect(finding.ruleId).toMatch(/^KLYNTO-/);
        expect(finding.title.length).toBeGreaterThan(0);
        expect(['pass', 'fail']).toContain(finding.status);
      }
      // Findings must be unique per rule.
      const ids = result.findings.map((f) => f.ruleId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it('secure fixture has no failing rules at all', () => {
    const result = runRules(makeEvidence(secureFixture));
    const failures = result.findings.filter((f) => f.status === 'fail');
    expect(failures).toEqual([]);
    expect(result.scores.overall).toBe(100);
  });

  it('score ordering holds across fixture quality levels', () => {
    const secure = runRules(makeEvidence(secureFixture)).scores.overall;
    const missing = runRules(makeEvidence(missingFixture)).scores.overall;
    const http = runRules(makeEvidence(httpFixture)).scores.overall;
    expect(secure).toBeGreaterThan(missing);
    expect(missing).toBeGreaterThanOrEqual(http);
  });
});
