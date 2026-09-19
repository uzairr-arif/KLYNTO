/**
 * Platform adapter.
 *
 * All chrome.* usage in Klynto is meant to flow through this module so a
 * Firefox (browser.*) port only needs to touch this layer. For the Chromium
 * release the raw chrome namespace is used directly; the Firefox adapter is
 * wired but minimal (background scripts instead of service workers are the
 * main difference, handled by the build manifest generator).
 */

import type { KVStore } from '../core/storage/storage';
import { loadSettings } from '../core/storage/storage';
import { DEFAULT_SETTINGS, type Settings } from '../core/models';

interface StorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export interface TabLike {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
}

function kvFromArea(area: StorageAreaLike): KVStore {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const result = await area.get(key);
      return result[key] as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      await area.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await area.remove(key);
    },
  };
}

export const browserApi = {
  isChromium(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  },

  storageLocal(): KVStore {
    return kvFromArea(chrome.storage.local as unknown as StorageAreaLike);
  },

  storageSession(): KVStore {
    return kvFromArea(chrome.storage.session as unknown as StorageAreaLike);
  },

  extensionVersion(): string {
    return chrome.runtime.getManifest().version;
  },

  extensionUrl(path: string): string {
    return chrome.runtime.getURL(path);
  },

  /** The active tab of the current window (activeTab makes url visible in the popup). */
  async getActiveTab(): Promise<TabLike | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  },

  async getTab(tabId: number): Promise<TabLike | null> {
    try {
      return await chrome.tabs.get(tabId);
    } catch {
      return null;
    }
  },

  openExtensionPage(path: string, hash?: string): Promise<chrome.tabs.Tab | null> {
    const url = `${chrome.runtime.getURL(path)}${hash ? `#${hash}` : ''}`;
    return chrome.tabs.create({ url }).catch(() => null);
  },

  /** Open a hidden tab that the batch/redirect capturer can observe. */
  openHiddenTab(url: string): Promise<number | null> {
    return chrome.tabs
      .create({ url, active: false })
      .then((tab) => tab.id ?? null)
      .catch(() => null);
  },

  async closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      // tab already gone
    }
  },

  /** Permission helpers - called from extension pages with a user gesture. */
  async hasOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    return chrome.permissions.contains({ origins });
  },

  async requestOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    return chrome.permissions.request({ origins });
  },

  async removeOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    return chrome.permissions.remove({ origins });
  },

  async grantedHosts(): Promise<string[]> {
    const grants = await chrome.permissions.getAll();
    return (grants.origins ?? []) as string[];
  },

  /** Show a short-lived badge on the toolbar icon. */
  async setBadge(text: string, color = '#f59e0b'): Promise<void> {
    try {
      await chrome.action.setBadgeBackgroundColor({ color });
      await chrome.action.setBadgeText({ text });
    } catch {
      // action API unavailable in some contexts
    }
  },

  async clearBadge(): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch {
      // ignore
    }
  },
};

/** Load settings with a safe default fallback (for UI contexts). */
export async function loadSettingsSafe(): Promise<Settings> {
  try {
    return await loadSettings(browserApi.storageLocal());
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
