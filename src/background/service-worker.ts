import { CONTEXT_MENU_ID } from '../shared/constants';
import { registerMessageRouter } from './message-router';
import { NetworkMonitor } from './network-monitor';
import { createScanFunction } from './active-scanner';
import { TabManager } from './tab-manager';
import { registerBatchRunner } from './batch-runner';
import { browserApi } from '../platform/browser';

const monitor = new NetworkMonitor();
const scan = createScanFunction(monitor);
const tabManager = new TabManager(monitor);

// --- Context menu ----------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Inspect security with Klynto',
      contexts: ['page', 'frame'],
    });
  });
  if (details.reason === 'install') {
    void browserApi.openExtensionPage('dashboard.html', 'welcome');
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const url = info.pageUrl ?? tab?.url;
  if (!url) return;
  void browserApi.openExtensionPage('dashboard.html', `scan?url=${encodeURIComponent(url)}`);
});

// --- Passive observation -----------------------------------------------------

monitor.start();
monitor.onMainFrame((tabId) => {
  // The monitor callback fires on every main-frame completion; the tab
  // manager decides whether to auto-inspect (settings + permissions).
  void browserApi.getTab(tabId).then((tab) => {
    if (tab?.url) void tabManager.handleNavigation(tabId, tab.url);
  });
});
tabManager.start();

// --- Message router ----------------------------------------------------------

registerMessageRouter({
  'tab/getScan': async (message) => tabManager.getScanForTab(message.tabId),
  'tab/rescan': async (message) => {
    const result = await scan(message.url, 'active', { mode: 'tab' });
    await tabManager.finalizeScan(message.tabId ?? null, result);
    return result;
  },
  'scan/url': async (message) => scan(message.url, 'active', { batchId: message.batchId }),
  'settings/notify': () => undefined, // settings are re-read on every use
});

// --- Batch -------------------------------------------------------------------

registerBatchRunner(scan);

export {};
