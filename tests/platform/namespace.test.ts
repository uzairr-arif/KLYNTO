import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The namespace shim aliases globalThis.chrome onto the promise-based
 * browser.* namespace on Firefox and leaves Chromium untouched. Each case
 * re-imports the module with a fresh module registry (vi.resetModules) after
 * arranging the globals the runtime would provide.
 */

const g = globalThis as unknown as { browser?: unknown; chrome?: unknown };

function arrange(globals: { browser?: unknown; chrome?: unknown }) {
  delete g.browser;
  delete g.chrome;
  if ('browser' in globals) g.browser = globals.browser;
  if ('chrome' in globals) g.chrome = globals.chrome;
}

async function importShim(): Promise<void> {
  vi.resetModules();
  await import('../../src/platform/namespace');
}

describe('platform/namespace shim', () => {
  beforeEach(() => {
    arrange({});
  });

  afterEach(() => {
    arrange({});
  });

  it('aliases chrome onto browser when both exist (Firefox)', async () => {
    const browserNs = { runtime: { id: 'test' } };
    const chromeNs = { runtime: { id: 'test' } };
    arrange({ browser: browserNs, chrome: chromeNs });

    await importShim();

    expect(g.chrome).toBe(browserNs);
    expect(g.chrome).not.toBe(chromeNs);
  });

  it('leaves chrome untouched when only chrome exists (Chromium)', async () => {
    const chromeNs = { runtime: { id: 'test' } };
    arrange({ chrome: chromeNs });

    await importShim();

    expect(g.chrome).toBe(chromeNs);
  });

  it('does nothing when neither namespace exists', async () => {
    await expect(importShim()).resolves.toBeUndefined();
    expect(g.chrome).toBeUndefined();
    expect(g.browser).toBeUndefined();
  });
});
