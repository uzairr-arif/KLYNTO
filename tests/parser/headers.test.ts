import { describe, expect, it } from 'vitest';
import { HttpHeaders, parseHeaderLines } from '../../src/core/parser/headers';

describe('HttpHeaders', () => {
  it('is case-insensitive', () => {
    const headers = new HttpHeaders([
      { name: 'Content-Security-Policy', value: "default-src 'self'" },
    ]);
    expect(headers.get('content-security-policy')).toBe("default-src 'self'");
    expect(headers.get('CONTENT-SECURITY-POLICY')).toBe("default-src 'self'");
    expect(headers.has('x-frame-options')).toBe(false);
  });

  it('keeps multi-value headers separate (Set-Cookie)', () => {
    const headers = new HttpHeaders([
      { name: 'Set-Cookie', value: 'a=1; Secure' },
      { name: 'Set-Cookie', value: 'b=2; HttpOnly' },
    ]);
    expect(headers.getAll('set-cookie')).toHaveLength(2);
    expect(headers.get('set-cookie')).toBe('a=1; Secure');
  });

  it('joins combined values', () => {
    const headers = new HttpHeaders([
      { name: 'Via', value: '1.1 a' },
      { name: 'Via', value: '1.1 b' },
    ]);
    expect(headers.getCombined('via')).toBe('1.1 a, 1.1 b');
  });

  it('preserves original order in toList', () => {
    const headers = new HttpHeaders([
      { name: 'B', value: '2' },
      { name: 'A', value: '1' },
      { name: 'A', value: '0' },
    ]);
    expect(headers.toList()).toEqual([
      { name: 'B', value: '2' },
      { name: 'A', value: '1' },
      { name: 'A', value: '0' },
    ]);
  });
});

describe('parseHeaderLines', () => {
  it('parses raw header text', () => {
    const parsed = parseHeaderLines('Content-Type: text/html\r\nX-Test:  a b \n\nbroken-line');
    expect(parsed).toEqual([
      { name: 'Content-Type', value: 'text/html' },
      { name: 'X-Test', value: 'a b' },
    ]);
  });
});
