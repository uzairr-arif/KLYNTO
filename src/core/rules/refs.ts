import type { Reference } from '../models';

/** Shared reference shortcuts used across rule modules. */
export const DOC_REFS: Reference = {
  label: 'OWASP Secure Headers Project',
  url: 'https://owasp.org/www-project-secure-headers/',
};

export const OWASP_SECURE_HEADERS: Reference = DOC_REFS;

export const CSP_CHEATSHEET: Reference = {
  label: 'OWASP CSP Cheat Sheet',
  url: 'https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html',
};

export const MDN_CSP: Reference = {
  label: 'MDN - Content-Security-Policy',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy',
};

export const MDN_CORS: Reference = {
  label: 'MDN - CORS',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
};

export const MDN_ACAO: Reference = {
  label: 'MDN - Access-Control-Allow-Origin',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin',
};

export const MDN_COOP: Reference = {
  label: 'MDN - Cross-Origin-Opener-Policy',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy',
};

export const MDN_COEP: Reference = {
  label: 'MDN - Cross-Origin-Embedder-Policy',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy',
};

export const MDN_CORP: Reference = {
  label: 'MDN - Cross-Origin-Resource-Policy',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy',
};

export const MDN_SET_COOKIE: Reference = {
  label: 'MDN - Set-Cookie',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie',
};

export const MDN_MIXED_CONTENT: Reference = {
  label: 'MDN - Mixed content',
  url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content',
};

export const MDN_REDIRECTS: Reference = {
  label: 'MDN - HTTP redirects',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections',
};
