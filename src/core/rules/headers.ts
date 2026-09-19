import type { Rule } from '../models';
import { DOC_REFS } from './refs';
import { docHeaders, isHttpsDoc, isHttpDoc, isLocalDoc } from './helpers';

const HSTS_REF = {
  label: 'MDN - Strict-Transport-Security',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
};

const WEEK = 7 * 24 * 60 * 60;
const SIX_MONTHS = 180 * 24 * 60 * 60;

export const headerRules: Rule[] = [
  {
    id: 'KLYNTO-HDR-001',
    moduleId: 'headers',
    category: 'Transport',
    title: 'Strict-Transport-Security is not present',
    passTitle: 'HSTS is enabled',
    severity: 'review',
    summary: 'Checks that the response sends Strict-Transport-Security (HSTS).',
    explanation:
      'HSTS tells browsers to only reach this site over HTTPS in the future, even if a user or link tries http://. Without it, an initial plain-HTTP request can be observed or manipulated before the redirect to HTTPS happens.',
    impact:
      'The first request to this site can be downgraded to plain HTTP, which exposes the request and enables certain interception scenarios.',
    recommendation:
      'Serve the site exclusively over HTTPS, then send HSTS starting with a small max-age (for example one week) and raise it once confident.',
    fixControls: ['hsts'],
    references: [HSTS_REF, DOC_REFS],
    applicable: (ctx) => isHttpsDoc(ctx) && !isLocalDoc(ctx),
    detect: (ctx) =>
      docHeaders(ctx).has('strict-transport-security') ? { status: 'pass' } : { status: 'fail' },
  },
  {
    id: 'KLYNTO-HDR-002',
    moduleId: 'headers',
    category: 'Transport',
    title: 'HSTS max-age is short',
    passTitle: 'HSTS max-age is sufficiently long',
    severity: 'review',
    summary: 'Checks that the HSTS max-age is long enough to be effective.',
    explanation:
      'max-age defines how long the browser remembers to use HTTPS only. Values below one week are barely sticky; values below six months limit the protection benefit.',
    impact:
      'A short max-age means browsers quickly forget the HTTPS-only requirement, shrinking the window HSTS is meant to protect.',
    recommendation: 'Use max-age=15552000 (180 days) or longer, e.g. 31536000 (one year).',
    fixControls: ['hsts'],
    references: [HSTS_REF],
    applicable: (ctx) => isHttpsDoc(ctx),
    detect: (ctx) => {
      const value = docHeaders(ctx).get('strict-transport-security');
      if (!value) return null;
      const match = /max-age\s*=\s*(\d+)/i.exec(value);
      if (!match) {
        return {
          status: 'fail',
          severity: 'review',
          title: 'HSTS header has no valid max-age',
          detail: 'max-age is the required directive of Strict-Transport-Security.',
          evidence: {
            summary: 'Strict-Transport-Security could not be parsed.',
            headers: [{ name: 'Strict-Transport-Security', value }],
          },
        };
      }
      const seconds = Number.parseInt(match[1], 10);
      if (seconds < WEEK) {
        return {
          status: 'fail',
          severity: 'warning',
          title: 'HSTS max-age is very short',
          detail: `max-age is ${seconds} seconds (${Math.round(seconds / 86400)} day(s)).`,
          evidence: {
            headers: [{ name: 'Strict-Transport-Security', value }],
          },
        };
      }
      if (seconds < SIX_MONTHS) {
        return {
          status: 'fail',
          severity: 'review',
          title: 'HSTS max-age is short',
          detail: `max-age is ${seconds} seconds (${Math.round(seconds / 86400)} days). Consider 180 days or more.`,
          evidence: {
            headers: [{ name: 'Strict-Transport-Security', value }],
          },
        };
      }
      return { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-HDR-003',
    moduleId: 'headers',
    category: 'Transport',
    title: 'HSTS does not include subdomains',
    passTitle: 'HSTS covers subdomains',
    severity: 'review',
    summary: 'Checks whether HSTS also applies to subdomains.',
    explanation:
      'Without includeSubDomains, subdomains (api.example.com, staging.example.com) are not covered by the browser HTTPS-only requirement for this site.',
    impact:
      'Users can be sent to a plain-HTTP subdomain of this site, even when the main domain is well protected.',
    recommendation:
      'Add includeSubDomains once every subdomain of the site is available over HTTPS. If that is not achievable for your domain, it is acceptable to omit it - review carefully.',
    fixControls: ['hsts'],
    references: [HSTS_REF],
    applicable: (ctx) => isHttpsDoc(ctx),
    detect: (ctx) => {
      const value = docHeaders(ctx).get('strict-transport-security');
      if (!value) return null;
      return /includeSubDomains/i.test(value) ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-HDR-004',
    moduleId: 'headers',
    category: 'Transport',
    title: 'HSTS is not submitted for preloading',
    passTitle: 'HSTS includes the preload directive',
    severity: 'info',
    summary: 'Checks whether HSTS opts into browser preload lists.',
    explanation:
      'The preload directive signals intent to be included in browser-built-in HSTS lists, which protects even the very first visit. Inclusion requires submission to hstspreload.org and meeting its requirements.',
    impact:
      'Without preloading, first-time visitors can still be reached over plain HTTP before HSTS is cached.',
    recommendation:
      'If the site is fully HTTPS-only (including all subdomains), consider adding preload and submitting to hstspreload.org. This is optional and hard to reverse quickly - treat it as a commitment.',
    fixControls: ['hsts'],
    references: [HSTS_REF, { label: 'hstspreload.org', url: 'https://hstspreload.org/' }],
    applicable: (ctx) => isHttpsDoc(ctx),
    detect: (ctx) => {
      const value = docHeaders(ctx).get('strict-transport-security');
      if (!value) return null;
      return /;\s*preload/i.test(value) ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-HDR-005',
    moduleId: 'headers',
    category: 'Transport',
    title: 'HSTS sent over plain HTTP is ignored',
    passTitle: 'No HSTS header on plain HTTP responses',
    severity: 'info',
    summary: 'Detects HSTS headers on non-HTTPS responses.',
    explanation:
      'Browsers ignore Strict-Transport-Security received over unencrypted HTTP, so sending it there has no effect.',
    impact: 'No direct risk, but it signals the header may be configured at the wrong layer.',
    recommendation:
      'Send HSTS only from the HTTPS configuration (HTTPS server block/virtual host).',
    references: [HSTS_REF],
    applicable: (ctx) => isHttpDoc(ctx),
    detect: (ctx) =>
      docHeaders(ctx).has('strict-transport-security')
        ? {
            status: 'fail',
            evidence: {
              headers: docHeaders(ctx)
                .getAll('strict-transport-security')
                .map((value) => ({ name: 'Strict-Transport-Security', value })),
            },
          }
        : { status: 'pass' },
  },
  {
    id: 'KLYNTO-HDR-010',
    moduleId: 'headers',
    category: 'Content',
    title: 'Content-Security-Policy is not present',
    passTitle: 'Content-Security-Policy is present',
    severity: 'review',
    summary: 'Checks that the response sends an enforced Content-Security-Policy.',
    explanation:
      'CSP controls which resources (scripts, styles, frames, connections) the browser may load and from where. A well-tuned CSP can reduce the impact of content-injection scenarios such as XSS.',
    impact:
      'Without CSP, the browser accepts any script or resource the page references, so injected content runs with full page privileges.',
    recommendation:
      'Define a CSP appropriate for this application. Start in Report-Only mode, review violations, then enforce. Klynto’s CSP module highlights what to look at once a policy exists.',
    fixControls: ['csp'],
    references: [
      {
        label: 'MDN - Content-Security-Policy',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy',
      },
      {
        label: 'OWASP CSP Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const enforced = docHeaders(ctx).getAll('content-security-policy');
      if (enforced.some((v) => v.trim().length > 0)) return { status: 'pass' };
      const reportOnly = docHeaders(ctx).getAll('content-security-policy-report-only');
      if (reportOnly.length > 0) {
        return {
          status: 'fail',
          title: 'CSP is present only in Report-Only mode',
          detail:
            'Content-Security-Policy-Report-Only does not enforce anything - it only reports what would be blocked. Once violations are addressed, switch to the enforced header.',
          evidence: {
            headers: reportOnly.map((value) => ({
              name: 'Content-Security-Policy-Report-Only',
              value,
            })),
          },
        };
      }
      return { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-HDR-011',
    moduleId: 'headers',
    category: 'Content',
    title: 'Multiple enforced CSP headers are present',
    passTitle: 'Single enforced CSP header',
    severity: 'info',
    summary: 'Detects more than one enforced CSP header.',
    explanation:
      'When several CSP headers are sent, the browser enforces all of them simultaneously - a resource must pass every policy. Overlapping policies are a common source of "it works in my browser" surprises.',
    impact: 'Policies intersect, which can accidentally block resources you intended to allow.',
    recommendation: 'Consolidate to a single CSP header unless combining policies deliberately.',
    references: [
      {
        label: 'MDN - CSP multiple policies',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#multiple_content-security_policies',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const values = docHeaders(ctx).getAll('content-security-policy');
      if (values.length === 0) return null;
      return values.length > 1
        ? {
            status: 'fail',
            evidence: {
              headers: values.map((value) => ({ name: 'Content-Security-Policy', value })),
            },
          }
        : { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-HDR-012',
    moduleId: 'headers',
    category: 'Content',
    title: 'X-Content-Type-Options is not present',
    passTitle: 'X-Content-Type-Options: nosniff is set',
    severity: 'review',
    summary: 'Checks that responses opt out of MIME type sniffing.',
    explanation:
      'Without nosniff, browsers may guess ("sniff") a resource’s content type and interpret, say, a text file as JavaScript or HTML. With nosniff, the declared Content-Type is authoritative.',
    impact:
      'User-uploaded content served from the same origin can be executed in unexpected ways when the Content-Type is missing or wrong.',
    recommendation: 'Send X-Content-Type-Options: nosniff on all responses.',
    fixControls: ['xcto'],
    references: [
      {
        label: 'MDN - X-Content-Type-Options',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
      },
      DOC_REFS,
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('x-content-type-options');
      if (!value) return { status: 'fail' };
      if (value.trim().toLowerCase() !== 'nosniff') {
        return {
          status: 'fail',
          severity: 'warning',
          title: 'X-Content-Type-Options has an unrecognized value',
          evidence: { headers: [{ name: 'X-Content-Type-Options', value }] },
        };
      }
      return { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-HDR-013',
    moduleId: 'headers',
    category: 'Framing',
    title: 'No clickjacking protection detected',
    passTitle: 'Framing protection is present',
    severity: 'review',
    summary:
      'Checks for X-Frame-Options or a CSP frame-ancestors directive controlling who may embed this page.',
    explanation:
      'X-Frame-Options (DENY/SAMEORIGIN) and CSP frame-ancestors both control whether other sites can embed this page in a frame. Frame-based UI redressing (clickjacking) tricks users into interacting with a hidden page.',
    impact:
      'Without framing protection, this page can be embedded by third parties and overlaid with attacker-chosen UI.',
    recommendation:
      "Prefer CSP frame-ancestors (modern and more flexible); keep or add X-Frame-Options for older browsers. Use frame-ancestors 'none' (or X-Frame-Options: DENY) for pages that are never meant to be framed.",
    fixControls: ['frame'],
    references: [
      {
        label: 'MDN - X-Frame-Options',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      },
      {
        label: 'MDN - CSP frame-ancestors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors',
      },
      DOC_REFS,
    ],
    applicable: () => true,
    detect: (ctx) => {
      const headers = docHeaders(ctx);
      const xfo = headers.get('x-frame-options');
      const cspValues = headers.getAll('content-security-policy');
      const hasFrameAncestors = cspValues.some((v) => /(?:^|;)\s*frame-ancestors\s/i.test(v));
      if (hasFrameAncestors || xfo) return { status: 'pass' };
      return { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-HDR-014',
    moduleId: 'headers',
    category: 'Framing',
    title: 'X-Frame-Options uses a deprecated or invalid value',
    passTitle: 'X-Frame-Options value is valid',
    severity: 'warning',
    summary: 'Validates the X-Frame-Options value.',
    explanation:
      'X-Frame-Options only supports DENY and SAMEORIGIN. ALLOW-FROM is obsolete and ignored by modern browsers.',
    impact:
      'An ignored value provides no framing protection and may mislead developers into thinking embedding is controlled.',
    recommendation:
      'Use DENY or SAMEORIGIN, and prefer CSP frame-ancestors for fine-grained control.',
    fixControls: ['frame'],
    references: [
      {
        label: 'MDN - X-Frame-Options',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('x-frame-options');
      if (!value) return null;
      const normalized = value.trim().toUpperCase();
      if (normalized === 'DENY' || normalized === 'SAMEORIGIN') return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'X-Frame-Options', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-HDR-015',
    moduleId: 'headers',
    category: 'Privacy',
    title: 'Referrer-Policy is not present',
    passTitle: 'Referrer-Policy is present',
    severity: 'review',
    summary: 'Checks that the response declares a referrer policy.',
    explanation:
      'The referrer policy controls how much of the current URL is shared with other sites via the Referer header when users navigate away or load cross-origin resources.',
    impact:
      'Without a policy, browsers apply their default (strict-origin-when-cross-origin), but paths and query strings can still leak to same-origin-downgraded or explicit situations, and behavior differs between contexts.',
    recommendation:
      'Declare Referrer-Policy explicitly - strict-origin-when-cross-origin is a sensible default; use no-referrer for privacy-sensitive pages.',
    fixControls: ['referrer'],
    references: [
      {
        label: 'MDN - Referrer-Policy',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
      },
      DOC_REFS,
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('referrer-policy');
      if (!value) return { status: 'fail' };
      const policies = value
        .toLowerCase()
        .split(',')
        .map((p) => p.trim());
      if (policies.includes('unsafe-url')) {
        return {
          status: 'fail',
          severity: 'warning',
          title: 'Referrer-Policy allows full URL leakage',
          detail:
            'unsafe-url sends the full URL (minus fragment) even to less secure destinations.',
          evidence: { headers: [{ name: 'Referrer-Policy', value }] },
        };
      }
      if (policies.includes('no-referrer-when-downgrade')) {
        return {
          status: 'fail',
          severity: 'info',
          title: 'Referrer-Policy uses the legacy default',
          detail:
            'This was the historic default. Modern browsers default to strict-origin-when-cross-origin - declare it explicitly to be deterministic.',
          evidence: { headers: [{ name: 'Referrer-Policy', value }] },
        };
      }
      return { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-HDR-016',
    moduleId: 'headers',
    category: 'Privacy',
    title: 'Permissions-Policy is not present',
    passTitle: 'Permissions-Policy is present',
    severity: 'info',
    summary: 'Checks whether the response declares a Permissions-Policy.',
    explanation:
      'Permissions-Policy lets a site declare which browser features (camera, microphone, geolocation, etc.) the site itself and any embedded content are allowed to use.',
    impact:
      'Without a policy, embedded third-party content may request powerful features from the user if the embedding chain permits it.',
    recommendation:
      'Deny features the application does not use, e.g. Permissions-Policy: camera=(), microphone=(), geolocation=().',
    fixControls: ['permissions-policy'],
    references: [
      {
        label: 'MDN - Permissions-Policy',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
      },
    ],
    applicable: () => true,
    detect: (ctx) =>
      docHeaders(ctx).has('permissions-policy') ? { status: 'pass' } : { status: 'fail' },
  },
  {
    id: 'KLYNTO-HDR-017',
    moduleId: 'headers',
    category: 'Privacy',
    title: 'Permissions-Policy grants sensitive features broadly',
    passTitle: 'Sensitive features are not broadly granted',
    severity: 'warning',
    summary:
      'Detects wildcard grants for sensitive features such as camera, microphone or geolocation.',
    explanation:
      'A directive like camera=* allows every origin - including embedded third parties - to use the feature, subject to browser permission prompts.',
    impact:
      'Broad grants enlarge the attack surface: any embedded content can request powerful device features.',
    recommendation:
      'Grant features explicitly to the origins that need them, or deny them with camera=().',
    fixControls: ['permissions-policy'],
    references: [
      {
        label: 'MDN - Permissions-Policy',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('permissions-policy');
      if (!value) return null;
      const sensitive = ['camera', 'microphone', 'geolocation', 'usb', 'serial'];
      const broad = sensitive.filter((feature) => {
        const re = new RegExp(`(?:^|,)\\s*${feature}\\s*=\\s*\\*`, 'i');
        return re.test(value);
      });
      if (broad.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        detail: `Granted to all origins: ${broad.join(', ')}.`,
        evidence: { headers: [{ name: 'Permissions-Policy', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-HDR-018',
    moduleId: 'headers',
    category: 'Legacy',
    title: 'X-XSS-Protection is present (header is obsolete)',
    passTitle: 'No obsolete X-XSS-Protection header',
    severity: 'info',
    summary: 'Detects the legacy X-XSS-Protection header.',
    explanation:
      'X-XSS-Protection configured the XSS Auditor, which modern browsers have removed. The header has no effect in current browsers; setting X-XSS-Protection: 0 is recommended to disable legacy auditor behavior consistently.',
    impact: 'No protective value in modern browsers; it can mislead teams into relying on it.',
    recommendation:
      'Remove the header (or set it to 0) and rely on CSP and output encoding instead.',
    fixControls: ['remove-obsolete'],
    references: [
      {
        label: 'MDN - X-XSS-Protection',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection',
      },
      DOC_REFS,
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('x-xss-protection');
      if (!value) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'X-XSS-Protection', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-HDR-019',
    moduleId: 'headers',
    category: 'Legacy',
    title: 'Expect-CT is present (header is retired)',
    passTitle: 'No retired Expect-CT header',
    severity: 'info',
    summary: 'Detects the retired Expect-CT header.',
    explanation:
      'Expect-CT once allowed sites to report or enforce Certificate Transparency compliance. The mechanism has been retired: Chrome enforces CT requirements by default.',
    impact: 'None in modern browsers; the header is dead weight.',
    recommendation: 'Remove Expect-CT from your server configuration.',
    fixControls: ['remove-obsolete'],
    references: [
      {
        label: 'MDN - Expect-CT (deprecated)',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expect-CT',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('expect-ct');
      if (!value) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'Expect-CT', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-HDR-020',
    moduleId: 'headers',
    category: 'Legacy',
    title: 'X-UA-Compatible is present (header is obsolete)',
    passTitle: 'No obsolete X-UA-Compatible header',
    severity: 'info',
    summary: 'Detects the legacy X-UA-Compatible header.',
    explanation:
      'X-UA-Compatible was used by legacy Internet Explorer to pick a rendering mode. No current browser uses it.',
    impact: 'None in modern browsers; noise in responses.',
    recommendation: 'Remove the header from your server or framework configuration.',
    fixControls: ['remove-obsolete'],
    references: [DOC_REFS],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('x-ua-compatible');
      if (!value) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'X-UA-Compatible', value }] },
      };
    },
  },
];
