import { DEFAULT_SETTINGS, type ScanResult, type Settings } from '../models';
import { HISTORY_DEDUPE_WINDOW_MS, HISTORY_LIMITS, STORAGE_KEYS } from '../../shared/constants';

/**
 * Minimal async KV abstraction so storage logic is testable without a browser.
 * The platform adapter binds this to chrome.storage.local / .session.
 */
export interface KVStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Settings ---------------------------------------------------------------- */

export function mergeSettings(raw: Partial<Settings> | undefined): Settings {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  settings.historyLimit = Math.min(
    HISTORY_LIMITS.max,
    Math.max(HISTORY_LIMITS.min, settings.historyLimit),
  );
  if (!Array.isArray(settings.disabledRuleIds)) settings.disabledRuleIds = [];
  if (settings.theme !== 'dark' && settings.theme !== 'light' && settings.theme !== 'system') {
    settings.theme = 'system';
  }
  return settings;
}

export async function loadSettings(store: KVStore): Promise<Settings> {
  const raw = await store.get<Partial<Settings>>(STORAGE_KEYS.settings);
  return mergeSettings(raw);
}

export async function saveSettings(store: KVStore, settings: Settings): Promise<void> {
  await store.set(STORAGE_KEYS.settings, settings);
}

/** History ----------------------------------------------------------------- */

export async function getHistory(store: KVStore): Promise<ScanResult[]> {
  const scans = await store.get<ScanResult[]>(STORAGE_KEYS.history);
  return Array.isArray(scans) ? scans : [];
}

/**
 * Append a scan to history. If the same origin was scanned within the dedupe
 * window, replace that entry instead of adding a new one. Trims to the
 * configured limit (newest first).
 */
export async function appendHistory(
  store: KVStore,
  scan: ScanResult,
  limit: number,
): Promise<ScanResult[]> {
  const history = await getHistory(store);
  const origin = scan.target.origin;
  const cutoff = scan.timestamp - HISTORY_DEDUPE_WINDOW_MS;

  const filtered = history.filter((entry) => {
    if (entry.target.origin !== origin) return true;
    return entry.timestamp < cutoff;
  });

  const next = [scan, ...filtered].slice(0, Math.max(1, limit));
  await store.set(STORAGE_KEYS.history, next);
  return next;
}

export async function clearHistory(store: KVStore): Promise<void> {
  await store.remove(STORAGE_KEYS.history);
}

export async function deleteScan(store: KVStore, scanId: string): Promise<ScanResult[]> {
  const history = await getHistory(store);
  const next = history.filter((scan) => scan.id !== scanId);
  await store.set(STORAGE_KEYS.history, next);
  return next;
}

/** Latest scan per origin -------------------------------------------------- */

export async function getLatestByOrigin(store: KVStore): Promise<Record<string, ScanResult>> {
  const latest = await store.get<Record<string, ScanResult>>(STORAGE_KEYS.latestByOrigin);
  return latest ?? {};
}

export async function setLatestForOrigin(store: KVStore, scan: ScanResult): Promise<void> {
  const latest = await getLatestByOrigin(store);
  latest[scan.target.origin] = scan;
  // Keep the map bounded: drop origins not seen in the last 90 days.
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  for (const [origin, entry] of Object.entries(latest)) {
    void origin;
    if (entry.timestamp < cutoff) delete latest[origin];
  }
  await store.set(STORAGE_KEYS.latestByOrigin, latest);
}

export async function getLatestForOrigin(
  store: KVStore,
  origin: string,
): Promise<ScanResult | undefined> {
  const latest = await getLatestByOrigin(store);
  return latest[origin];
}

/** Batch runs --------------------------------------------------------------- */

export interface BatchRun {
  id: string;
  startedAt: number;
  finishedAt?: number;
  targets: string[];
  results: ScanResult[];
  errors: Array<{ url: string; error: string }>;
}

export async function saveBatchRun(store: KVStore, run: BatchRun): Promise<void> {
  const runs = await store.get<BatchRun[]>(STORAGE_KEYS.batchRuns);
  const next = [run, ...(runs ?? [])].slice(0, 20);
  await store.set(STORAGE_KEYS.batchRuns, next);
}

export async function getBatchRuns(store: KVStore): Promise<BatchRun[]> {
  const runs = await store.get<BatchRun[]>(STORAGE_KEYS.batchRuns);
  return runs ?? [];
}

/** Data management ---------------------------------------------------------- */

export interface DataExport {
  kind: 'klynto-export';
  version: 1;
  exportedAt: number;
  settings: Settings;
  history: ScanResult[];
  batchRuns: BatchRun[];
}

export async function exportAllData(store: KVStore): Promise<DataExport> {
  const [settings, history, batchRuns] = await Promise.all([
    loadSettings(store),
    getHistory(store),
    getBatchRuns(store),
  ]);
  return {
    kind: 'klynto-export',
    version: 1,
    exportedAt: Date.now(),
    settings,
    history,
    batchRuns,
  };
}

export async function importAllData(store: KVStore, data: DataExport): Promise<void> {
  if (data.kind !== 'klynto-export') throw new Error('Not a Klynto export file');
  if (data.settings) await saveSettings(store, mergeSettings(data.settings));
  if (Array.isArray(data.history)) {
    await store.set(STORAGE_KEYS.history, data.history);
  }
  if (Array.isArray(data.batchRuns)) {
    await store.set(STORAGE_KEYS.batchRuns, data.batchRuns);
  }
}

export async function clearAllData(store: KVStore): Promise<void> {
  await Promise.all([
    store.remove(STORAGE_KEYS.history),
    store.remove(STORAGE_KEYS.latestByOrigin),
    store.remove(STORAGE_KEYS.batchRuns),
  ]);
}
