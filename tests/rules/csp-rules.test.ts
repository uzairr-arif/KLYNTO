import { describe, expect, it } from 'vitest';
import weakCspFixture from '../fixtures/csp/weak-csp.json';
import { findingOf, failingRuleIds, makeEvidence, runRules } from '../helpers';

const BASE: Array<[string, string]> = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
];

function withCsp(policy: string) {
  return makeEvidence({ headers: [...BASE, ['Content-Security-Policy', policy]] });
}

describe('csp rules', () => {
  it('weak-csp fixture triggers the expected CSP findings', () => {
    const result = runRules(makeEvidence(weakCspFixture));
    const failures = failingRuleIds(result);
    expect(failures).toContain('KLYNTO-CSP-001'); // unsafe-inline
    expect(failures).toContain('KLYNTO-CSP-002'); // unsafe-eval
    expect(failures).not.toContain('KLYNTO-CSP-003'); // no wildcard in this fixture
    expect(failures).toContain('KLYNTO-CSP-004'); // data: in script-src
    expect(failures).toContain('KLYNTO-CSP-005'); // object-src 'self'
  });

  it('unsafe-inline downgrades to info when nonces/hashes are present', () => {
    const result = runRules(withCsp("script-src 'self' 'unsafe-inline' 'nonce-abc123'"));
    const finding = findingOf(result, 'KLYNTO-CSP-001');
    expect(finding?.status).toBe('fail');
    expect(finding?.severity).toBe('info');
    expect(finding?.title).toContain('nonces/hashes');
  });

  it('wildcards and none-mixing are detected', () => {
    const result = runRules(withCsp("script-src *; object-src 'none' 'self'"));
    expect(findingOf(result, 'KLYNTO-CSP-003')?.severity).toBe('warning');
    expect(findingOf(result, 'KLYNTO-CSP-011')?.severity).toBe('warning');
  });

  it('a policy without script directives does not restrict scripts', () => {
    const result = runRules(withCsp("img-src 'self'"));
    const finding = findingOf(result, 'KLYNTO-CSP-012');
    expect(finding?.status).toBe('fail');
    expect(finding?.severity).toBe('review');
  });

  it('base-uri and form-action suggestions are informational', () => {
    const result = runRules(withCsp("default-src 'self'; script-src 'self'; object-src 'none'"));
    expect(findingOf(result, 'KLYNTO-CSP-006')?.severity).toBe('info');
    expect(findingOf(result, 'KLYNTO-CSP-007')?.severity).toBe('info');
  });

  it('a strict policy passes all CSP checks', () => {
    const strict = runRules(
      withCsp(
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; report-uri https://example.com/csp",
      ),
    );
    const cspFailures = failingRuleIds(strict).filter((id) => id.startsWith('KLYNTO-CSP'));
    expect(cspFailures).toEqual([]);
  });

  it('csp rules skip when no CSP header exists (HDR-010 owns that case)', () => {
    const result = runRules(makeEvidence({ headers: [] }));
    const cspFindings = result.findings.filter((f) => f.moduleId === 'csp');
    expect(cspFindings).toHaveLength(0);
  });

  it('typoed directives are surfaced', () => {
    const result = runRules(withCsp("default-src 'self'; script_Scr 'self'"));
    const finding = findingOf(result, 'KLYNTO-CSP-013');
    expect(finding?.status).toBe('fail');
    expect(finding?.evidence?.items).toContain('script_scr');
  });
});
