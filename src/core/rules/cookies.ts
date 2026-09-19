import type { Reference, Rule } from '../models';
import { isLongLived, looksLikeSessionName } from '../parser/cookie';
import { observedCookies, isHttpDoc, type CookieObservation } from './helpers';
import { MDN_SET_COOKIE } from './refs';
import { parentDomains, safeUrlParse } from '../../shared/utils';

const COOKIE_PREFIXES_REF: Reference = {
  label: 'MDN - Cookie name prefixes',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_name_prefixes',
};

function describe(observation: CookieObservation): string {
  const cookie = observation.cookie;
  const url = safeUrlParse(observation.url);
  const host = url ? url.hostname : observation.url;
  const attrs = [
    cookie.secure ? 'Secure' : 'no Secure',
    cookie.httpOnly ? 'HttpOnly' : 'no HttpOnly',
    cookie.sameSite ? `SameSite=${cookie.sameSite}` : 'no SameSite',
  ].join(', ');
  return `${cookie.name} @ ${host} (${attrs})`;
}

export const cookieRules: Rule[] = [
  {
    id: 'KLYNTO-CKI-001',
    moduleId: 'cookies',
    category: 'Attributes',
    title: 'Cookies are set without the Secure attribute',
    passTitle: 'All observed cookies are marked Secure',
    severity: 'review',
    summary: 'Checks that Set-Cookie includes the Secure attribute.',
    explanation:
      'The Secure attribute restricts the cookie to HTTPS connections. Without it, the cookie may also be transmitted over plain HTTP if such a request occurs for the same domain.',
    impact: 'Session material could be exposed over an unencrypted connection.',
    recommendation: 'Set Secure on every cookie (and redirect HTTP to HTTPS).',
    fixControls: ['cookie-secure'],
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const insecure = cookies.filter((c) => !c.cookie.secure);
      if (insecure.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: insecure.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-002',
    moduleId: 'cookies',
    category: 'Attributes',
    title: 'Session-like cookies are set without HttpOnly',
    passTitle: 'Session-like cookies are HttpOnly',
    severity: 'review',
    summary:
      'Checks HttpOnly on cookies whose names look like session or authentication identifiers.',
    explanation:
      'HttpOnly hides the cookie from JavaScript (document.cookie). For session identifiers this blocks one common exfiltration path during XSS scenarios.',
    impact: 'Session material readable by page scripts can be stolen in injection scenarios.',
    recommendation:
      'Set HttpOnly on session/auth cookies. Cookies that must be read by the app in the browser (non-sensitive UI state) may stay script-accessible.',
    fixControls: ['cookie-httponly'],
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const missing = cookies.filter(
        (c) => !c.cookie.httpOnly && looksLikeSessionName(c.cookie.name),
      );
      if (missing.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: missing.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-003',
    moduleId: 'cookies',
    category: 'Attributes',
    title: 'SameSite=None is combined with missing Secure',
    passTitle: 'SameSite=None cookies are Secure',
    severity: 'warning',
    summary: 'Detects SameSite=None cookies without the Secure attribute.',
    explanation:
      'SameSite=None permits cross-site sending but requires Secure. Modern browsers reject None cookies that lack Secure, so the cookie will not work as intended - and the intent itself (cross-site availability) deserves review.',
    impact: 'The cookie is discarded by modern browsers; functionality silently breaks.',
    recommendation:
      'Use Secure with SameSite=None, or pick Lax/Strict which fits most first-party flows.',
    fixControls: ['cookie-samesite', 'cookie-secure'],
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const flagged = cookies.filter((c) => c.cookie.sameSite === 'none' && !c.cookie.secure);
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-004',
    moduleId: 'cookies',
    category: 'Attributes',
    title: 'Cookies are set without an explicit SameSite',
    passTitle: 'All cookies declare SameSite explicitly',
    severity: 'info',
    summary: 'Detects Set-Cookie without a SameSite attribute.',
    explanation:
      'Without SameSite, browsers default to Lax. That is usually reasonable, but explicit declarations make cross-site behavior deterministic across browsers and contexts.',
    impact:
      'Implicit behavior differences can surface as CSRF-adjacent surprises or integration breakage.',
    recommendation: 'Declare SameSite=Lax (or Strict/None deliberately) on every cookie.',
    fixControls: ['cookie-samesite'],
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const missing = cookies.filter((c) => !c.cookie.sameSite);
      if (missing.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: missing.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-005',
    moduleId: 'cookies',
    category: 'Scope',
    title: 'Cookies use a broad Domain attribute',
    passTitle: 'No unnecessarily broad cookie domains',
    severity: 'info',
    summary: 'Detects cookies scoped wider than the host that set them.',
    explanation:
      'A Domain attribute (e.g. Domain=example.com set by api.example.com) shares the cookie with every subdomain. Each subdomain that can set or read the cookie enlarges its exposure.',
    impact: 'A compromise of any subdomain yields the cookie.',
    recommendation:
      'Only set Domain when subdomains genuinely need the cookie; otherwise use a host-only cookie.',
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const broad = cookies.filter((c) => {
        if (!c.cookie.domain) return false;
        const host = safeUrlParse(c.url)?.hostname.toLowerCase() ?? '';
        if (!host) return false;
        return c.cookie.domain !== host && parentDomains(host).includes(c.cookie.domain);
      });
      if (broad.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: broad.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-006',
    moduleId: 'cookies',
    category: 'Prefixes',
    title: '__Host- cookie violates its required attributes',
    passTitle: '__Host- cookies are correctly configured',
    severity: 'warning',
    summary: 'Validates the __Host- prefix contract.',
    explanation:
      'Cookies named __Host-… must be Secure, have no Domain attribute, and Path=/. Browsers reject them otherwise - so a broken prefix means the cookie never gets set, or the name misuses the security signal.',
    impact:
      'Authentication relying on the cookie can silently fail, or the protection intent is lost.',
    recommendation: 'Set __Host- cookies with Secure, Path=/ and no Domain attribute.',
    references: [COOKIE_PREFIXES_REF, MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const broken = cookies.filter((c) => {
        if (!c.cookie.name.startsWith('__Host-')) return false;
        return !c.cookie.secure || c.cookie.domain !== undefined || c.cookie.path !== '/';
      });
      if (broken.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: broken.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-007',
    moduleId: 'cookies',
    category: 'Prefixes',
    title: '__Secure- cookie is set without Secure',
    passTitle: '__Secure- cookies are Secure',
    severity: 'warning',
    summary: 'Validates the __Secure- prefix contract.',
    explanation:
      'Cookies named __Secure-… must carry the Secure attribute; browsers reject them otherwise, defeating the purpose of the prefix.',
    impact: 'The cookie is not set at all by conforming browsers.',
    recommendation: 'Add the Secure attribute or rename the cookie without the prefix.',
    references: [COOKIE_PREFIXES_REF, MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const broken = cookies.filter(
        (c) => c.cookie.name.startsWith('__Secure-') && !c.cookie.secure,
      );
      if (broken.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: broken.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-008',
    moduleId: 'cookies',
    category: 'Lifetime',
    title: 'Session-like cookie lives longer than a year',
    passTitle: 'No overly long-lived session cookies',
    severity: 'info',
    summary: 'Detects very long expiries on session-like cookie names.',
    explanation:
      'A cookie whose name suggests session/auth material but which lives for over a year extends the time a stolen value remains valid (unless the server rotates it).',
    impact: 'Long-lived stolen session material is more valuable to an attacker.',
    recommendation:
      'Keep long expiries for "remember me" flows deliberate; rotate the underlying token server-side.',
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies,
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      const longLived = cookies.filter(
        (c) => isLongLived(c.cookie) && looksLikeSessionName(c.cookie.name),
      );
      if (longLived.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: longLived.map(describe) },
      };
    },
  },
  {
    id: 'KLYNTO-CKI-009',
    moduleId: 'cookies',
    category: 'Transport',
    title: 'Cookies are set over an unencrypted connection',
    passTitle: 'No cookies over plain HTTP',
    severity: 'warning',
    summary: 'Detects Set-Cookie on plain-HTTP responses.',
    explanation:
      'Cookies received over HTTP can be read and modified by anyone on the path, regardless of their other attributes.',
    impact: 'Session material is exposed in transit.',
    recommendation: 'Serve over HTTPS and redirect HTTP traffic.',
    fixControls: ['https-redirect', 'cookie-secure'],
    references: [MDN_SET_COOKIE],
    applicable: (ctx) => ctx.analyzeCookies && isHttpDoc(ctx),
    detect: (ctx) => {
      const cookies = observedCookies(ctx);
      if (cookies.length === 0) return null;
      return {
        status: 'fail',
        evidence: { items: cookies.map(describe) },
      };
    },
  },
];
