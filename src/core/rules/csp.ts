import type { Reference, Rule } from '../models';
import {
  effectiveSources,
  hasBroadWildcard,
  hasDataUrl,
  hasHashOrNonce,
  hasInvalidNone,
  hasReportDirective,
  hasUnsafeEval,
  hasUnsafeInline,
  isNone,
  OBJECT_SOURCES_DIRECTIVES,
  SCRIPT_SOURCES_DIRECTIVES,
} from '../parser/csp';
import { firstCsp, enforcedCspValues, isHttpsDoc } from './helpers';
import { CSP_CHEATSHEET, MDN_CSP } from './refs';

const SCRIPT_CSP_REF: Reference = {
  label: 'MDN - CSP script-src',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src',
};

const OBJECT_CSP_REF: Reference = {
  label: 'MDN - CSP object-src',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/object-src',
};

export const cspRules: Rule[] = [
  {
    id: 'KLYNTO-CSP-001',
    moduleId: 'csp',
    category: 'Script sources',
    title: "CSP allows 'unsafe-inline' for scripts",
    passTitle: "CSP script sources do not use 'unsafe-inline'",
    severity: 'review',
    summary: "Detects 'unsafe-inline' in script-restricting CSP directives.",
    explanation:
      "'unsafe-inline' permits inline <script> blocks, inline event handlers and javascript: URLs. This removes much of the protection CSP offers against content-injection scenarios, because injected inline code runs like any other inline code.",
    impact: 'Injected HTML containing a <script> tag executes, even though a CSP is present.',
    recommendation:
      "Move inline code into external files, or use nonces ('nonce-...') or hashes ('sha256-...') generated per response.",
    fixControls: ['csp'],
    references: [SCRIPT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const sources = effectiveSources(csp, SCRIPT_SOURCES_DIRECTIVES);
      if (!sources || !hasUnsafeInline(sources)) return { status: 'pass' };
      // Nonces and hashes make 'unsafe-inline' ignored in browsers that support them.
      if (hasHashOrNonce(sources)) {
        return {
          status: 'fail',
          severity: 'info',
          title: "CSP mixes 'unsafe-inline' with nonces/hashes",
          detail:
            "When nonce or hash sources are present, browsers ignore 'unsafe-inline'. Keeping it in the policy is misleading - remove it.",
          evidence: { detail: csp.raw },
        };
      }
      return {
        status: 'fail',
        evidence: { detail: csp.raw },
      };
    },
  },
  {
    id: 'KLYNTO-CSP-002',
    moduleId: 'csp',
    category: 'Script sources',
    title: "CSP allows 'unsafe-eval'",
    passTitle: "CSP script sources do not use 'unsafe-eval'",
    severity: 'review',
    summary: "Detects 'unsafe-eval' in script-restricting CSP directives.",
    explanation:
      "'unsafe-eval' allows eval(), new Function() and similar dynamic code evaluation. This weakens CSP against code-injection scenarios that rely on runtime evaluation.",
    impact: 'Injected code can execute via eval-style APIs instead of injected tags.',
    recommendation:
      'Remove eval usage from application code and dependencies where possible. Some bundlers/dev tooling need it - scope it out of production builds.',
    fixControls: ['csp'],
    references: [SCRIPT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const sources = effectiveSources(csp, SCRIPT_SOURCES_DIRECTIVES);
      if (!sources) return null;
      return hasUnsafeEval(sources)
        ? { status: 'fail', evidence: { detail: csp.raw } }
        : { status: 'pass' };
    },
  },
  {
    id: 'KLYNTO-CSP-003',
    moduleId: 'csp',
    category: 'Script sources',
    title: 'CSP uses broad wildcard script/object sources',
    passTitle: 'CSP script/object sources are not wildcards',
    severity: 'warning',
    summary: 'Detects "*" or wildcard host sources in script or object directives.',
    explanation:
      'A wildcard source such as * or *.cdn.example.com lets scripts or plugins load from any host matching it. For scripts, any compromised or hostile host under that wildcard can serve executable code.',
    impact:
      'Effectively removes origin restriction for scripts/objects, similar in spirit to not having the directive at all.',
    recommendation:
      'Pin script sources to the specific hosts the application actually loads code from.',
    fixControls: ['csp'],
    references: [SCRIPT_CSP_REF, OBJECT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const flagged: string[] = [];
      for (const directives of [SCRIPT_SOURCES_DIRECTIVES, OBJECT_SOURCES_DIRECTIVES]) {
        const sources = effectiveSources(csp, directives);
        if (sources && hasBroadWildcard(sources)) {
          flagged.push(`${directives[directives.length - 1]}: ${sources.join(' ')}`);
        }
      }
      if (flagged.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: flagged },
      };
    },
  },
  {
    id: 'KLYNTO-CSP-004',
    moduleId: 'csp',
    category: 'Script sources',
    title: 'CSP allows data: URLs for scripts or objects',
    passTitle: 'CSP script/object sources exclude data: URLs',
    severity: 'review',
    summary: 'Detects data: in script-src/object-src/default-src source lists.',
    explanation:
      'data: URLs are self-contained documents. Allowing them for scripts or objects means an injected data: URI can execute code without any external server.',
    impact: 'Provides a self-contained execution vector in content-injection scenarios.',
    recommendation:
      'Remove data: from script/object directives; keep it only in img-src/font-src where typically needed.',
    fixControls: ['csp'],
    references: [SCRIPT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const scriptSources = effectiveSources(csp, SCRIPT_SOURCES_DIRECTIVES);
      const objectSources = effectiveSources(csp, OBJECT_SOURCES_DIRECTIVES);
      const inScripts = scriptSources !== null && hasDataUrl(scriptSources);
      const inObjects = objectSources !== null && hasDataUrl(objectSources);
      if (!inScripts && !inObjects) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { detail: csp.raw },
      };
    },
  },
  {
    id: 'KLYNTO-CSP-005',
    moduleId: 'csp',
    category: 'Plugin sources',
    title: 'CSP does not restrict plugin objects (object-src)',
    passTitle: "CSP restricts objects (object-src 'none')",
    severity: 'review',
    summary: "Checks that object-src (or default-src) is set, ideally to 'none'.",
    explanation:
      '<object>, <embed> and <applet> can load plugins and embedded documents. Almost no site needs them; a restrictive object-src costs nothing.',
    impact: 'Embedded object content can bypass source expectations if unrestricted.',
    recommendation: "Add object-src 'none' (or a tightly scoped list) to the policy.",
    fixControls: ['csp'],
    references: [OBJECT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const sources = effectiveSources(csp, OBJECT_SOURCES_DIRECTIVES);
      if (sources === null) return { status: 'fail' };
      return isNone(sources)
        ? { status: 'pass' }
        : { status: 'fail', evidence: { detail: csp.raw } };
    },
  },
  {
    id: 'KLYNTO-CSP-006',
    moduleId: 'csp',
    category: 'Navigation',
    title: 'CSP does not define base-uri',
    passTitle: 'CSP defines base-uri',
    severity: 'info',
    summary: 'Checks for a base-uri directive.',
    explanation:
      'Without base-uri, injected <base href="https://evil.example"> can re-resolve all relative URLs on the page - including script sources - to an attacker-controlled origin. default-src does NOT cover base-uri.',
    impact: 'Strengthens certain content-injection scenarios where <base> can be inserted.',
    recommendation: "Add base-uri 'self' (plus any legitimately used origins).",
    fixControls: ['csp'],
    references: [
      {
        label: 'MDN - CSP base-uri',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/base-uri',
      },
      CSP_CHEATSHEET,
    ],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      return 'base-uri' in csp.directives ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-CSP-007',
    moduleId: 'csp',
    category: 'Navigation',
    title: 'CSP does not define form-action',
    passTitle: 'CSP defines form-action',
    severity: 'info',
    summary: 'Checks for a form-action directive.',
    explanation:
      'form-action restricts where <form> submissions may go. Without it (and it is not covered by default-src), injected markup can submit user data to an external origin.',
    impact: 'Form data can be exfiltrated in injection scenarios.',
    recommendation: "Add form-action 'self' (plus any payment/SSO endpoints actually used).",
    fixControls: ['csp'],
    references: [
      {
        label: 'MDN - CSP form-action',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/form-action',
      },
      CSP_CHEATSHEET,
    ],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      return 'form-action' in csp.directives ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-CSP-008',
    moduleId: 'csp',
    category: 'Framing',
    title: 'CSP could add frame-ancestors for framing control',
    passTitle: 'CSP defines frame-ancestors',
    severity: 'info',
    summary: 'Suggests frame-ancestors when framing is only controlled via X-Frame-Options.',
    explanation:
      'frame-ancestors is the modern CSP directive controlling who may embed this page and supports allowlists. X-Frame-Options is honored but less expressive.',
    impact:
      'No direct risk if X-Frame-Options is present; frame-ancestors is simply the stronger tool.',
    recommendation: "Add frame-ancestors 'self' (or 'none' / an explicit allowlist) to the policy.",
    fixControls: ['csp'],
    references: [
      {
        label: 'MDN - CSP frame-ancestors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors',
      },
    ],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      return 'frame-ancestors' in csp.directives ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-CSP-009',
    moduleId: 'csp',
    category: 'Operations',
    title: 'CSP has no violation reporting configured',
    passTitle: 'CSP reporting is configured',
    severity: 'info',
    summary: 'Checks for report-uri / report-to directives.',
    explanation:
      'Reporting endpoints tell you when the CSP blocks something - invaluable while tightening a policy and for detecting an active injection attempt.',
    impact: 'Without reports, CSP violations (possibly attacks) stay invisible.',
    recommendation:
      'Add a report-to endpoint (report-uri is deprecated but widely supported) and monitor reports.',
    references: [
      {
        label: 'MDN - CSP report-to',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to',
      },
      CSP_CHEATSHEET,
    ],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      return hasReportDirective(csp) ? { status: 'pass' } : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-CSP-010',
    moduleId: 'csp',
    category: 'Operations',
    title: 'CSP does not include upgrade-insecure-requests',
    passTitle: 'CSP includes upgrade-insecure-requests',
    severity: 'info',
    summary: 'Checks for the upgrade-insecure-requests directive on HTTPS pages.',
    explanation:
      'upgrade-insecure-requests tells the browser to rewrite http:// subresource requests to https://, softening mixed-content issues in legacy markup.',
    impact: 'Legacy http:// references may be blocked by the browser or sent insecurely.',
    recommendation: 'Add upgrade-insecure-requests to the policy (HTTPS sites only).',
    fixControls: ['csp'],
    references: [
      {
        label: 'MDN - upgrade-insecure-requests',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/upgrade-insecure-requests',
      },
    ],
    applicable: (ctx) => isHttpsDoc(ctx) && firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      return 'upgrade-insecure-requests' in csp.directives
        ? { status: 'pass' }
        : { status: 'fail' };
    },
  },
  {
    id: 'KLYNTO-CSP-011',
    moduleId: 'csp',
    category: 'Validity',
    title: "CSP combines 'none' with other sources",
    passTitle: 'CSP source lists are valid',
    severity: 'warning',
    summary: "Detects invalid 'none' usage mixed with other sources.",
    explanation:
      "'none' is only valid alone in a source list. Mixed with other sources the whole directive is treated as invalid and ignored by browsers.",
    impact: 'The affected directive provides no protection at all, silently.',
    recommendation: "Use 'none' alone, or list real sources without 'none'.",
    fixControls: ['csp'],
    references: [MDN_CSP],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const invalid = Object.entries(csp.directives)
        .filter(([, sources]) => hasInvalidNone(sources))
        .map(([name]) => name);
      if (invalid.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: invalid.map((name) => `${name}: 'none' mixed with other sources`) },
      };
    },
  },
  {
    id: 'KLYNTO-CSP-012',
    moduleId: 'csp',
    category: 'Script sources',
    title: 'CSP does not restrict script loading',
    passTitle: 'CSP restricts script loading',
    severity: 'review',
    summary: 'Detects a policy with no script-restricting directive at all.',
    explanation:
      'The policy exists but contains neither script-src (or variants) nor default-src, so script origins are unrestricted and the main XSS benefit of CSP is absent.',
    impact: 'Injected script tags from any origin can load and execute.',
    recommendation:
      "Add script-src 'self' (plus necessary nonces/hashes/hosts) or set default-src as a baseline.",
    fixControls: ['csp'],
    references: [SCRIPT_CSP_REF, CSP_CHEATSHEET],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const values = enforcedCspValues(ctx);
      if (values.length === 0) return null;
      const restricts = values.some((raw) => {
        // Any of the script directives or default-src makes scripts restricted.
        return /(?:^|;)\s*(script-src(-elem|-attr)?|default-src)\s+[^\s;]/i.test(raw);
      });
      if (restricts) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { detail: values.join('\n') },
      };
    },
  },
  {
    id: 'KLYNTO-CSP-013',
    moduleId: 'csp',
    category: 'Validity',
    title: 'Report-Only CSP contains unrecognized directives',
    passTitle: 'CSP directives are recognized',
    severity: 'info',
    summary: 'Flags CSP directives Klynto does not recognize.',
    explanation:
      'Unrecognized directives are ignored by browsers. This can indicate a typo (e.g. "script_Src") that silently disables an intended restriction.',
    impact: 'A typoed directive silently provides no protection.',
    recommendation: 'Review the listed directive names for typos against the CSP specification.',
    references: [MDN_CSP],
    applicable: (ctx) => firstCsp(ctx) !== null,
    detect: (ctx) => {
      const csp = firstCsp(ctx);
      if (!csp) return null;
      const unknown = csp.malformed;
      if (unknown.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { items: unknown },
      };
    },
  },
];
