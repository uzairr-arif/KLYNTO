import type { Rule } from '../models';
import { docHeaders, isHttpDoc, isLocalDoc, isHttpsDoc } from './helpers';
import { isLocalTarget } from '../parser/urls';
import { safeUrlParse } from '../../shared/utils';
import { MDN_MIXED_CONTENT, MDN_REDIRECTS } from './refs';

const HSTS_REF = {
  label: 'MDN - Strict-Transport-Security',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
};

export const transportRules: Rule[] = [
  {
    id: 'KLYNTO-TRN-001',
    moduleId: 'transport',
    category: 'Encryption',
    title: 'Page is served over plain HTTP',
    passTitle: 'Page is served over HTTPS',
    severity: 'high',
    summary: 'Checks that the page itself is loaded over HTTPS.',
    explanation:
      'Plain HTTP traffic can be read and modified by anyone on the network path: content can be injected, cookies intercepted, and responses manipulated.',
    impact: 'All page content and interactions are exposed in transit.',
    recommendation: 'Serve the site over HTTPS and redirect HTTP requests to HTTPS (301/308).',
    fixControls: ['https-redirect'],
    references: [
      HSTS_REF,
      {
        label: 'MDN - Why HTTPS matters',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
      },
    ],
    applicable: (ctx) => isHttpDoc(ctx),
    detect: (ctx) => {
      if (!isLocalDoc(ctx)) return { status: 'fail' };
      return {
        status: 'fail',
        severity: 'info',
        title: 'Development server is using HTTP',
        detail:
          'This is a local/private address, so this is expected during development. Check that your production deployment is HTTPS-only.',
      };
    },
  },
  {
    id: 'KLYNTO-TRN-002',
    moduleId: 'transport',
    category: 'Encryption',
    title: 'Redirect chain downgrades from HTTPS to HTTP',
    passTitle: 'No HTTPS → HTTP downgrades in the chain',
    severity: 'high',
    summary: 'Inspects redirect hops for HTTPS → HTTP transitions.',
    explanation:
      'A redirect from an HTTPS URL to an HTTP URL sends the user to an unencrypted origin - everything after the hop is exposed.',
    impact: 'The protected start of the chain is wasted; the final hop is fully exposed.',
    recommendation: 'Redirect to the HTTPS version and keep every subsequent hop on HTTPS.',
    fixControls: ['https-redirect'],
    references: [MDN_REDIRECTS],
    applicable: (ctx) => ctx.evidence.document.redirectChain.length > 0,
    detect: (ctx) => {
      const chain = ctx.evidence.document.redirectChain;
      const downgrades: string[] = [];
      for (let i = 0; i < chain.length; i++) {
        const hop = chain[i];
        const nextUrl = i + 1 < chain.length ? chain[i + 1].url : ctx.evidence.document.url;
        const from = safeUrlParse(hop.url);
        const to = safeUrlParse(nextUrl);
        if (from?.protocol === 'https:' && to?.protocol === 'http:') {
          downgrades.push(`${hop.url} → ${nextUrl}`);
        }
      }
      if (downgrades.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: downgrades },
      };
    },
  },
  {
    id: 'KLYNTO-TRN-003',
    moduleId: 'transport',
    category: 'Encryption',
    title: 'Mixed content: insecure subresources on an HTTPS page',
    passTitle: 'No insecure subresources observed',
    severity: 'warning',
    summary: 'Counts subresources loaded over http:// while the page is HTTPS.',
    explanation:
      'Loading scripts, styles or other active content over plain HTTP inside an HTTPS page undermines the page’s transport protection; browsers block some of it, but not every resource type.',
    impact: 'Injected or manipulated insecure subresources run with page privileges.',
    recommendation:
      'Load every subresource over HTTPS (or protocol-relative from HTTPS-only hosts) and audit legacy references.',
    references: [MDN_MIXED_CONTENT],
    applicable: (ctx) => isHttpsDoc(ctx),
    detect: (ctx) => {
      const { insecure, insecureUrls } = ctx.evidence.subresources;
      if (insecure === 0) return { status: 'pass' };
      return {
        status: 'fail',
        detail: `${insecure} insecure subresource(s) observed.`,
        evidence: {
          items: insecureUrls.slice(0, 10),
        },
      };
    },
  },
  {
    id: 'KLYNTO-TRN-004',
    moduleId: 'transport',
    category: 'Redirects',
    title: 'HTTP → HTTPS redirect uses a temporary status',
    passTitle: 'HTTP → HTTPS redirect is permanent',
    severity: 'info',
    summary: 'Checks the status of the http → https hop.',
    explanation:
      'A permanent redirect (301/308) lets browsers and search engines cache the HTTPS destination. Temporary redirects (302/307) re-request the HTTP URL every time, keeping the downgrade-first pattern alive.',
    impact: 'Visitors keep hitting the insecure first hop indefinitely.',
    recommendation:
      'Use 301 (or 308 when preserving the method matters) for HTTP → HTTPS redirects.',
    fixControls: ['https-redirect'],
    references: [MDN_REDIRECTS],
    applicable: (ctx) =>
      ctx.evidence.document.redirected && ctx.evidence.document.redirectChain.length > 0,
    detect: (ctx) => {
      const chain = ctx.evidence.document.redirectChain;
      const firstHop = chain[0];
      const nextUrl = chain.length > 1 ? chain[1].url : ctx.evidence.document.url;
      const from = safeUrlParse(firstHop.url);
      const to = safeUrlParse(nextUrl);
      if (from?.protocol !== 'http:' || to?.protocol !== 'https:') {
        return null;
      }
      if (firstHop.status === 301 || firstHop.status === 308) return { status: 'pass' };
      return {
        status: 'fail',
        detail: `The http → https hop returned ${firstHop.status}.`,
      };
    },
  },
  {
    id: 'KLYNTO-TRN-005',
    moduleId: 'transport',
    category: 'Encryption',
    title: 'HSTS is absent while the site redirects to HTTPS',
    passTitle: 'HTTPS redirect is backed by HSTS',
    severity: 'info',
    summary: 'Notes a missing HSTS header on sites that clearly intend HTTPS.',
    explanation:
      'The redirect chain shows the site wants HTTPS-only, but without HSTS the initial request is still exposed and repeat-downgrades are possible.',
    impact: 'First-visit and link-following requests can be downgraded.',
    recommendation: 'Send Strict-Transport-Security from the HTTPS configuration.',
    fixControls: ['hsts'],
    references: [HSTS_REF],
    applicable: (ctx) => isHttpsDoc(ctx) && !isLocalTarget(ctx.evidence.target),
    detect: (ctx) => {
      const hasHsts = docHeaders(ctx).has('strict-transport-security');
      // Did the chain upgrade http → https?
      const urls = [
        ...ctx.evidence.document.redirectChain.map((h) => h.url),
        ctx.evidence.document.url,
      ];
      let upgrades = false;
      for (let i = 0; i < urls.length - 1; i++) {
        const from = safeUrlParse(urls[i]);
        const to = safeUrlParse(urls[i + 1]);
        if (from?.protocol === 'http:' && to?.protocol === 'https:') upgrades = true;
      }
      if (!hasHsts && upgrades) return { status: 'fail' };
      return null;
    },
  },
];
