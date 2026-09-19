import type { Rule } from '../models';
import { observedCors } from './helpers';
import { MDN_ACAO, MDN_CORS } from './refs';

export const corsRules: Rule[] = [
  {
    id: 'KLYNTO-CRS-001',
    moduleId: 'cors',
    category: 'Credentials',
    title: 'CORS combines wildcard origin with credentials',
    passTitle: 'No wildcard + credentials CORS combination',
    severity: 'high',
    summary: 'Detects Access-Control-Allow-Origin: * together with Allow-Credentials: true.',
    explanation:
      'The CORS specification forbids combining a wildcard origin with credentialed requests. Browsers reject this combination - and servers that hand-roll CORS logic sometimes "fix" it by reflecting the request origin, which is the dangerous pattern.',
    impact:
      'Signals a misconfigured CORS implementation; the next step is often origin reflection, which exposes credentialed responses to other sites.',
    recommendation:
      'Allow a concrete origin allowlist and echo the matching origin, or drop credentials from cross-origin access.',
    references: [MDN_ACAO, MDN_CORS],
    applicable: (ctx) => ctx.analyzeCors,
    detect: (ctx) => {
      const flagged = observedCors(ctx).filter((c) => c.allowOrigin === '*' && c.credentials);
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged.map((c) => `${c.url} → ACAO: * with credentials`) },
      };
    },
  },
  {
    id: 'KLYNTO-CRS-002',
    moduleId: 'cors',
    category: 'Credentials',
    title: 'CORS allows credentialed access from a specific origin',
    passTitle: 'No credentialed cross-origin access observed',
    severity: 'review',
    summary:
      'Detects Allow-Credentials: true with a non-wildcard origin - review whether that origin is meant to have credentialed access.',
    explanation:
      'A specific origin combined with credentials means that site can make requests carrying cookies/auth headers and read the responses. This is legitimate for first-party integrations (e.g. app.example.com → api.example.com) but wrong when the origin is unexpected.',
    impact: 'An overly broad allowlist exposes authenticated responses to third parties.',
    recommendation:
      'Verify every origin in the allowlist is first-party or a trusted integration. Keep the list as narrow as possible.',
    references: [MDN_ACAO, MDN_CORS],
    applicable: (ctx) => ctx.analyzeCors,
    detect: (ctx) => {
      const flagged = observedCors(ctx).filter(
        (c) => c.credentials && c.allowOrigin !== '*' && c.allowOrigin !== 'null',
      );
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged.map((c) => `${c.url} → ACAO: ${c.allowOrigin} + credentials`) },
      };
    },
  },
  {
    id: 'KLYNTO-CRS-003',
    moduleId: 'cors',
    category: 'Exposure',
    title: 'CORS exposes sensitive response headers',
    passTitle: 'No sensitive headers exposed via CORS',
    severity: 'review',
    summary: 'Detects Access-Control-Expose-Headers listing sensitive header names.',
    explanation:
      'Expose-Headers makes listed response headers readable by cross-origin JavaScript. Exposing Set-Cookie, Authorization or similar is almost never intended.',
    impact: 'Cross-origin scripts can read header values that are otherwise browser-protected.',
    recommendation: 'Expose only custom headers an integration actually needs (e.g. X-Request-Id).',
    references: [MDN_CORS],
    applicable: (ctx) => ctx.analyzeCors,
    detect: (ctx) => {
      // Expose-Headers appears on document/subresource responses; check the
      // observed CORS-bearing responses via their summaries is not enough - 
      // read raw headers from requests is not retained, so this rule checks
      // the document plus per-request cors summaries captured by the monitor.
      const sensitive = ['set-cookie', 'authorization', 'cookie'];
      const flagged: string[] = [];
      const doc = ctx.evidence.document.headers.find(
        (h) => h.name.toLowerCase() === 'access-control-expose-headers',
      );
      if (doc) {
        const names = doc.value
          .toLowerCase()
          .split(',')
          .map((s) => s.trim());
        const hit = names.filter((n) => sensitive.includes(n));
        if (hit.length > 0) flagged.push(`${ctx.evidence.document.url}: ${hit.join(', ')}`);
      }
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged },
      };
    },
  },
  {
    id: 'KLYNTO-CRS-004',
    moduleId: 'cors',
    category: 'Policy',
    title: 'CORS allows any origin (wildcard)',
    passTitle: 'No wildcard CORS origins observed',
    severity: 'info',
    summary: 'Notes responses with Access-Control-Allow-Origin: *.',
    explanation:
      'A wildcard origin allows any website to read non-credentialed responses. For genuinely public data (public APIs, CDN assets) this is normal and fine. For endpoints that mix in user-specific data it deserves a second look.',
    impact:
      'Without credentials, exposure is limited to public data - but verify the endpoint truly has none.',
    recommendation:
      'Keep wildcards for public data only; user-specific endpoints should use explicit origins.',
    references: [MDN_ACAO, MDN_CORS],
    applicable: (ctx) => ctx.analyzeCors,
    detect: (ctx) => {
      const flagged = observedCors(ctx).filter((c) => c.allowOrigin === '*');
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged.map((c) => `${c.url} → ACAO: *`) },
      };
    },
  },
  {
    id: 'KLYNTO-CRS-005',
    moduleId: 'cors',
    category: 'Policy',
    title: 'CORS echoes an unrecognized origin (reflection)',
    passTitle: 'No origin reflection observed',
    severity: 'review',
    summary:
      'Detects an ACAO value that matches no obvious allowlist pattern - often a sign the server echoes any request Origin.',
    explanation:
      'Some servers set Access-Control-Allow-Origin to exactly whatever Origin the client sent. Combined with credentials this defeats the purpose of CORS entirely. Klynto sees responses from its own requests, so a value equal to Klynto’s request origin strongly suggests reflection.',
    impact: 'Reflected origins with credentials let any site read authenticated responses.',
    recommendation:
      'Replace reflection with a fixed allowlist of trusted origins. Never trust the request Origin header.',
    references: [MDN_ACAO, MDN_CORS],
    applicable: (ctx) =>
      ctx.analyzeCors && (ctx.evidence.source === 'active' || ctx.evidence.source === 'batch'),
    detect: (ctx) => {
      // During active scans the request origin is the extension itself, which
      // browsers express as "null" for CORS purposes - a reflected server would
      // return the extension origin or null. Look for 'null' allow-origin.
      const flagged = observedCors(ctx).filter((c) => c.allowOrigin === 'null');
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged.map((c) => `${c.url} → ACAO: null`) },
      };
    },
  },
];
