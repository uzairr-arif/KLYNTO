import type { ModuleId } from './module';
import type { Severity } from './severity';
import type { Evidence } from './rule';

export type FindingStatus = 'pass' | 'fail';

/**
 * A resolved rule result. Static explanation text (explanation, impact,
 * recommendation, examples, references) is NOT persisted here - the UI
 * resolves it from the rule registry by ruleId. This keeps stored scans small.
 */
export interface Finding {
  ruleId: string;
  moduleId: ModuleId;
  severity: Severity;
  status: FindingStatus;
  title: string;
  evidence?: Evidence;
  detail?: string;
}

export interface ModuleScore {
  score: number;
  applicable: boolean;
  counts: Record<Severity, number>;
}

export type ScoreGrade = 'good' | 'fair' | 'poor' | 'unknown';

export interface ScoreSummary {
  /** 0-100, or -1 when no module was applicable. */
  overall: number;
  grade: ScoreGrade;
  counts: Record<Severity, number>;
  modules: Record<ModuleId, ModuleScore>;
}

export interface ScanResult {
  id: string;
  target: import('./scan').Target;
  timestamp: number;
  source: import('./scan').ScanSource;
  durationMs: number;
  transport: import('./scan').TransportSummary;
  setCookie: import('./scan').ObservedSetCookie[];
  findings: Finding[];
  scores: ScoreSummary;
  requests?: import('./scan').NetworkRequestSummary[];
  batchId?: string;
  extensionVersion?: string;
}

/** A security regression: a control that previously passed and now fails. */
export interface Regression {
  ruleId: string;
  title: string;
  currentSeverity: Severity;
  detectedAt: number;
  previousScanId: string;
  previousTimestamp: number;
}
