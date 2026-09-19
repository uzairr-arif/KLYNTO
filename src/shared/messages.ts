import type { ScanResult } from '../core/models';

export type RequestMessage =
  | { type: 'tab/getScan'; tabId: number }
  | { type: 'tab/rescan'; url: string; tabId?: number }
  | { type: 'scan/url'; url: string; batchId?: string }
  | { type: 'settings/notify' };

export type MessageResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export interface TabScanPayload {
  scan: ScanResult | null;
  regressions: RegressionSummary[];
  granted: boolean;
  inspectable: boolean;
  url?: string;
}

export interface RegressionSummary {
  ruleId: string;
  title: string;
  currentSeverity: string;
  detectedAt: number;
  previousTimestamp: number;
}

export const BATCH_PORT_NAME = 'klynto-batch';

export type BatchEvent =
  | { type: 'progress'; batchId: string; done: number; total: number; current: string }
  | { type: 'result'; batchId: string; scan: ScanResult }
  | { type: 'error'; batchId: string; url: string; error: string }
  | { type: 'done'; batchId: string; cancelled: boolean };

export interface BatchStartMessage {
  type: 'start';
  batchId: string;
  urls: string[];
}

export async function sendToBackground<T>(message: RequestMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T>;
  if (!response || !response.ok) {
    throw new Error(
      response && 'error' in response ? response.error : 'No response from Klynto service worker',
    );
  }
  return response.data;
}

export function connectBatchPort(): chrome.runtime.Port {
  return chrome.runtime.connect({ name: BATCH_PORT_NAME });
}
