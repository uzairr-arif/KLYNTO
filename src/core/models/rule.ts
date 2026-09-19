import type { Severity } from './severity';
import type { ModuleId } from './module';
import type { FixControlId } from '../fixes/library';
import type { ScanEvidence, HttpHeader } from './scan';

export interface Reference {
  label: string;
  url: string;
}

/** One code snippet shown in the Fix Center for a rule. */
export interface RuleExample {
  platform: string;
  language: string;
  code: string;
}

export interface Evidence {
  /** One-line summary of the evidence, e.g. "Strict-Transport-Security is not present." */
  summary?: string;
  /** Raw header(s) backing the finding. */
  headers?: HttpHeader[];
  /** Bullet items, e.g. individual cookies or CSP directives. */
  items?: string[];
  /** Longer textual detail, e.g. a rendered redirect chain. */
  detail?: string;
  url?: string;
}

/** What a rule's detect() returns when it matches. */
export interface DetectResult {
  status: 'pass' | 'fail';
  /** Override the rule's default severity for this specific result. */
  severity?: Severity;
  /** Override the finding title. */
  title?: string;
  evidence?: Evidence;
  /** Extra explanation appended to the rule's explanation text. */
  detail?: string;
}

/** Inputs a rule can look at while detecting. */
export interface RuleContext {
  evidence: ScanEvidence;
  analyzeCookies: boolean;
  analyzeCors: boolean;
}

export interface Rule {
  /** Stable id, e.g. KLYNTO-HDR-001. */
  id: string;
  moduleId: ModuleId;
  /** Display grouping inside the module, e.g. "Transport". */
  category: string;
  /** Title when the rule fails (finding title). */
  title: string;
  /** Title when the rule passes (green row). */
  passTitle: string;
  /** Default severity when the rule fails. */
  severity: Severity;
  /** One-line description of what this check examines (Rules page). */
  summary: string;
  /** What does this mean? (finding explanation) */
  explanation: string;
  /** Why it matters (impact). */
  impact: string;
  /** Recommended action. */
  recommendation: string;
  /** Fix Center control ids with copy-paste snippets for this rule. */
  fixControls?: FixControlId[];
  references: Reference[];
  /** Static applicability check (e.g. only https pages). */
  applicable: (ctx: RuleContext) => boolean;
  /** The check itself. Return null when not applicable at runtime. */
  detect: (ctx: RuleContext) => DetectResult | null;
}
