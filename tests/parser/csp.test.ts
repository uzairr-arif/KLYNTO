import { describe, expect, it } from 'vitest';
import {
  effectiveSources,
  hasBroadWildcard,
  hasDataUrl,
  hasHashOrNonce,
  hasInvalidNone,
  hasUnsafeEval,
  hasUnsafeInline,
  isNone,
  OBJECT_SOURCES_DIRECTIVES,
  parseCsp,
  SCRIPT_SOURCES_DIRECTIVES,
} from '../../src/core/parser/csp';

describe('parseCsp', () => {
  it('tokenizes directives and sources', () => {
    const csp = parseCsp(
      "default-src 'self'; script-src 'self' https://cdn.example.com; upgrade-insecure-requests",
    );
    expect(csp.directiveNames).toEqual(['default-src', 'script-src', 'upgrade-insecure-requests']);
    expect(csp.directives['script-src']).toEqual(["'self'", 'https://cdn.example.com']);
    expect(csp.directives['upgrade-insecure-requests']).toEqual([]);
  });

  it('lowercases directive names and sources', () => {
    const csp = parseCsp("SCRIPT-SRC 'SELF' https://CDN.example.com");
    expect(csp.directiveNames).toEqual(['script-src']);
    expect(csp.directives['script-src']).toEqual(["'self'", 'https://cdn.example.com']);
  });

  it('flags unknown directives as malformed', () => {
    const csp = parseCsp("default-src 'self'; script_Src 'self'");
    expect(csp.malformed).toEqual(['script_src']);
  });

  it('merges repeated directives', () => {
    const csp = parseCsp("img-src 'self'; img-src data:");
    expect(csp.directives['img-src']).toEqual(["'self'", 'data:']);
  });
});

describe('source helpers', () => {
  const csp = parseCsp(
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-abc123' data: *; object-src 'none'; img-src *",
  );

  it('follows fallback semantics', () => {
    const onlyDefault = parseCsp("default-src 'self'");
    expect(effectiveSources(onlyDefault, SCRIPT_SOURCES_DIRECTIVES)).toEqual(["'self'"]);
    expect(effectiveSources(csp, SCRIPT_SOURCES_DIRECTIVES)).toEqual(csp.directives['script-src']);
    expect(effectiveSources(parseCsp("form-action 'self'"), OBJECT_SOURCES_DIRECTIVES)).toBeNull();
  });

  it('detects keywords and wildcards', () => {
    const sources = csp.directives['script-src'];
    expect(hasUnsafeInline(sources)).toBe(true);
    expect(hasUnsafeEval(sources)).toBe(true);
    expect(hasDataUrl(sources)).toBe(true);
    expect(hasBroadWildcard(sources)).toBe(true);
    expect(hasHashOrNonce(sources)).toBe(true);
  });

  it('detects none correctly', () => {
    expect(isNone(csp.directives['object-src'])).toBe(true);
    expect(hasInvalidNone(csp.directives['object-src'])).toBe(false);
    expect(hasInvalidNone(["'none'", "'self'"])).toBe(true);
  });

  it('treats *.host and http: as broad', () => {
    expect(hasBroadWildcard(['*.example.com'])).toBe(true);
    expect(hasBroadWildcard(['http:'])).toBe(true);
    expect(hasBroadWildcard(['https://example.com'])).toBe(false);
  });
});
