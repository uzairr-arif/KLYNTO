import type {
  HttpHeader,
  NetworkRequestSummary,
  ObservedSetCookie,
  RedirectHop,
  ScanEvidence,
  ScanResult,
  ScanSource,
} from '../src/core/models';
import { analyze, type AnalyzeOptions } from '../src/core/scanner/analyze';
import { buildTarget } from '../src/core/parser/urls';

export interface EvidenceOptions {
  url?: string;
  status?: number;
  headers?: Array<[string, string] | HttpHeader>;
  setCookie?: string[];
  redirectChain?: Array<{ url: string; status: number; location?: string }>;
  insecureSubresources?: number;
  insecureUrls?: string[];
  requests?: NetworkRequestSummary[];
  source?: ScanSource;
}

/** Build ScanEvidence for tests with sensible defaults. */
export function makeEvidence(options: EvidenceOptions = {}): ScanEvidence {
  const url = options.url ?? 'https://example.com/';
  const target = buildTarget(url);
  if (!target) throw new Error(`Invalid test URL: ${url}`);
  const headers: HttpHeader[] = (options.headers ?? []).map((h) =>
    Array.isArray(h) ? { name: h[0], value: h[1] } : h,
  );
  const redirectChain: RedirectHop[] = (options.redirectChain ?? []).map((hop) => ({
    url: hop.url,
    status: hop.status,
    location: hop.location,
  }));
  const setCookie: ObservedSetCookie[] = (options.setCookie ?? []).map((header) => ({
    url,
    header,
  }));
  // Set-Cookie headers provided in the header list are collected too - this
  // mirrors how the network monitor captures them from real responses.
  for (const header of headers) {
    if (header.name.toLowerCase() === 'set-cookie') {
      setCookie.push({ url, header: header.value });
    }
  }
  const now = Date.now();
  return {
    target,
    document: {
      url,
      status: options.status ?? 200,
      headers,
      redirected: redirectChain.length > 0,
      redirectChain,
    },
    subresources: {
      total: options.insecureSubresources ?? 0,
      insecure: options.insecureUrls?.length ?? options.insecureSubresources ?? 0,
      insecureUrls: options.insecureUrls ?? [],
    },
    setCookie,
    requests: options.requests,
    source: options.source ?? 'active',
    startedAt: now,
    finishedAt: now,
  };
}

export function runRules(evidence: ScanEvidence, options?: Partial<AnalyzeOptions>): ScanResult {
  return analyze(evidence, {
    analyzeCookies: true,
    analyzeCors: true,
    ...options,
  });
}

export function findingOf(result: ScanResult, ruleId: string) {
  return result.findings.find((f) => f.ruleId === ruleId);
}

export function failingRuleIds(result: ScanResult): string[] {
  return result.findings.filter((f) => f.status === 'fail').map((f) => f.ruleId);
}

export function expectNoFailures(result: ScanResult): void {
  const failures = failingRuleIds(result);
  if (failures.length > 0) {
    throw new Error(`Expected no failing rules, got: ${failures.join(', ')}`);
  }
}
