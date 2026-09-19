import { safeUrlParse } from '../../shared/utils';

export type SameSiteValue = 'strict' | 'lax' | 'none';

export interface ParsedCookie {
  raw: string;
  name: string;
  value: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: SameSiteValue;
  /** Domain attribute as specified (lowercased), if present. */
  domain?: string;
  /** Path attribute as specified, if present. */
  path?: string;
  /** Expires attribute parsed to epoch ms, if valid. */
  expires?: number;
  /** Max-Age attribute in seconds, if valid. */
  maxAge?: number;
  partitioned: boolean;
  /** No Expires and no Max-Age → session cookie. */
  isSession: boolean;
}

export function parseSetCookie(raw: string): ParsedCookie | null {
  const trimmed = raw.trim();
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const name = trimmed.slice(0, eq).trim();
  if (!name) return null;
  const rest = trimmed.slice(eq + 1);
  const firstSemicolon = rest.indexOf(';');
  const value = (firstSemicolon === -1 ? rest : rest.slice(0, firstSemicolon)).trim();

  const cookie: ParsedCookie = {
    raw,
    name,
    value,
    secure: false,
    httpOnly: false,
    partitioned: false,
    isSession: true,
  };

  const attributePart = firstSemicolon === -1 ? '' : rest.slice(firstSemicolon + 1);
  for (const attr of attributePart.split(';')) {
    const attrTrimmed = attr.trim();
    if (!attrTrimmed) continue;
    const attrEq = attrTrimmed.indexOf('=');
    const attrName = (attrEq === -1 ? attrTrimmed : attrTrimmed.slice(0, attrEq))
      .trim()
      .toLowerCase();
    const attrValue = attrEq === -1 ? '' : attrTrimmed.slice(attrEq + 1).trim();

    switch (attrName) {
      case 'secure':
        cookie.secure = true;
        break;
      case 'httponly':
        cookie.httpOnly = true;
        break;
      case 'partitioned':
        cookie.partitioned = true;
        break;
      case 'samesite': {
        const v = attrValue.toLowerCase();
        if (v === 'strict' || v === 'lax' || v === 'none') cookie.sameSite = v;
        break;
      }
      case 'domain':
        if (attrValue) cookie.domain = attrValue.toLowerCase().replace(/^\./, '');
        break;
      case 'path':
        if (attrValue) cookie.path = attrValue;
        break;
      case 'max-age': {
        const seconds = Number.parseInt(attrValue, 10);
        if (Number.isFinite(seconds)) {
          cookie.maxAge = seconds;
          cookie.isSession = false;
        }
        break;
      }
      case 'expires': {
        const parsed = Date.parse(attrValue);
        if (Number.isFinite(parsed)) {
          cookie.expires = parsed;
          cookie.isSession = false;
        }
        break;
      }
      default:
        break;
    }
  }

  return cookie;
}

/** Names that typically hold session identifiers or auth material. */
const SESSION_NAME_HINTS = [
  'sess',
  'session',
  'auth',
  'token',
  'jwt',
  'sid',
  'login',
  'csrf',
  'xsrf',
  'remember',
  'api_key',
  'apikey',
];

/** Heuristic: does this cookie name look like it carries session/auth data? */
export function looksLikeSessionName(name: string): boolean {
  const lower = name.toLowerCase();
  return SESSION_NAME_HINTS.some((hint) => lower.includes(hint));
}

/** Long-lived threshold: cookies valid for more than a year. */
export const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function isLongLived(cookie: ParsedCookie): boolean {
  if (cookie.maxAge !== undefined) return cookie.maxAge > ONE_YEAR_SECONDS;
  if (cookie.expires !== undefined) {
    return cookie.expires - Date.now() > ONE_YEAR_SECONDS * 1000;
  }
  return false;
}

/** Cookie host the attribute effectively applies to (best effort). */
export function cookieDomainFor(cookie: ParsedCookie, responseUrl: string): string {
  if (cookie.domain) return cookie.domain;
  const url = safeUrlParse(responseUrl);
  return url ? url.hostname.toLowerCase() : '';
}
