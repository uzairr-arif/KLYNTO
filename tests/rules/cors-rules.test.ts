import { describe, expect, it } from 'vitest';
import corsFixture from '../fixtures/cors/cors-wildcard.json';
import { findingOf, failingRuleIds, makeEvidence, runRules } from '../helpers';

describe('cors rules', () => {
  it('wildcard + credentials on the document is a high finding', () => {
    const result = runRules(makeEvidence(corsFixture));
    expect(findingOf(result, 'KLYNTO-CRS-001')?.severity).toBe('high');
    expect(findingOf(result, 'KLYNTO-CRS-004')?.status).toBe('fail'); // wildcard info
  });

  it('credentials with a specific origin is review, not high', () => {
    const result = runRules(
      makeEvidence({
        headers: [
          ['Access-Control-Allow-Origin', 'https://app.example.com'],
          ['Access-Control-Allow-Credentials', 'true'],
        ],
      }),
    );
    expect(findingOf(result, 'KLYNTO-CRS-001')?.status).toBe('pass');
    expect(findingOf(result, 'KLYNTO-CRS-002')?.severity).toBe('review');
  });

  it('CORS findings from subresource summaries are picked up', () => {
    const result = runRules(
      makeEvidence({
        headers: [],
        requests: [
          {
            url: 'https://api.example.com/data',
            method: 'GET',
            status: 200,
            type: 'xmlhttprequest',
            cors: { allowOrigin: '*', credentials: true },
          },
        ],
      }),
    );
    expect(findingOf(result, 'KLYNTO-CRS-001')?.status).toBe('fail');
  });

  it('exposing sensitive headers is review', () => {
    const result = runRules(
      makeEvidence({
        headers: [['Access-Control-Expose-Headers', 'X-Request-Id, Set-Cookie']],
      }),
    );
    const finding = findingOf(result, 'KLYNTO-CRS-003');
    expect(finding?.status).toBe('fail');
    expect(finding?.evidence?.items?.[0]).toContain('set-cookie');
  });

  it('respects the analyzeCors setting', () => {
    const result = runRules(makeEvidence(corsFixture), { analyzeCors: false });
    const corsFindings = result.findings.filter((f) => f.moduleId === 'cors');
    expect(corsFindings).toHaveLength(0);
  });

  it('clean CORS responses pass', () => {
    const result = runRules(
      makeEvidence({
        headers: [
          ['Access-Control-Allow-Origin', 'https://app.example.com'],
          ['Access-Control-Allow-Credentials', 'false'],
        ],
      }),
    );
    const failures = failingRuleIds(result).filter((id) => id.startsWith('KLYNTO-CRS'));
    expect(failures).toEqual([]);
  });
});
