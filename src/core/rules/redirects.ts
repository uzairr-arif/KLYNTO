import type { Rule } from '../models';
import { sameOrigin } from '../parser/urls';
import { safeUrlParse } from '../../shared/utils';
import { MDN_REDIRECTS } from './refs';

function renderChain(urls: string[], finalUrl: string): string {
  return [...urls, finalUrl].join('  →  ');
}

export const redirectRules: Rule[] = [
  {
    id: 'KLYNTO-RDR-001',
    moduleId: 'redirects',
    category: 'Chain',
    title: 'Redirect chain has more than two hops',
    passTitle: 'Redirect chain is short',
    severity: 'review',
    summary: 'Counts redirect hops before the final response.',
    explanation:
      'Each hop adds latency and a new server that can influence the destination. Long chains usually accrete over time (campaign URLs, old CDN rules, canonicalization).',
    impact: 'Slower loads, extra failure points, and a chain that is harder to reason about.',
    recommendation: 'Shorten the chain to a single redirect where possible.',
    references: [MDN_REDIRECTS],
    applicable: (ctx) => ctx.evidence.document.redirected,
    detect: (ctx) => {
      const hops = ctx.evidence.document.redirectChain.length;
      if (hops <= 2) return { status: 'pass' };
      return {
        status: 'fail',
        detail: `${hops} redirect hops observed.`,
        evidence: {
          detail: renderChain(
            ctx.evidence.document.redirectChain.map((h) => h.url),
            ctx.evidence.document.url,
          ),
        },
      };
    },
  },
  {
    id: 'KLYNTO-RDR-002',
    moduleId: 'redirects',
    category: 'Chain',
    title: 'Redirect chain has two hops',
    passTitle: 'At most one redirect hop',
    severity: 'info',
    summary: 'Notes two-hop redirect chains.',
    explanation:
      'Two hops are often avoidable - e.g. http://example.com → https://example.com → https://www.example.com can usually collapse to one.',
    impact: 'Minor latency and maintenance cost.',
    recommendation: 'Check whether the chain can be collapsed to a single redirect.',
    references: [MDN_REDIRECTS],
    applicable: (ctx) => ctx.evidence.document.redirected,
    detect: (ctx) => {
      const hops = ctx.evidence.document.redirectChain.length;
      if (hops === 2) {
        return {
          status: 'fail',
          detail: renderChain(
            ctx.evidence.document.redirectChain.map((h) => h.url),
            ctx.evidence.document.url,
          ),
        };
      }
      return { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-RDR-003',
    moduleId: 'redirects',
    category: 'Chain',
    title: 'Redirect chain leaves the target origin',
    passTitle: 'Redirects stay within the target origin',
    severity: 'info',
    summary: 'Detects hops that pass through a different origin than the final page.',
    explanation:
      'A hop through another origin (e.g. a link shortener or marketing tracker) means that origin controls where users land. For developer-owned chains this is normal; for untrusted links it is worth noticing.',
    impact: 'Intermediate origins can redirect anywhere, silently.',
    recommendation:
      'For first-party chains, remove intermediary origins; for external links, be aware of where they actually route.',
    references: [MDN_REDIRECTS],
    applicable: (ctx) => ctx.evidence.document.redirectChain.length > 0,
    detect: (ctx) => {
      const targetOrigin = ctx.evidence.target.origin;
      const externalHops = ctx.evidence.document.redirectChain
        .map((h) => h.url)
        .filter((url) => {
          const origin = safeUrlParse(url)?.origin;
          return origin !== undefined && !sameOrigin(url, targetOrigin);
        });
      if (externalHops.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: externalHops },
      };
    },
  },
];
