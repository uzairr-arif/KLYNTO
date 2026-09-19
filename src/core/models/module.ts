export type ModuleId =
  | 'headers'
  | 'csp'
  | 'cookies'
  | 'cors'
  | 'transport'
  | 'cross-origin'
  | 'disclosure'
  | 'redirects';

export const MODULE_IDS: readonly ModuleId[] = [
  'transport',
  'headers',
  'csp',
  'cookies',
  'cors',
  'cross-origin',
  'disclosure',
  'redirects',
] as const;

export interface ModuleMeta {
  label: string;
  shortLabel: string;
  description: string;
}

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  transport: {
    label: 'Transport',
    shortLabel: 'Transport',
    description: 'HTTPS, redirects to secure origins and mixed content.',
  },
  headers: {
    label: 'HTTP Headers',
    shortLabel: 'Headers',
    description: 'Core HTTP security response headers such as HSTS and X-Content-Type-Options.',
  },
  csp: {
    label: 'Content Security Policy',
    shortLabel: 'CSP',
    description: 'CSP presence, directives and source restrictions.',
  },
  cookies: {
    label: 'Cookies',
    shortLabel: 'Cookies',
    description: 'Set-Cookie attributes: Secure, HttpOnly, SameSite and scope.',
  },
  cors: {
    label: 'CORS',
    shortLabel: 'CORS',
    description: 'Cross-Origin Resource Sharing response configuration.',
  },
  'cross-origin': {
    label: 'Cross-Origin Isolation',
    shortLabel: 'Cross-Origin',
    description: 'COOP, COEP and CORP cross-origin isolation headers.',
  },
  disclosure: {
    label: 'Information Disclosure',
    shortLabel: 'Disclosure',
    description: 'Response headers that reveal software and version details.',
  },
  redirects: {
    label: 'Redirects',
    shortLabel: 'Redirects',
    description: 'Redirect chain length and hop-by-hop security.',
  },
};
