export interface HttpHeader {
  name: string;
  value: string;
}

/** A single hop in a redirect chain, as observed on the wire. */
export interface RedirectHop {
  url: string;
  status: number;
  /** The Location header of the redirect, if present. */
  location?: string;
  /** Response headers of the redirect response, when available. */
  headers?: HttpHeader[];
}

/** The final response of a document scan (after redirects). */
export interface ObservedResponse {
  url: string;
  status: number;
  statusText?: string;
  protocol?: string;
  headers: HttpHeader[];
  redirected: boolean;
  redirectChain: RedirectHop[];
}

/** Summary of subresources observed during a page load. */
export interface SubresourceSummary {
  total: number;
  /** Number of subresources loaded over http:// on an https:// page. */
  insecure: number;
  insecureUrls: string[];
}

/** Compact record of one observed network request (for the network view). */
export interface NetworkRequestSummary {
  url: string;
  method: string;
  status: number;
  /** webRequest resource type, e.g. main_frame, script, xmlhttprequest. */
  type: string;
  /** CORS response configuration seen on this request, if any. */
  cors?: {
    allowOrigin?: string;
    credentials?: boolean;
  };
  /** True when loaded insecurely (http://) on an https:// page. */
  insecure?: boolean;
}

export interface Target {
  url: string;
  origin: string;
  hostname: string;
  protocol: string;
  port: string | null;
  path: string;
}

/** A raw Set-Cookie header seen on any observed response. */
export interface ObservedSetCookie {
  url: string;
  header: string;
}

export type ScanSource = 'passive' | 'active' | 'devtools' | 'batch';

export interface TransportSummary {
  scheme: 'http' | 'https' | 'other';
  isLocal: boolean;
  /** Raw Strict-Transport-Security value of the final response, if any. */
  hsts: string | null;
  redirectCount: number;
  /** True when the chain starts with an http → https hop. */
  httpsUpgradeInChain: boolean;
  /** True when any hop redirects from https to http. */
  httpsDowngradeInChain: boolean;
  mixedContentCount: number;
}

/** Everything the rule engine receives. Pure data - no browser APIs. */
export interface ScanEvidence {
  target: Target;
  document: ObservedResponse;
  subresources: SubresourceSummary;
  /** All Set-Cookie headers observed on the document and its subresources. */
  setCookie: ObservedSetCookie[];
  requests?: NetworkRequestSummary[];
  source: ScanSource;
  startedAt: number;
  finishedAt: number;
}
