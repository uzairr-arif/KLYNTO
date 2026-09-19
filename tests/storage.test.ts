import { describe, expect, it } from 'vitest';
import {
  appendHistory,
  clearAllData,
  exportAllData,
  getHistory,
  importAllData,
  mergeSettings,
  type KVStore,
} from '../src/core/storage/storage';
import type { ScanResult } from '../src/core/models';
import { buildTarget } from '../src/core/parser/urls';

function mapStore(): KVStore & { dump(): Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key: string, value: unknown) {
      map.set(key, value);
    },
    async remove(key: string) {
      map.delete(key);
    },
    dump: () => map,
  };
}

let counter = 0;
function scan(origin: string, timestamp = Date.now()): ScanResult {
  counter += 1;
  const target = buildTarget(`${origin}/`)!;
  return {
    id: `scan-${counter}`,
    target,
    timestamp,
    source: 'active',
    durationMs: 10,
    transport: {
      scheme: 'https',
      isLocal: false,
      hsts: null,
      redirectCount: 0,
      httpsUpgradeInChain: false,
      httpsDowngradeInChain: false,
      mixedContentCount: 0,
    },
    setCookie: [],
    findings: [],
    scores: {
      overall: 100,
      grade: 'good',
      counts: { pass: 0, info: 0, review: 0, warning: 0, high: 0, na: 0 },
      modules: {} as ScanResult['scores']['modules'],
    },
  };
}

describe('mergeSettings', () => {
  it('applies defaults for missing keys', () => {
    const settings = mergeSettings({});
    expect(settings.theme).toBe('system');
    expect(settings.autoInspect).toBe(true);
    expect(settings.historyLimit).toBe(100);
  });

  it('clamps historyLimit to bounds', () => {
    expect(mergeSettings({ historyLimit: 1 }).historyLimit).toBe(10);
    expect(mergeSettings({ historyLimit: 99_999 }).historyLimit).toBe(300);
  });

  it('rejects invalid themes', () => {
    expect(mergeSettings({ theme: 'hotdog' as never }).theme).toBe('system');
  });
});

describe('appendHistory', () => {
  it('appends newest-first and trims to limit', async () => {
    const store = mapStore();
    const base = Date.now();
    await appendHistory(store, scan('https://a.com', base), 3);
    await appendHistory(store, scan('https://b.com', base + 1), 3);
    await appendHistory(store, scan('https://c.com', base + 2), 3);
    await appendHistory(store, scan('https://d.com', base + 3), 3);
    const history = await getHistory(store);
    expect(history).toHaveLength(3);
    expect(history[0].target.hostname).toBe('d.com');
  });

  it('replaces a recent scan of the same origin instead of duplicating', async () => {
    const store = mapStore();
    const base = Date.now();
    await appendHistory(store, scan('https://a.com', base), 10);
    await appendHistory(store, scan('https://a.com', base + 60_000), 10);
    const history = await getHistory(store);
    expect(history).toHaveLength(1);
    expect(history[0].timestamp).toBe(base + 60_000);
  });

  it('keeps older entries beyond the dedupe window', async () => {
    const store = mapStore();
    const base = Date.now();
    await appendHistory(store, scan('https://a.com', base), 10);
    await appendHistory(store, scan('https://a.com', base + 30 * 60_000), 10);
    const history = await getHistory(store);
    expect(history).toHaveLength(2);
  });
});

describe('data export/import/clear', () => {
  it('round-trips settings and history', async () => {
    const store = mapStore();
    await appendHistory(store, scan('https://a.com'), 10);
    const data = await exportAllData(store);
    expect(data.kind).toBe('klynto-export');
    expect(data.history).toHaveLength(1);

    const other = mapStore();
    await importAllData(other, data);
    expect(await getHistory(other)).toHaveLength(1);
  });

  it('clearAllData removes history, latest and batch runs', async () => {
    const store = mapStore();
    await appendHistory(store, scan('https://a.com'), 10);
    await clearAllData(store);
    expect(await getHistory(store)).toHaveLength(0);
    expect(store.dump().size).toBeLessThanOrEqual(1); // settings may remain
  });
});
