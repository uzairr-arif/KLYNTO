export interface Settings {
  theme: 'system' | 'dark' | 'light';
  /** Automatically inspect pages as they load (for granted origins). */
  autoInspect: boolean;
  analyzeCookies: boolean;
  analyzeCors: boolean;
  /** Show green PASS rows in finding lists. */
  showPasses: boolean;
  /** Maximum number of scans kept in history. */
  historyLimit: number;
  /** Rules disabled by the user. */
  disabledRuleIds: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  autoInspect: true,
  analyzeCookies: true,
  analyzeCors: true,
  showPasses: true,
  historyLimit: 100,
  disabledRuleIds: [],
};
