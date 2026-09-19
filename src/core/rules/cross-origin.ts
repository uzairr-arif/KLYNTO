import type { Rule } from '../models';
import { docHeaders, isHttpsDoc, isLocalDoc } from './helpers';
import { MDN_COEP, MDN_COOP, MDN_CORP } from './refs';

export const crossOriginRules: Rule[] = [
  {
    id: 'KLYNTO-XOR-001',
    moduleId: 'cross-origin',
    category: 'Isolation',
    title: 'Cross-Origin-Opener-Policy is not present',
    passTitle: 'Cross-Origin-Opener-Policy is present',
    severity: 'review',
    summary: 'Checks that documents declare a COOP policy.',
    explanation:
      'COOP controls whether your document is placed into a browsing context group separate from other sites. Without it, windows/opener relationships with other origins stay open (window.opener), which is the base of tabnabbing-style attacks and blocks process-level isolation.',
    impact:
      'Third-party pages that open your site (or vice versa) keep references to each other, enabling reverse tabnabbing and weakening isolation.',
    recommendation:
      'Send Cross-Origin-Opener-Policy: same-origin (or same-origin-allow-popups when needed).',
    fixControls: ['coop'],
    references: [MDN_COOP],
    applicable: (ctx) => isHttpsDoc(ctx) && !isLocalDoc(ctx),
    detect: (ctx) =>
      docHeaders(ctx).has('cross-origin-opener-policy') ? { status: 'pass' } : { status: 'fail' },
  },
  {
    id: 'KLYNTO-XOR-002',
    moduleId: 'cross-origin',
    category: 'Isolation',
    title: 'COOP is set to unsafe-none',
    passTitle: 'COOP does not disable isolation',
    severity: 'info',
    summary: 'Detects COOP: unsafe-none.',
    explanation:
      'unsafe-none is the default behavior (no opener isolation) made explicit. If the site does not need popups/opener relationships, same-origin gives you isolation for free.',
    impact: 'The document deliberately forgoes opener isolation.',
    recommendation:
      'Use same-origin, or same-origin-allow-popups if the site relies on opener communication with same-origin popups.',
    fixControls: ['coop'],
    references: [MDN_COOP],
    applicable: (ctx) => isHttpsDoc(ctx),
    detect: (ctx) => {
      const value = docHeaders(ctx).get('cross-origin-opener-policy');
      if (!value) return null;
      const normalized = value.trim().toLowerCase();
      if (normalized === 'unsafe-none') return { status: 'fail' };
      return { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-XOR-003',
    moduleId: 'cross-origin',
    category: 'Isolation',
    title: 'Cross-Origin-Embedder-Policy is not present',
    passTitle: 'Cross-Origin-Embedder-Policy is present',
    severity: 'info',
    summary: 'Checks whether the document opts into embedder requirements.',
    explanation:
      'COEP (require-corp or credentialless) is required for cross-origin isolation - needed for SharedArrayBuffer, high-resolution timers and other powerful APIs. It also protects the page against Spectre-style side channels via process isolation.',
    impact:
      'Without COEP the document cannot opt into full cross-origin isolation (and its protective side effects).',
    recommendation:
      'Only meaningful together with COOP: if you adopt it, subresources must send CORP/CORS headers. Evaluate deliberately - it can break third-party embeds.',
    fixControls: ['coep'],
    references: [MDN_COEP, MDN_CORP],
    applicable: (ctx) => isHttpsDoc(ctx) && !isLocalDoc(ctx),
    detect: (ctx) =>
      docHeaders(ctx).has('cross-origin-embedder-policy') ? { status: 'pass' } : { status: 'fail' },
  },
  {
    id: 'KLYNTO-XOR-004',
    moduleId: 'cross-origin',
    category: 'Isolation',
    title: 'Cross-origin isolation is not fully enabled',
    passTitle: 'Cross-origin isolation is enabled',
    severity: 'info',
    summary: 'Summarizes COOP+COEP isolation status.',
    explanation:
      'Full cross-origin isolation requires COOP: same-origin AND a COEP policy. Partial setups keep opener or embedding channels open.',
    impact: 'Isolation-gated APIs stay unavailable and side-channel hardening is not applied.',
    recommendation:
      'If the application needs isolation (SharedArrayBuffer, precision timers), ship COOP: same-origin plus COEP: require-corp (or credentialless) and make subresources CORS/CORP-compatible.',
    fixControls: ['coop', 'coep'],
    references: [
      MDN_COOP,
      MDN_COEP,
      {
        label: 'MDN - Cross-origin isolation',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/crossOriginIsolated',
      },
    ],
    applicable: (ctx) => isHttpsDoc(ctx) && !isLocalDoc(ctx),
    detect: (ctx) => {
      const headers = docHeaders(ctx);
      const coop = headers.get('cross-origin-opener-policy');
      const coep = headers.get('cross-origin-embedder-policy');
      const isolated =
        coop?.trim().toLowerCase() === 'same-origin' &&
        (coep?.trim().toLowerCase() === 'require-corp' ||
          coep?.trim().toLowerCase() === 'credentialless');
      if (isolated) return { status: 'pass' };
      return {
        status: 'fail',
        detail: `COOP: ${coop ?? 'missing'}, COEP: ${coep ?? 'missing'}.`,
      };
    },
  },
];
