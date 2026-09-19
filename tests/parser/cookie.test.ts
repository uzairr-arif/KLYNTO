import { describe, expect, it } from 'vitest';
import { isLongLived, looksLikeSessionName, parseSetCookie } from '../../src/core/parser/cookie';

describe('parseSetCookie', () => {
  it('parses name, value and attributes', () => {
    const cookie = parseSetCookie(
      'sessionId=abc123; Path=/; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Max-Age=3600',
    );
    expect(cookie).not.toBeNull();
    expect(cookie!.name).toBe('sessionId');
    expect(cookie!.value).toBe('abc123');
    expect(cookie!.secure).toBe(true);
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe('lax');
    expect(cookie!.domain).toBe('example.com');
    expect(cookie!.path).toBe('/');
    expect(cookie!.maxAge).toBe(3600);
    expect(cookie!.isSession).toBe(false);
  });

  it('strips a leading dot from Domain', () => {
    const cookie = parseSetCookie('sid=x; Domain=.example.com');
    expect(cookie!.domain).toBe('example.com');
  });

  it('treats missing expiry as session cookie', () => {
    const cookie = parseSetCookie('prefs=dark');
    expect(cookie!.isSession).toBe(true);
    expect(cookie!.secure).toBe(false);
  });

  it('parses Expires timestamps', () => {
    const cookie = parseSetCookie('sid=x; Expires=Wed, 21 Oct 2026 07:28:00 GMT');
    expect(cookie!.expires).toBe(Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'));
  });

  it('returns null for malformed input', () => {
    expect(parseSetCookie('nonsense')).toBeNull();
    expect(parseSetCookie('=value')).toBeNull();
    expect(parseSetCookie('')).toBeNull();
  });

  it('handles values containing semicolons-ish attribute sections', () => {
    const cookie = parseSetCookie('v=a=b; Secure');
    expect(cookie!.value).toBe('a=b');
    expect(cookie!.secure).toBe(true);
  });
});

describe('heuristics', () => {
  it('flags session-like names', () => {
    expect(looksLikeSessionName('sessionId')).toBe(true);
    expect(looksLikeSessionName('AUTH-TOKEN')).toBe(true);
    expect(looksLikeSessionName('theme')).toBe(false);
  });

  it('detects long-lived cookies', () => {
    expect(isLongLived(parseSetCookie('sid=x; Max-Age=31536001')!)).toBe(true);
    expect(isLongLived(parseSetCookie('sid=x; Max-Age=3600')!)).toBe(false);
    expect(isLongLived(parseSetCookie('sid=x')!)).toBe(false);
    expect(isLongLived(parseSetCookie('sid=x; Expires=Wed, 21 Oct 2036 07:28:00 GMT')!)).toBe(true);
  });
});
