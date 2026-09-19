import { describe, expect, it } from 'vitest';
import secureFixture from '../fixtures/secure/secure-response.json';
import missingFixture from '../fixtures/insecure/missing-security-headers.json';
import httpFixture from '../fixtures/insecure/http-site.json';
import { findingOf, failingRuleIds, makeEvidence, runRules } from '../helpers';
import { ALL_RULES } from '../../src/core/rules/registry';

describe('headers rules', () => {
  it('secure fixture passes every header check', () => {
    const result = runRules(makeEvidence(secureFixture));
    const headerFailures = failingRuleIds(result).filter((id) => id.startsWith('KLYNTO-HDR'));
    expect(headerFailures).toEqual([]);
  });

  it('missing headers are each detected on the insecure fixture', () => {
    const result = runRules(makeEvidence(missingFixture));
    const failures = failingRuleIds(result);
    expect(failures).toContain('KLYNTO-HDR-001'); // HSTS missing
    expect(failures).toContain('KLYNTO-HDR-010'); // CSP missing
    expect(failures).toContain('KLYNTO-HDR-012'); // XCTO missing
    expect(failures).toContain('KLYNTO-HDR-013'); // framing
    expect(failures).toContain('KLYNTO-HDR-015'); // referrer
    expect(failures).toContain('KLYNTO-HDR-016'); // permissions-policy
  });

  it('CSP missing severity is review, not fake-HIGH', () => {
    const result = runRules(makeEvidence(missingFixture));
    expect(findingOf(result, 'KLYNTO-HDR-010')?.severity).toBe('review');
  });

  it('HSTS max-age thresholds escalate severity', () => {
    const oneDay = runRules(
      makeEvidence({ headers: [['Strict-Transport-Security', 'max-age=86400']] }),
    );
    expect(findingOf(oneDay, 'KLYNTO-HDR-002')?.severity).toBe('warning');

    const oneMonth = runRules(
      makeEvidence({ headers: [['Strict-Transport-Security', 'max-age=2592000']] }),
    );
    expect(findingOf(oneMonth, 'KLYNTO-HDR-002')?.severity).toBe('review');

    const oneYear = runRules(
      makeEvidence({
        headers: [['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload']],
      }),
    );
    expect(findingOf(oneYear, 'KLYNTO-HDR-002')?.status).toBe('pass');
    expect(findingOf(oneYear, 'KLYNTO-HDR-003')?.status).toBe('pass');
    expect(findingOf(oneYear, 'KLYNTO-HDR-004')?.status).toBe('pass');
  });

  it('HSTS over HTTP is informational', () => {
    const result = runRules(
      makeEvidence({
        url: 'http://example.com/',
        headers: [['Strict-Transport-Security', 'max-age=31536000']],
      }),
    );
    expect(findingOf(result, 'KLYNTO-HDR-005')?.severity).toBe('info');
  });

  it('Report-Only CSP is reported distinctly', () => {
    const result = runRules(
      makeEvidence({
        headers: [['Content-Security-Policy-Report-Only', "default-src 'self'"]],
      }),
    );
    const finding = findingOf(result, 'KLYNTO-HDR-010');
    expect(finding?.status).toBe('fail');
    expect(finding?.title).toContain('Report-Only');
  });

  it('invalid X-Frame-Options value is flagged', () => {
    const result = runRules(
      makeEvidence({ headers: [['X-Frame-Options', 'ALLOW-FROM https://other.example']] }),
    );
    expect(findingOf(result, 'KLYNTO-HDR-014')?.status).toBe('fail');
    expect(findingOf(result, 'KLYNTO-HDR-013')?.status).toBe('pass'); // present, just deprecated value
  });

  it('unsafe-url Referrer-Policy escalates to warning', () => {
    const result = runRules(makeEvidence({ headers: [['Referrer-Policy', 'unsafe-url']] }));
    expect(findingOf(result, 'KLYNTO-HDR-015')?.severity).toBe('warning');
  });

  it('broad Permissions-Policy grants are flagged', () => {
    const result = runRules(
      makeEvidence({ headers: [['Permissions-Policy', 'camera=*, geolocation=(self)']] }),
    );
    const finding = findingOf(result, 'KLYNTO-HDR-017');
    expect(finding?.status).toBe('fail');
    expect(finding?.detail).toContain('camera');
  });

  it('obsolete headers are informational, never missing-header failures', () => {
    const withObsolete = runRules(
      makeEvidence({
        headers: [
          ['X-XSS-Protection', '1; mode=block'],
          ['Expect-CT', 'max-age=86400, enforce'],
          ['X-UA-Compatible', 'IE=edge'],
        ],
      }),
    );
    expect(findingOf(withObsolete, 'KLYNTO-HDR-018')?.severity).toBe('info');
    expect(findingOf(withObsolete, 'KLYNTO-HDR-019')?.severity).toBe('info');
    expect(findingOf(withObsolete, 'KLYNTO-HDR-020')?.severity).toBe('info');

    const withoutObsolete = runRules(makeEvidence({ headers: [] }));
    expect(findingOf(withoutObsolete, 'KLYNTO-HDR-018')?.status).toBe('pass');
  });

  it('header rules are not applicable on http for https-only checks', () => {
    const result = runRules(makeEvidence(httpFixture));
    // HSTS-missing does not apply to an http page (TRN-001 covers plain HTTP).
    expect(findingOf(result, 'KLYNTO-HDR-001')).toBeUndefined();
  });
});

describe('rule registry integrity', () => {
  it('has unique ids with the expected prefix', () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^KLYNTO-[A-Z]{3}-\d{3}$/);
  });

  it('every rule carries explanation, recommendation and references', () => {
    for (const rule of ALL_RULES) {
      expect(rule.explanation.length).toBeGreaterThan(20);
      expect(rule.impact.length).toBeGreaterThan(10);
      expect(rule.recommendation.length).toBeGreaterThan(10);
      expect(rule.references.length).toBeGreaterThan(0);
      expect(rule.passTitle.length).toBeGreaterThan(0);
    }
  });
});
