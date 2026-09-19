import type {
  NetworkRequestSummary,
  ObservedResponse,
  ObservedSetCookie,
  RedirectHop,
  ScanEvidence,
} from '@core/models';
import { buildTarget } from '@core/parser/urls';
import { safeUrlParse } from '../../shared/utils';

/** Minimal shapes of the HAR data chrome.devtools.network exposes. */
export interface HarHeader {
  name: string;
  value: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface HarEntryLite {
  url: string;
  method: string;
  status: number;
  statusText: string;
  resourceType: string;
  startedDateTime: string;
  responseHeaders: HarHeader[];
  cookies: HarCookie[];
  protocol?: string;
  redirectedFromUrl?: string;
}

interface DevtoolsRequestLike {
  request: {
    url: string;
    method: string;
  };
  response: {
    status: number;
    statusText: string;
    headers: HarHeader[];
    cookies: HarCookie[];
    content?: { mimeType?: string };
    _transferSize?: number;
  };
  _resourceType?: string;
  startedDateTime: string;
  pageRef?: string;
}

export function entryToLite(entry: DevtoolsRequestLike): HarEntryLite {
  return {
    url: entry.request.url,
    method: entry.request.method,
    status: entry.response.status,
    statusText: entry.response.statusText,
    resourceType: entry._resourceType ?? 'other',
    startedDateTime: entry.startedDateTime,
    responseHeaders: entry.response.headers ?? [],
    cookies: entry.response.cookies ?? [],
  };
}

/** Reconstruct a Set-Cookie header from HAR cookie data. */
function cookieToSetCookieLine(cookie: HarCookie): string {
  const parts = [`${cookie.name}=${cookie.value}`];
  if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
  if (cookie.path) parts.push(`Path=${cookie.path}`);
  if (cookie.expires) {
    const parsed = Date.parse(cookie.expires);
    if (Number.isFinite(parsed)) parts.push(`Expires=${new Date(parsed).toUTCString()}`);
  }
  if (cookie.httpOnly) parts.push('HttpOnly');
  if (cookie.secure) parts.push('Secure');
  if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
  return parts.join('; ');
}

/**
 * Build ScanEvidence from DevTools HAR entries - no host permissions needed:
 * the DevTools network API already exposes full response data for the
 * inspected page.
 */
export function evidenceFromHar(pageUrl: string, entries: HarEntryLite[]): ScanEvidence | null {
  const target = buildTarget(pageUrl);
  if (!target) return null;

  const pageOrigin = safeUrlParse(pageUrl)?.origin ?? '';

  // Document entries in time order; the final one is the main response.
  const documents = entries
    .filter((e) => e.resourceType === 'document')
    .sort((a, b) => Date.parse(a.startedDateTime) - Date.parse(b.startedDateTime));

  const mainEntry =
    documents.find((e) => e.url === pageUrl) ?? documents[documents.length - 1] ?? null;

  if (!mainEntry) return null;

  // Redirect chain: consecutive 3xx document entries.
  const redirectChain: RedirectHop[] = [];
  for (const doc of documents) {
    if (doc === mainEntry) continue;
    if (doc.status >= 300 && doc.status < 400) {
      redirectChain.push({ url: doc.url, status: doc.status });
    }
  }

  const setCookie: ObservedSetCookie[] = [];
  for (const cookie of mainEntry.cookies) {
    setCookie.push({ url: mainEntry.url, header: cookieToSetCookieLine(cookie) });
  }

  const requests: NetworkRequestSummary[] = [];
  let insecureCount = 0;
  const insecureUrls: string[] = [];
  const pageIsHttps = pageUrl.startsWith('https:');

  for (const entry of entries) {
    const corsHeader = entry.responseHeaders.find(
      (h) => h.name.toLowerCase() === 'access-control-allow-origin',
    );
    const credentialsHeader = entry.responseHeaders.find(
      (h) => h.name.toLowerCase() === 'access-control-allow-credentials',
    );
    if (entry.resourceType !== 'document') {
      const summary: NetworkRequestSummary = {
        url: entry.url,
        method: entry.method,
        status: entry.status,
        type: entry.resourceType,
      };
      if (corsHeader) {
        summary.cors = {
          allowOrigin: corsHeader.value,
          credentials: credentialsHeader?.value.trim().toLowerCase() === 'true',
        };
      }
      if (
        pageIsHttps &&
        entry.url.startsWith('http:') &&
        safeUrlParse(entry.url)?.origin !== pageOrigin
      ) {
        summary.insecure = true;
        insecureCount += 1;
        if (insecureUrls.length < 20) insecureUrls.push(entry.url);
      }
      if (requests.length < 150) requests.push(summary);
      for (const cookie of entry.cookies) {
        if (setCookie.length < 40)
          setCookie.push({ url: entry.url, header: cookieToSetCookieLine(cookie) });
      }
    } else if (corsHeader && entry === mainEntry) {
      // document-level CORS captured below via headers
    }
  }

  const document: ObservedResponse = {
    url: mainEntry.url,
    status: mainEntry.status,
    statusText: mainEntry.statusText,
    headers: mainEntry.responseHeaders,
    redirected: redirectChain.length > 0,
    redirectChain,
  };

  const now = Date.now();
  return {
    target,
    document,
    subresources: {
      total: entries.filter((e) => e.resourceType !== 'document').length,
      insecure: insecureCount,
      insecureUrls,
    },
    setCookie,
    requests,
    source: 'devtools',
    startedAt: Date.parse(documents[0]?.startedDateTime ?? '') || now,
    finishedAt: now,
  };
}
