export const APP_NAME = 'Klynto';
export const APP_TAGLINE = 'Web Security Inspector & Developer Toolkit';
export const APP_DESCRIPTION =
  'Local-first web security inspection for developers - headers, CSP, cookies, CORS, transport, cross-origin and more. All analysis happens in your browser.';

/** Storage keys in chrome.storage.local */
export const STORAGE_KEYS = {
  settings: 'klynto.settings.v1',
  history: 'klynto.history.v1',
  latestByOrigin: 'klynto.latestByOrigin.v1',
  batchRuns: 'klynto.batchRuns.v1',
} as const;

/** Storage keys in chrome.storage.session (transient, per browser session) */
export const SESSION_KEYS = {
  tabEvidence: 'klynto.tabEvidence.',
  tabScan: 'klynto.tabScan.',
} as const;

/** Replace the last history entry instead of appending when the same origin
 *  was scanned within this window (prevents history spam while browsing). */
export const HISTORY_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/** Settings bounds */
export const HISTORY_LIMITS = { min: 10, max: 300, default: 100 } as const;

export const BATCH_LIMITS = { maxUrls: 50, scanTimeoutMs: 20_000 } as const;

/** Context menu id */
export const CONTEXT_MENU_ID = 'klynto-inspect-page';
