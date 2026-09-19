import type { Regression, ScanResult } from '../core/models';
import { analyze } from '../core/scanner/analyze';
import {
  appendHistory,
  getLatestForOrigin,
  loadSettings,
  setLatestForOrigin,
} from '../core/storage/storage';
import { detectRegressions } from '../core/compare/diff';
import { browserApi } from '../platform/browser';
import { SESSION_KEYS } from '../shared/constants';
import type { NetworkMonitor } from './network-monitor';
import { isInspectableUrl } from '../core/parser/urls';

export interface TabScanPayload {
  scan: ScanResult | null;
  regressions: Regression[];
  granted: boolean;
  inspectable: boolean;
  url?: string;
}

/**
 * Watches tab navigations, auto-inspects granted origins, persists scans and
 * computes regressions + toolbar badge state.
 */
export class TabManager {
  constructor(private readonly monitor: NetworkMonitor) {}

  start(): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'complete') return;
      const url = tab.url;
      if (!url || !isInspectableUrl(url)) {
        if (changeInfo.status === 'complete') void browserApi.clearBadge();
        return;
      }
      void this.handleNavigation(tabId, url);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.monitor.clearTab(tabId);
      void chrome.storage.session.remove(`${SESSION_KEYS.tabScan}${tabId}`).catch(() => undefined);
    });
  }

  /** Called by the monitor whenever a main frame response completes. */
  async handleNavigation(tabId: number, url: string): Promise<void> {
    try {
      const settings = await loadSettings(browserApi.storageLocal());
      if (!settings.autoInspect) return;

      const granted = await browserApi.hasOrigins(originPatterns(url));
      if (!granted) {
        await browserApi.clearBadge();
        return;
      }

      const evidence = this.monitor.buildEvidence(tabId, 'passive');
      if (!evidence) return;

      const scan = analyze(evidence, {
        analyzeCookies: settings.analyzeCookies,
        analyzeCors: settings.analyzeCors,
        disabledRuleIds: settings.disabledRuleIds,
        extensionVersion: browserApi.extensionVersion(),
      });

      await this.finalizeScan(tabId, scan);
    } catch {
      // Never break navigation handling on scan errors.
    }
  }

  /** Store a completed scan (passive or active) with regressions + badge. */
  async finalizeScan(tabId: number | null, scan: ScanResult): Promise<void> {
    const store = browserApi.storageLocal();
    const origin = scan.target.origin;
    const previous = await getLatestForOrigin(store, origin);
    const regressions = previous ? detectRegressions(previous, scan) : [];

    await setLatestForOrigin(store, scan);
    if (tabId !== null) {
      await chrome.storage.session
        .set({ [`${SESSION_KEYS.tabScan}${tabId}`]: { scan, regressions } })
        .catch(() => undefined);
    }
    await appendHistory(store, scan, (await loadSettings(store)).historyLimit);

    // Badge: regression marker wins over the score.
    if (regressions.length > 0) {
      await browserApi.setBadge('!');
    } else if (scan.scores.overall >= 0) {
      const color =
        scan.scores.grade === 'good'
          ? '#10b981'
          : scan.scores.grade === 'fair'
            ? '#f59e0b'
            : '#ef4444';
      await browserApi.setBadge(String(scan.scores.overall), color);
    }
  }

  async getScanForTab(tabId: number): Promise<TabScanPayload> {
    const tab = await browserApi.getTab(tabId);
    const url = tab?.url;
    const inspectable = !!url && isInspectableUrl(url);
    const granted = inspectable
      ? await browserApi.hasOrigins(originPatterns(url as string))
      : false;

    let scan: ScanResult | null = null;
    let regressions: Regression[] = [];
    try {
      const key = `${SESSION_KEYS.tabScan}${tabId}`;
      const stored = await chrome.storage.session.get(key);
      const payload = stored[key] as { scan: ScanResult; regressions: Regression[] } | undefined;
      if (payload) {
        scan = payload.scan;
        regressions = payload.regressions;
      }
    } catch {
      // session storage unavailable
    }

    return { scan, regressions, granted, inspectable, url };
  }
}

export function originPatterns(url: string): string[] {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return [`http://${host}/*`, `https://${host}/*`];
  } catch {
    return [];
  }
}
