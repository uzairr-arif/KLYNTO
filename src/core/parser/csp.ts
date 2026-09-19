/** A parsed Content-Security-Policy. */
export interface ParsedCsp {
  raw: string;
  reportOnly: boolean;
  /** Lowercased directive name → lowercased source list. */
  directives: Record<string, string[]>;
  directiveNames: string[];
  /** Directive tokens that did not parse into a known structure. */
  malformed: string[];
}

/** Directives that restrict scripts (fall back through the list). */
export const SCRIPT_SOURCES_DIRECTIVES = [
  'script-src-elem',
  'script-src-attr',
  'script-src',
  'default-src',
] as const;

/** Directives that restrict styles. */
export const STYLE_SOURCES_DIRECTIVES = [
  'style-src-elem',
  'style-src-attr',
  'style-src',
  'default-src',
] as const;

/** Directives that restrict embedded objects/plugins. */
export const OBJECT_SOURCES_DIRECTIVES = ['object-src', 'default-src'] as const;

/** Directives that restrict frames. */
export const FRAME_SOURCES_DIRECTIVES = ['frame-src', 'child-src', 'default-src'] as const;

const KNOWN_DIRECTIVES = new Set([
  'base-uri',
  'child-src',
  'connect-src',
  'default-src',
  'fenced-frame-src',
  'font-src',
  'form-action',
  'frame-ancestors',
  'frame-src',
  'img-src',
  'manifest-src',
  'media-src',
  'object-src',
  'prefetch-src',
  'report-to',
  'report-uri',
  'require-trusted-types-for',
  'sandbox',
  'script-src',
  'script-src-attr',
  'script-src-elem',
  'style-src',
  'style-src-attr',
  'style-src-elem',
  'worker-src',
  'upgrade-insecure-requests',
]);

export function parseCsp(raw: string): ParsedCsp {
  const directives: Record<string, string[]> = {};
  const malformed: string[] = [];

  for (const segment of raw.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    const name = tokens[0].toLowerCase();
    if (!KNOWN_DIRECTIVES.has(name)) {
      malformed.push(name);
      continue;
    }
    const sources = tokens.slice(1).map((t) => t.toLowerCase());
    if (directives[name]) {
      directives[name].push(...sources);
    } else {
      directives[name] = sources;
    }
  }

  return {
    raw,
    reportOnly: false,
    directives,
    directiveNames: Object.keys(directives),
    malformed,
  };
}

/** Effective source list for a purpose, following fallback semantics.
 *  Returns null when none of the directives are present. */
export function effectiveSources(csp: ParsedCsp, directives: readonly string[]): string[] | null {
  for (const name of directives) {
    if (name in csp.directives) return csp.directives[name];
  }
  return null;
}

export function hasUnsafeInline(sources: string[]): boolean {
  return sources.includes("'unsafe-inline'");
}

export function hasUnsafeEval(sources: string[]): boolean {
  return sources.includes("'unsafe-eval'");
}

export function hasWasmUnsafeEval(sources: string[]): boolean {
  return sources.includes("'wasm-unsafe-eval'");
}

/** A wildcard source: "*", a "scheme:*" host wildcard like "*.example.com",
 *  or an insecure scheme source ("http:", "https:" is not a wildcard). */
export function hasBroadWildcard(sources: string[]): boolean {
  return sources.some(
    (s) => s === '*' || s.startsWith('*.') || s === 'http:' || s.startsWith('ftp:'),
  );
}

export function hasDataUrl(sources: string[]): boolean {
  return sources.includes('data:');
}

export function isNone(sources: string[]): boolean {
  return sources.includes("'none'");
}

/** 'none' combined with other sources is invalid and ignored by browsers. */
export function hasInvalidNone(sources: string[]): boolean {
  return isNone(sources) && sources.length > 1;
}

export function hasHashOrNonce(sources: string[]): boolean {
  return sources.some((s) => s.startsWith("'nonce-") || /^'sha(256|384|512)-/.test(s));
}

export function hasReportDirective(csp: ParsedCsp): boolean {
  return 'report-uri' in csp.directives || 'report-to' in csp.directives;
}

/** Split multiple CSP headers and parse each. */
export function parseAllCsp(headerValues: string[]): ParsedCsp[] {
  return headerValues.map((raw) => parseCsp(raw));
}
