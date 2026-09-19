import { describe, expect, it } from 'vitest';
import cookiesFixture from '../fixtures/cookies/cookies-insecure.json';
import { findingOf, failingRuleIds, makeEvidence, runRules } from '../helpers';

describe('cookie rules', () => {
  it('cookies-insecure fixture triggers attribute findings', () => {
    const result = runRules(makeEvidence(cookiesFixture));
    const failures = failingRuleIds(result);
    expect(failures).toContain('KLYNTO-CKI-001'); // Secure missing
    expect(failures).toContain('KLYNTO-CKI-002'); // HttpOnly missing on session-like
    expect(failures).toContain('KLYNTO-CKI-004'); // SameSite missing
    expect(failures).toContain('KLYNTO-CKI-005'); // broad Domain
    expect(failures).toContain('KLYNTO-CKI-006'); // __Host- prefix violation
    expect(failures).toContain('KLYNTO-CKI-008'); // long-lived session-like
  });

  it('well-formed cookies pass all checks', () => {
    const result = runRules(
      makeEvidence({
        setCookie: ['sessionId=abc; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600'],
      }),
    );
    const cookieFailures = failingRuleIds(result).filter((id) => id.startsWith('KLYNTO-CKI'));
    expect(cookieFailures).toEqual([]);
  });

  it('SameSite=None without Secure is a warning', () => {
    const result = runRules(makeEvidence({ setCookie: ['tracker=1; SameSite=None'] }));
    expect(findingOf(result, 'KLYNTO-CKI-003')?.severity).toBe('warning');
  });

  it('__Secure- prefix without Secure is flagged', () => {
    const result = runRules(makeEvidence({ setCookie: ['__Secure-token=t; SameSite=Lax'] }));
    expect(findingOf(result, 'KLYNTO-CKI-007')?.status).toBe('fail');
  });

  it('cookies over plain HTTP are flagged as warning', () => {
    const result = runRules(
      makeEvidence({
        url: 'http://example.com/',
        setCookie: ['sid=1; SameSite=Lax'],
      }),
    );
    expect(findingOf(result, 'KLYNTO-CKI-009')?.severity).toBe('warning');
  });

  it('skips entirely when no cookies are observed', () => {
    const result = runRules(makeEvidence({ headers: [] }));
    const cookieFindings = result.findings.filter((f) => f.moduleId === 'cookies');
    expect(cookieFindings).toHaveLength(0);
  });

  it('respects the analyzeCookies setting', () => {
    const result = runRules(makeEvidence(cookiesFixture), { analyzeCookies: false });
    const cookieFindings = result.findings.filter((f) => f.moduleId === 'cookies');
    expect(cookieFindings).toHaveLength(0);
  });
});
