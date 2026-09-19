import type {
  Finding,
  ModuleId,
  Rule,
  ScanEvidence,
  ScanResult,
  TransportSummary,
} from '../models';
import { buildTarget, isLocalTarget } from '../parser/urls';
import { parseHeaders } from '../parser/headers';
import { ALL_RULES, getRule } from '../rules/registry';
import { scoreFindings } from '../scoring/score';
import { safeUrlParse } from '../../shared/utils';

export interface AnalyzeOptions {
  analyzeCookies: boolean;
  analyzeCors: boolean;
  disabledRuleIds?: string[];
  /** Override the rule set (used by tests). */
  rules?: readonly Rule[];
  /** Mark the result with the source that produced the evidence. */
  batchId?: string;
  extensionVersion?: string;
}

/** Derive the transport summary from raw evidence. */
export function transportSummary(evidence: ScanEvidence): TransportSummary {
  const headers = parseHeaders(evidence.document.headers);
  const chain = evidence.document.redirectChain;

  let httpsUpgrade = false;
  let httpsDowngrade = false;
  const finalUrl = safeUrlParse(evidence.document.url);
  const urls = chain.map((h) => h.url).concat(evidence.document.url);
  for (let i = 0; i < urls.length - 1; i++) {
    const from = safeUrlParse(urls[i]);
    const to = safeUrlParse(urls[i + 1]);
    if (from?.protocol === 'http:' && to?.protocol === 'https:') httpsUpgrade = true;
    if (from?.protocol === 'https:' && to?.protocol === 'http:') httpsDowngrade = true;
  }

  void finalUrl;

  return {
    scheme:
      evidence.target.protocol === 'http' || evidence.target.protocol === 'https'
        ? evidence.target.protocol
        : 'other',
    isLocal: isLocalTarget(evidence.target),
    hsts: headers.get('strict-transport-security'),
    redirectCount: chain.length,
    httpsUpgradeInChain: httpsUpgrade,
    httpsDowngradeInChain: httpsDowngrade,
    mixedContentCount: evidence.subresources.insecure,
  };
}

/** Determine which modules produced meaningful evidence for this scan. */
function applicableModules(evidence: ScanEvidence): Set<ModuleId> {
  const set = new Set<ModuleId>();
  if (evidence.target.protocol === 'http' || evidence.target.protocol === 'https') {
    set.add('transport');
    set.add('headers');
    set.add('csp');
    set.add('cross-origin');
    set.add('disclosure');
    if (evidence.document.redirected || evidence.document.redirectChain.length > 0) {
      set.add('redirects');
    }
    if (evidence.setCookie.length > 0) set.add('cookies');
    const hasCors =
      evidence.requests?.some((r) => r.cors !== undefined) ||
      evidence.document.headers.some((h) => h.name.toLowerCase() === 'access-control-allow-origin');
    if (hasCors) set.add('cors');
  }
  return set;
}

/** Run the rule engine over evidence and produce a complete ScanResult. */
export function analyze(evidence: ScanEvidence, options: AnalyzeOptions): ScanResult {
  const disabled = new Set(options.disabledRuleIds ?? []);
  const rules = options.rules ?? ALL_RULES;
  const findings: Finding[] = [];
  const moduleEvidence = applicableModules(evidence);
  // Modules that only apply when their analyzer is enabled.
  if (!options.analyzeCookies) moduleEvidence.delete('cookies');
  if (!options.analyzeCors) moduleEvidence.delete('cors');

  const ctx = {
    evidence,
    analyzeCookies: options.analyzeCookies,
    analyzeCors: options.analyzeCors,
  };

  for (const rule of rules) {
    if (disabled.has(rule.id)) continue;
    if (!rule.applicable(ctx)) continue;
    let result;
    try {
      result = rule.detect(ctx);
    } catch {
      // A buggy rule must never break a scan; skip it.
      continue;
    }
    if (!result) continue;
    const status = result.status;
    const severity = status === 'pass' ? 'pass' : (result.severity ?? rule.severity);
    findings.push({
      ruleId: rule.id,
      moduleId: rule.moduleId,
      severity,
      status,
      title: result.title ?? (status === 'pass' ? rule.passTitle : rule.title),
      evidence: result.evidence,
      detail: result.detail,
    });
  }

  // Modules with zero applicable rules (e.g. no cookies seen) should not
  // drag the overall score - mark them not applicable.
  const involved = new Set<ModuleId>([...moduleEvidence]);
  for (const finding of findings) {
    involved.add(finding.moduleId);
  }

  const scores = scoreFindings(findings, involved);

  return {
    id: generateScanId(evidence.target.url, evidence.finishedAt),
    target: evidence.target,
    timestamp: evidence.finishedAt,
    source: evidence.source,
    durationMs: Math.max(0, evidence.finishedAt - evidence.startedAt),
    transport: transportSummary(evidence),
    setCookie: evidence.setCookie,
    findings,
    scores,
    requests: evidence.requests,
    batchId: options.batchId,
    extensionVersion: options.extensionVersion,
  };
}

let scanCounter = 0;

export function generateScanId(url: string, timestamp: number): string {
  scanCounter = (scanCounter + 1) % 1_000_000;
  const slug = safeUrlParse(url)?.hostname.replace(/[^a-z0-9.-]/gi, '') ?? 'scan';
  return `scan-${timestamp.toString(36)}-${scanCounter.toString(36)}-${slug}`;
}

/** Convenience: build evidence for a simple single-response scan (tests, tools). */
export function evidenceForResponse(
  url: string,
  status: number,
  headerLines: Array<{ name: string; value: string }>,
  extra?: Partial<ScanEvidence>,
): ScanEvidence {
  const target = buildTarget(url);
  if (!target) throw new Error(`Invalid URL: ${url}`);
  const now = Date.now();
  return {
    target,
    document: {
      url,
      status,
      headers: headerLines,
      redirected: false,
      redirectChain: [],
    },
    subresources: { total: 0, insecure: 0, insecureUrls: [] },
    setCookie: headerLines
      .filter((h) => h.name.toLowerCase() === 'set-cookie')
      .map((h) => ({ url, header: h.value })),
    source: 'active',
    startedAt: now,
    finishedAt: now,
    ...extra,
  };
}

export { getRule };
