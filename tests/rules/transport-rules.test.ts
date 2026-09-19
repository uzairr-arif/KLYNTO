import { describe, expect, it } from 'vitest';
import httpFixture from '../fixtures/insecure/http-site.json';
import { findingOf, makeEvidence, runRules } from '../helpers';

describe('transport rules', () => {
  it('plain HTTP production page is HIGH', () => {
    const result = runRules(makeEvidence(httpFixture));
    expect(findingOf(result, 'KLYNTO-TRN-001')?.severity).toBe('high');
  });

  it('plain HTTP on localhost is informational with context', () => {
    const result = runRules(makeEvidence({ url: 'http://localhost:3000/', headers: [] }));
    const finding = findingOf(result, 'KLYNTO-TRN-001');
    expect(finding?.severity).toBe('info');
    expect(finding?.title).toContain('Development');
  });

  it('mixed content subresources are flagged with URLs', () => {
    const result = runRules(
      makeEvidence({
        insecureUrls: ['http://cdn.example.com/legacy.js'],
      }),
    );
    const finding = findingOf(result, 'KLYNTO-TRN-003');
    expect(finding?.severity).toBe('warning');
    expect(finding?.evidence?.items).toContain('http://cdn.example.com/legacy.js');
  });

  it('temporary HTTP→HTTPS redirect is informational', () => {
    const result = runRules(
      makeEvidence({
        url: 'https://example.com/final',
        redirectChain: [{ url: 'http://example.com/', status: 302 }],
      }),
    );
    expect(findingOf(result, 'KLYNTO-TRN-004')?.status).toBe('fail');
  });

  it('permanent HTTP→HTTPS redirect passes', () => {
    const result = runRules(
      makeEvidence({
        url: 'https://example.com/final',
        redirectChain: [{ url: 'http://example.com/', status: 301 }],
      }),
    );
    expect(findingOf(result, 'KLYNTO-TRN-004')?.status).toBe('pass');
  });

  it('HTTPS→HTTP downgrades are high', () => {
    const result = runRules(
      makeEvidence({
        url: 'http://example.com/end',
        redirectChain: [{ url: 'https://example.com/start', status: 301 }],
      }),
    );
    expect(findingOf(result, 'KLYNTO-TRN-002')?.severity).toBe('high');
  });

  it('HSTS suggestion fires when a site upgrades but sends no HSTS', () => {
    const result = runRules(
      makeEvidence({
        url: 'https://example.com/final',
        redirectChain: [{ url: 'http://example.com/', status: 301 }],
      }),
    );
    expect(findingOf(result, 'KLYNTO-TRN-005')?.status).toBe('fail');
    expect(findingOf(result, 'KLYNTO-TRN-005')?.severity).toBe('info');
  });
});

describe('redirect rules', () => {
  it('chains of more than two hops are review', () => {
    const result = runRules(
      makeEvidence({
        redirectChain: [
          { url: 'http://example.com/', status: 301 },
          { url: 'https://www.example.com/', status: 301 },
          { url: 'https://www.example.com/home', status: 301 },
        ],
      }),
    );
    expect(findingOf(result, 'KLYNTO-RDR-001')?.severity).toBe('review');
  });

  it('two hops are informational', () => {
    const result = runRules(
      makeEvidence({
        redirectChain: [
          { url: 'http://example.com/', status: 301 },
          { url: 'https://www.example.com/', status: 301 },
        ],
      }),
    );
    expect(findingOf(result, 'KLYNTO-RDR-002')?.severity).toBe('info');
  });

  it('cross-origin hops are surfaced', () => {
    const result = runRules(
      makeEvidence({
        url: 'https://example.com/final',
        redirectChain: [{ url: 'https://bit.ly/xyz', status: 301 }],
      }),
    );
    const finding = findingOf(result, 'KLYNTO-RDR-003');
    expect(finding?.status).toBe('fail');
    expect(finding?.evidence?.items?.[0]).toContain('bit.ly');
  });

  it('no redirects means no redirect findings', () => {
    const result = runRules(makeEvidence({ headers: [] }));
    const redirectFindings = result.findings.filter((f) => f.moduleId === 'redirects');
    expect(redirectFindings).toHaveLength(0);
  });
});
