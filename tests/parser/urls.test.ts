import { describe, expect, it } from 'vitest';
import { buildTarget, isInspectableUrl, isLocalTarget } from '../../src/core/parser/urls';

describe('buildTarget', () => {
  it('extracts target fields', () => {
    const target = buildTarget('https://example.com:8443/path/page?q=1');
    expect(target).toEqual({
      url: 'https://example.com:8443/path/page?q=1',
      origin: 'https://example.com:8443',
      hostname: 'example.com',
      protocol: 'https',
      port: '8443',
      path: '/path/page?q=1',
    });
  });

  it('rejects non-http protocols and garbage', () => {
    expect(buildTarget('chrome://extensions')).toBeNull();
    expect(buildTarget('not a url')).toBeNull();
    expect(buildTarget('about:blank')).toBeNull();
  });

  it('normalizes hostname case', () => {
    expect(buildTarget('https://EXAMPLE.com/')?.hostname).toBe('example.com');
  });
});

describe('isLocalTarget / isInspectableUrl', () => {
  it('recognizes localhost and private ranges', () => {
    expect(isLocalTarget(buildTarget('http://localhost:3000/')!)).toBe(true);
    expect(isLocalTarget(buildTarget('http://127.0.0.1:8080/')!)).toBe(true);
    expect(isLocalTarget(buildTarget('http://192.168.1.10/')!)).toBe(true);
    expect(isLocalTarget(buildTarget('http://10.0.0.5/')!)).toBe(true);
    expect(isLocalTarget(buildTarget('https://example.com/')!)).toBe(false);
  });

  it('only accepts http(s) as inspectable', () => {
    expect(isInspectableUrl('https://example.com')).toBe(true);
    expect(isInspectableUrl('http://localhost:5173')).toBe(true);
    expect(isInspectableUrl('chrome://version')).toBe(false);
    expect(isInspectableUrl('file:///C:/x')).toBe(false);
  });
});
