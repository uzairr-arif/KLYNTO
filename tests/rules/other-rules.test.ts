import { describe, expect, it } from 'vitest';
import { findingOf, failingRuleIds, makeEvidence, runRules } from '../helpers';

describe('cross-origin rules', () => {
  it('missing COOP/COEP is reported', () => {
    const result = runRules(makeEvidence({ headers: [] }));
    expect(findingOf(result, 'KLYNTO-XOR-001')?.severity).toBe('review');
    expect(findingOf(result, 'KLYNTO-XOR-003')?.severity).toBe('info');
    expect(findingOf(result, 'KLYNTO-XOR-004')?.status).toBe('fail');
  });

  it('unsafe-none COOP is informational', () => {
    const result = runRules(
      makeEvidence({ headers: [['Cross-Origin-Opener-Policy', 'unsafe-none']] }),
    );
    expect(findingOf(result, 'KLYNTO-XOR-002')?.severity).toBe('info');
  });

  it('full isolation passes', () => {
    const result = runRules(
      makeEvidence({
        headers: [
          ['Cross-Origin-Opener-Policy', 'same-origin'],
          ['Cross-Origin-Embedder-Policy', 'credentialless'],
        ],
      }),
    );
    const xorFailures = failingRuleIds(result).filter((id) => id.startsWith('KLYNTO-XOR'));
    expect(xorFailures).toEqual([]);
  });
});

describe('disclosure rules', () => {
  it('versioned Server header is info with evidence', () => {
    const result = runRules(makeEvidence({ headers: [['Server', 'nginx/1.24.0']] }));
    const finding = findingOf(result, 'KLYNTO-DSC-001');
    expect(finding?.severity).toBe('info');
    expect(finding?.evidence?.headers?.[0].value).toBe('nginx/1.24.0');
  });

  it('versionless Server header passes', () => {
    const result = runRules(makeEvidence({ headers: [['Server', 'nginx']] }));
    expect(findingOf(result, 'KLYNTO-DSC-001')?.status).toBe('pass');
  });

  it('X-Powered-By and ASP.NET headers are detected', () => {
    const result = runRules(
      makeEvidence({
        headers: [
          ['X-Powered-By', 'Express'],
          ['X-AspNet-Version', '4.0.30319'],
          ['Via', '1.1 proxy'],
        ],
      }),
    );
    expect(findingOf(result, 'KLYNTO-DSC-002')?.status).toBe('fail');
    expect(findingOf(result, 'KLYNTO-DSC-003')?.status).toBe('fail');
    expect(findingOf(result, 'KLYNTO-DSC-004')?.status).toBe('fail');
  });

  it('generator headers are detected', () => {
    const result = runRules(makeEvidence({ headers: [['X-Generator', 'Drupal 10']] }));
    expect(findingOf(result, 'KLYNTO-DSC-005')?.status).toBe('fail');
  });
});
