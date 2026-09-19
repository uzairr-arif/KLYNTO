import type { ScanEvidence, ScanResult } from '../core/models';
import { analyze } from '../core/scanner/analyze';
import { buildTarget } from '../core/parser/urls';
import { loadSettings } from '../core/storage/storage';
import { browserApi } from '../platform/browser';
import { BATCH_LIMITS } from '../shared/constants';
import type { NetworkMonitor } from './network-monitor';

export interface ScanRequestOptions {
  batchId?: string;
  /**
   * 'tab' opens a hidden tab and observes the real load (captures the full
   * redirect chain). 'fetch' performs a service-worker fetch (no extra page
   * load, no redirect chain). Falls back from 'tab' to 'fetch' on failure.
   */
  mode?: 'tab' | 'fetch';
  timeoutMs?: number;
}

export type ScanFunction = (
  url: string,
  source: 'active' | 'batch',
  options?: ScanRequestOptions,
) => Promise<ScanResult>;

async function evidenceViaFetch(url: string, timeoutMs: number): Promise<ScanEvidence> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      credentials: 'include',
      signal: controller.signal,
    });
    const headers: Array<{ name: string; value: string }> = [];
    response.headers.forEach((value, name) => {
      headers.push({ name, value });
    });
    // Headers.getSetCookie() exposes Set-Cookie (Chrome 113+).
    const setCookieApi = response.headers as Headers & { getSetCookie?: () => string[] };
    const rawSetCookie = setCookieApi.getSetCookie?.() ?? [];
    const target = buildTarget(response.url || url);
    if (!target) throw new Error(`Invalid URL: ${url}`);
    const now = Date.now();
    return {
      target,
      document: {
        url: response.url || url,
        status: response.status,
        headers,
        redirected: response.redirected,
        redirectChain: [],
      },
      subresources: { total: 0, insecure: 0, insecureUrls: [] },
      setCookie: rawSetCookie.map((header) => ({ url: response.url || url, header })),
      source: 'active',
      startedAt: now,
      finishedAt: now,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function evidenceViaHiddenTab(
  url: string,
  monitor: NetworkMonitor,
  timeoutMs: number,
): Promise<ScanEvidence> {
  const tabId = await browserApi.openHiddenTab(url);
  if (tabId === null) throw new Error('Could not open a tab for scanning');
  try {
    const state = await monitor.waitForMainFrame(tabId, timeoutMs);
    const evidence = state ? monitor.evidenceFromState(state, 'batch') : null;
    if (!evidence) throw new Error('No response observed for the target');
    return evidence;
  } finally {
    void browserApi.closeTab(tabId);
    monitor.clearTab(tabId);
  }
}

/**
 * Scan a URL on demand: collects fresh evidence and runs the rule engine.
 * Errors are thrown to the caller (batch runner / message router) which
 * reports them per-target.
 */
export function createScanFunction(monitor: NetworkMonitor): ScanFunction {
  return async (url, source, options = {}) => {
    const target = buildTarget(url);
    if (!target) throw new Error(`Not a scannable URL: ${url}`);
    const settings = await loadSettings(browserApi.storageLocal());
    const timeoutMs = Math.min(options.timeoutMs ?? BATCH_LIMITS.scanTimeoutMs, 60_000);
    const startedAt = Date.now();

    let evidence: ScanEvidence | null = null;
    if (options.mode !== 'fetch') {
      try {
        evidence = await evidenceViaHiddenTab(url, monitor, timeoutMs);
      } catch {
        evidence = null;
      }
    }
    if (!evidence) {
      evidence = await evidenceViaFetch(url, timeoutMs);
    }

    // The hidden tab may have served a redirect target different from the
    // requested URL; keep the requested URL as the scan target but let rules
    // see the real final response.
    evidence.target = target;
    evidence.source = source;
    evidence.finishedAt = Date.now();
    evidence.startedAt = startedAt;

    return analyze(evidence, {
      analyzeCookies: settings.analyzeCookies,
      analyzeCors: settings.analyzeCors,
      disabledRuleIds: settings.disabledRuleIds,
      batchId: options.batchId,
      extensionVersion: browserApi.extensionVersion(),
    });
  };
}
