import type { Rule } from '../models';
import { docHeaders } from './helpers';

const MDN_SERVER_REF = {
  label: 'MDN - Server',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server',
};

const MDN_POWERED_REF = {
  label: 'MDN - X-Powered-By',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Powered-By',
};

export const disclosureRules: Rule[] = [
  {
    id: 'KLYNTO-DSC-001',
    moduleId: 'disclosure',
    category: 'Server software',
    title: 'Server header reveals software and version',
    passTitle: 'No version details in the Server header',
    severity: 'info',
    summary: 'Detects version strings inside the Server header.',
    explanation:
      'The Server header describes the responding software. A value like "nginx/1.24.0" additionally publishes the exact version, which lets attackers match known vulnerabilities for that build.',
    impact:
      'Version disclosure makes targeted attacks cheaper, though it is not a vulnerability by itself.',
    recommendation:
      'Consider reducing Server to the product name only (e.g. nginx: server_tokens off) or removing detail, depending on your stack.',
    fixControls: ['hide-server'],
    references: [MDN_SERVER_REF],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('server');
      if (!value) return null;
      const hasVersion = /\d+\.\d+/.test(value);
      if (!hasVersion) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'Server', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-DSC-002',
    moduleId: 'disclosure',
    category: 'Server software',
    title: 'X-Powered-By reveals the technology stack',
    passTitle: 'No X-Powered-By header',
    severity: 'info',
    summary: 'Detects the X-Powered-By header.',
    explanation:
      'X-Powered-By advertises the framework or language (Express, PHP, ASP.NET…) and sometimes its version. This is fingerprinting information, not a security control.',
    impact: 'Lowers the cost of matching known issues to your stack.',
    recommendation: 'Remove the header at the framework or proxy layer when practical.',
    fixControls: ['hide-server'],
    references: [MDN_POWERED_REF],
    applicable: () => true,
    detect: (ctx) => {
      const headers = docHeaders(ctx);
      const values = headers.getAll('x-powered-by');
      if (values.length === 0) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: {
          headers: values.map((value) => ({ name: 'X-Powered-By', value })),
        },
      };
    },
  },
  {
    id: 'KLYNTO-DSC-003',
    moduleId: 'disclosure',
    category: 'Server software',
    title: 'ASP.NET version headers are present',
    passTitle: 'No ASP.NET version headers',
    severity: 'info',
    summary: 'Detects X-AspNet-Version / X-AspNetMvc-Version.',
    explanation: 'These headers publish the exact ASP.NET framework versions in use.',
    impact: 'Framework version disclosure helps attackers target known issues.',
    recommendation: 'Remove them (e.g. <httpRuntime enableVersionHeader="false" /> in web.config).',
    fixControls: ['hide-server'],
    references: [MDN_SERVER_REF],
    applicable: () => true,
    detect: (ctx) => {
      const headers = docHeaders(ctx);
      const found: { name: string; value: string }[] = [];
      for (const name of ['x-aspnet-version', 'x-aspnetmvc-version']) {
        const value = headers.get(name);
        if (value) found.push({ name, value });
      }
      if (found.length === 0) return { status: 'pass' };
      return { status: 'fail', evidence: { headers: found } };
    },
  },
  {
    id: 'KLYNTO-DSC-004',
    moduleId: 'disclosure',
    category: 'Infrastructure',
    title: 'Via header reveals proxy infrastructure',
    passTitle: 'No Via header on the response',
    severity: 'info',
    summary: 'Detects the Via header.',
    explanation:
      'Via is added by proxies and gateways and discloses parts of the forwarding chain, sometimes with software and version.',
    impact: 'Infrastructure fingerprinting; usually harmless but worth knowing.',
    recommendation: 'If Via is not required by your architecture, strip it at the edge proxy.',
    references: [
      {
        label: 'MDN - Via',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Via',
      },
    ],
    applicable: () => true,
    detect: (ctx) => {
      const value = docHeaders(ctx).get('via');
      if (!value) return { status: 'pass' };
      return {
        status: 'fail',
        evidence: { headers: [{ name: 'Via', value }] },
      };
    },
  },
  {
    id: 'KLYNTO-DSC-005',
    moduleId: 'disclosure',
    category: 'Server software',
    title: 'Response reveals generator or runtime details',
    passTitle: 'No generator/runtime detail headers',
    severity: 'info',
    summary: 'Detects headers like X-Generator, X-Version, X-Runtime or X-Drupal-*.',
    explanation:
      'Several frameworks and platforms emit headers that advertise the generator, version or request runtime. These help fingerprint the stack.',
    impact: 'More fingerprinting signal; rarely needed in production.',
    recommendation: 'Remove these headers unless a debugging need justifies them.',
    references: [MDN_POWERED_REF],
    applicable: () => true,
    detect: (ctx) => {
      const patterns: Array<[RegExp, string]> = [
        [/^x-generator$/i, 'X-Generator'],
        [/^x-version$/i, 'X-Version'],
        [/^x-runtime(-runtimes)?$/i, 'X-Runtime'],
        [/^x-drupal-/i, 'X-Drupal-*'],
        [/^x-generator:/i, 'X-Generator'],
        [/^x-aspnetcnx$/i, 'X-AspNetCnx'],
        [/^x-vercel-id$/i, 'X-Vercel-Id'],
      ];
      const found: { name: string; value: string }[] = [];
      for (const header of docHeaders(ctx).toList()) {
        for (const [re, label] of patterns) {
          if (re.test(header.name)) {
            found.push({ name: label, value: `${header.name}: ${header.value}` });
            break;
          }
        }
      }
      if (found.length === 0) return { status: 'pass' };
      return { status: 'fail', evidence: { headers: found } };
    },
  },
];
