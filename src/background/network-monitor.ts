import type {
  NetworkRequestSummary,
  ObservedResponse,
  ObservedSetCookie,
  RedirectHop,
  ScanEvidence,
} from '../core/models';
import { buildTarget } from '../core/parser/urls';
import { SESSION_KEYS } from '../shared/constants';

/** Cap sizes so a busy tab cannot grow the session store without bound. */
const MAX_REQUESTS = 150;
const MAX_INSECURE_URLS = 20;
const MAX_SET_COOKIE = 40;

export interface TabEvidenceState {
  /** Final main-frame response once observed. */
  mainFrame?: { url: string; status: number; headers: Array<{ name: string; value: string }> };
  redirectChain: RedirectHop[];
  setCookie: ObservedSetCookie[];
  requests: NetworkRequestSummary[];
  subresourceTotal: number;
  insecureUrls: string[];
  /** Scheme of the main document, used to flag insecure subresources. */
  mainScheme?: 'http' | 'https';
  startedAt: number;
  finishedAt?: number;
}

function headerList(
  headers?: chrome.webRequest.HttpHeader[],
): Array<{ name: string; value: string }> {
  return (headers ?? [])
    .filter((h) => typeof h.value === 'string')
    .map((h) => ({ name: h.name, value: h.value as string }));
}

function corsOf(headers: Array<{ name: string; value: string }>): NetworkRequestSummary['cors'] {
  let allowOrigin: string | undefined;
  let credentials: boolean | undefined;
  for (const h of headers) {
    const name = h.name.toLowerCase();
    if (name === 'access-control-allow-origin') allowOrigin = h.value;
    if (name === 'access-control-allow-credentials')
      credentials = h.value.trim().toLowerCase() === 'true';
  }
  return allowOrigin !== undefined ? { allowOrigin, credentials } : undefined;
}

/**
 * Passive per-tab network observation via chrome.webRequest (MV3 observer
 * mode). State is kept in memory and mirrored to chrome.storage.session so it
 * survives service worker restarts. Requires host permission for the observed
 * origins - events for non-granted origins simply do not fire.
 */
export class NetworkMonitor {
  private readonly states = new Map<number, TabEvidenceState>();
  private readonly pendingSaves = new Set<number>();
  private mainFrameListeners: Array<(tabId: number, state: TabEvidenceState) => void> = [];

  start(): void {
    const filter = { urls: ['http://*/*', 'https://*/*'] };
    // 'extraHeaders' is required in MV3 to observe Set-Cookie.
    const redirectSpec: chrome.webRequest.OnBeforeRedirectOptions[] = [
      chrome.webRequest.OnBeforeRedirectOptions.RESPONSE_HEADERS,
      chrome.webRequest.OnBeforeRedirectOptions.EXTRA_HEADERS,
    ];
    const completedSpec: chrome.webRequest.OnCompletedOptions[] = [
      chrome.webRequest.OnCompletedOptions.RESPONSE_HEADERS,
      chrome.webRequest.OnCompletedOptions.EXTRA_HEADERS,
    ];

    chrome.webRequest.onBeforeRedirect.addListener(
      (details) => this.handleBeforeRedirect(details),
      filter,
      redirectSpec,
    );
    chrome.webRequest.onCompleted.addListener(
      (details) => this.handleCompleted(details),
      filter,
      completedSpec,
    );
    chrome.webRequest.onErrorOccurred.addListener((details) => this.handleError(details), filter);
  }

  onMainFrame(listener: (tabId: number, state: TabEvidenceState) => void): void {
    this.mainFrameListeners.push(listener);
  }

  private stateFor(tabId: number, url?: string): TabEvidenceState {
    let state = this.states.get(tabId);
    if (!state) {
      state = {
        redirectChain: [],
        setCookie: [],
        requests: [],
        subresourceTotal: 0,
        insecureUrls: [],
        startedAt: Date.now(),
      };
      this.states.set(tabId, state);
    }
    if (url && !state.mainFrame && state.redirectChain.length === 0) {
      state.startedAt = Date.now();
    }
    return state;
  }

  private handleBeforeRedirect(details: chrome.webRequest.OnBeforeRedirectDetails): void {
    if (details.tabId < 0 || details.type !== 'main_frame') return;
    const state = this.stateFor(details.tabId, details.url);
    if (state.redirectChain.length === 0) state.startedAt = Date.now();
    state.redirectChain.push({
      url: details.url,
      status: details.statusCode,
      headers: headerList(details.responseHeaders),
    });
    this.collectSetCookie(state, details.url, details.responseHeaders);
    this.schedulePersist(details.tabId);
  }

  private handleCompleted(details: chrome.webRequest.OnCompletedDetails): void {
    if (details.tabId < 0) return;
    const state = this.stateFor(details.tabId, details.url);
    const headers = headerList(details.responseHeaders);

    if (details.type === 'main_frame') {
      state.mainFrame = { url: details.url, status: details.statusCode, headers };
      state.mainScheme = details.url.startsWith('https:') ? 'https' : 'http';
      state.finishedAt = Date.now();
      this.collectSetCookie(state, details.url, details.responseHeaders);
      this.schedulePersist(details.tabId);
      for (const listener of this.mainFrameListeners) {
        listener(details.tabId, state);
      }
      return;
    }

    // Subresource / XHR / etc.
    const summary: NetworkRequestSummary = {
      url: details.url,
      method: details.method ?? 'GET',
      status: details.statusCode,
      type: details.type,
      cors: corsOf(headers),
    };
    if (state.mainScheme === 'https' && details.url.startsWith('http:')) {
      summary.insecure = true;
      if (
        state.insecureUrls.length < MAX_INSECURE_URLS &&
        !state.insecureUrls.includes(details.url)
      ) {
        state.insecureUrls.push(details.url);
      }
    }
    if (state.requests.length < MAX_REQUESTS) state.requests.push(summary);
    state.subresourceTotal += 1;
    this.collectSetCookie(state, details.url, details.responseHeaders);
    this.schedulePersist(details.tabId);
  }

  private handleError(details: chrome.webRequest.OnErrorOccurredDetails): void {
    if (details.tabId < 0) return;
    // Main frame errors end observation with no response; drop partial state
    // so a later navigation starts clean.
    if (details.type === 'main_frame') {
      this.clearTab(details.tabId);
    }
  }

  private collectSetCookie(
    state: TabEvidenceState,
    url: string,
    headers?: chrome.webRequest.HttpHeader[],
  ): void {
    for (const h of headers ?? []) {
      if (h.name.toLowerCase() !== 'set-cookie' || typeof h.value !== 'string') continue;
      if (state.setCookie.length >= MAX_SET_COOKIE) return;
      state.setCookie.push({ url, header: h.value });
    }
  }

  private schedulePersist(tabId: number): void {
    if (this.pendingSaves.has(tabId)) return;
    this.pendingSaves.add(tabId);
    setTimeout(() => {
      this.pendingSaves.delete(tabId);
      const state = this.states.get(tabId);
      if (!state) return;
      void chrome.storage.session
        .set({ [`${SESSION_KEYS.tabEvidence}${tabId}`]: state })
        .catch(() => undefined);
    }, 250);
  }

  /** Re-hydrate state after a service worker restart. */
  async hydrate(tabId: number): Promise<TabEvidenceState | null> {
    const memory = this.states.get(tabId);
    if (memory) return memory;
    try {
      const key = `${SESSION_KEYS.tabEvidence}${tabId}`;
      const stored = await chrome.storage.session.get(key);
      const state = stored[key] as TabEvidenceState | undefined;
      if (state) this.states.set(tabId, state);
      return state ?? null;
    } catch {
      return null;
    }
  }

  buildEvidence(tabId: number, source: ScanEvidence['source']): ScanEvidence | null {
    const state = this.states.get(tabId);
    return state ? this.evidenceFromState(state, source) : null;
  }

  evidenceFromState(state: TabEvidenceState, source: ScanEvidence['source']): ScanEvidence | null {
    if (!state.mainFrame) return null;
    const target = buildTarget(state.mainFrame.url);
    if (!target) return null;
    const finishedAt = state.finishedAt ?? Date.now();
    return {
      target,
      document: {
        url: state.mainFrame.url,
        status: state.mainFrame.status,
        headers: state.mainFrame.headers,
        redirected: state.redirectChain.length > 0,
        redirectChain: state.redirectChain,
      } satisfies ObservedResponse,
      subresources: {
        total: state.subresourceTotal,
        insecure: state.insecureUrls.length,
        insecureUrls: state.insecureUrls,
      },
      setCookie: state.setCookie,
      requests: state.requests,
      source,
      startedAt: state.startedAt,
      finishedAt,
    };
  }

  /** Wait for the main frame of a tab to complete (used by hidden-tab captures). */
  waitForMainFrame(tabId: number, timeoutMs: number): Promise<TabEvidenceState | null> {
    const existing = this.states.get(tabId);
    if (existing?.mainFrame) return Promise.resolve(existing);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve(this.states.get(tabId) ?? null);
      }, timeoutMs);
      const listener = (completedTabId: number, state: TabEvidenceState) => {
        if (completedTabId !== tabId) return;
        cleanup();
        resolve(state);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.mainFrameListeners = this.mainFrameListeners.filter((l) => l !== listener);
      };
      this.mainFrameListeners.push(listener);
    });
  }

  clearTab(tabId: number): void {
    this.states.delete(tabId);
    void chrome.storage.session
      .remove(`${SESSION_KEYS.tabEvidence}${tabId}`)
      .catch(() => undefined);
  }
}
