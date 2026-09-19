import type { RuleContext } from '../models';
import { HttpHeaders, parseHeaders } from '../parser/headers';
import { parseSetCookie, type ParsedCookie } from '../parser/cookie';
import type { ParsedCsp } from '../parser/csp';
import { parseCsp } from '../parser/csp';
import { isLocalTarget } from '../parser/urls';
import { safeUrlParse } from '../../shared/utils';

export function docHeaders(ctx: RuleContext): HttpHeaders {
  return parseHeaders(ctx.evidence.document.headers);
}

export function docUrl(ctx: RuleContext): URL | null {
  return safeUrlParse(ctx.evidence.document.url);
}

export function isHttpsDoc(ctx: RuleContext): boolean {
  return ctx.evidence.target.protocol === 'https';
}

export function isHttpDoc(ctx: RuleContext): boolean {
  return ctx.evidence.target.protocol === 'http';
}

export function isLocalDoc(ctx: RuleContext): boolean {
  return isLocalTarget(ctx.evidence.target);
}

export function contentType(ctx: RuleContext): string {
  return docHeaders(ctx).get('content-type') ?? '';
}

/** All Content-Security-Policy header values (enforced, not report-only). */
export function enforcedCspValues(ctx: RuleContext): string[] {
  const headers = docHeaders(ctx);
  return headers.getAll('content-security-policy').filter((v) => v.trim().length > 0);
}

export function reportOnlyCspValues(ctx: RuleContext): string[] {
  return docHeaders(ctx).getAll('content-security-policy-report-only');
}

/** First enforced CSP parsed, or null. */
export function firstCsp(ctx: RuleContext): ParsedCsp | null {
  const values = enforcedCspValues(ctx);
  return values.length > 0 ? parseCsp(values[0]) : null;
}

export interface CookieObservation {
  cookie: ParsedCookie;
  url: string;
}

/** All Set-Cookie headers observed for this scan, parsed. */
export function observedCookies(ctx: RuleContext): CookieObservation[] {
  const observations: CookieObservation[] = [];
  for (const entry of ctx.evidence.setCookie) {
    const cookie = parseSetCookie(entry.header);
    if (cookie) observations.push({ cookie, url: entry.url });
  }
  return observations;
}

/** CORS headers seen on any observed request (document or subresource). */
export interface CorsObservation {
  url: string;
  allowOrigin?: string;
  credentials?: boolean;
}

export function observedCors(ctx: RuleContext): CorsObservation[] {
  const result: CorsObservation[] = [];
  const push = (url: string, allowOrigin?: string | null, credentials?: boolean) => {
    if (allowOrigin === undefined || allowOrigin === null) return;
    result.push({ url, allowOrigin, credentials: credentials === true });
  };

  const doc = docHeaders(ctx);
  push(
    ctx.evidence.document.url,
    doc.get('access-control-allow-origin'),
    doc.get('access-control-allow-credentials') === 'true',
  );

  for (const request of ctx.evidence.requests ?? []) {
    if (!request.cors) continue;
    push(request.url, request.cors.allowOrigin, request.cors.credentials);
  }
  return result;
}
