import { saveBatchRun, type BatchRun } from '../core/storage/storage';
import { browserApi } from '../platform/browser';
import { BATCH_LIMITS } from '../shared/constants';
import { BATCH_PORT_NAME, type BatchEvent, type BatchStartMessage } from '../shared/messages';
import type { ScanFunction } from './active-scanner';

/** Port-based batch runner: sequential scans with streamed progress. */
export function registerBatchRunner(scan: ScanFunction): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== BATCH_PORT_NAME) return;
    let cancelled = false;
    port.onDisconnect.addListener(() => {
      cancelled = true;
    });

    port.onMessage.addListener(async (raw: BatchStartMessage) => {
      if (raw?.type !== 'start') return;
      const { batchId } = raw;
      const urls = (raw.urls ?? [])
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\//i.test(u))
        .slice(0, BATCH_LIMITS.maxUrls);

      const run: BatchRun = {
        id: batchId,
        startedAt: Date.now(),
        targets: urls,
        results: [],
        errors: [],
      };
      let done = 0;

      const post = (event: BatchEvent) => {
        try {
          port.postMessage(event);
        } catch {
          cancelled = true;
        }
      };

      for (const url of urls) {
        if (cancelled) break;
        post({ type: 'progress', batchId, done, total: urls.length, current: url });
        try {
          const result = await scan(url, 'batch', { batchId });
          run.results.push(result);
          post({ type: 'result', batchId, scan: result });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          run.errors.push({ url, error: message });
          post({ type: 'error', batchId, url, error: message });
        }
        done += 1;
      }

      run.finishedAt = Date.now();
      try {
        await saveBatchRun(browserApi.storageLocal(), run);
      } catch {
        // storage full or unavailable - batch results were still delivered
      }
      post({ type: 'done', batchId, cancelled });
    });
  });
}
