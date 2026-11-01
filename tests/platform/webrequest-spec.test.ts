import { describe, expect, it } from 'vitest';
import { webRequestExtraInfoSpec } from '../../src/background/network-monitor';

describe('webRequestExtraInfoSpec', () => {
  it('keeps extraHeaders on Chromium (required to observe Set-Cookie)', () => {
    const spec = webRequestExtraInfoSpec(false);
    expect(spec.redirect).toContain('extraHeaders');
    expect(spec.completed).toContain('extraHeaders');
    expect(spec.redirect).toContain('responseHeaders');
    expect(spec.completed).toContain('responseHeaders');
  });

  it('omits extraHeaders on Firefox (rejected value; Set-Cookie is exposed anyway)', () => {
    const spec = webRequestExtraInfoSpec(true);
    expect(spec.redirect).not.toContain('extraHeaders');
    expect(spec.completed).not.toContain('extraHeaders');
    expect(spec.completed).toContain('responseHeaders');
  });
});
