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

/** Firefox does not ship chrome.storage.session in all versions; degrade to an
 *  in-memory KV so live per-tab evidence simply resets when the worker sleeps. */
function memoryKv(): KVStore {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return map.get(key) as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      map.set(key, value);
    },
    async remove(key: string): Promise<void> {
      map.delete(key);
    },
  };
}

export const browserApi = {
  isChromium(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  },

  isFirefox(): boolean {
    return (
      typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
    );
  },

  storageLocal(): KVStore {
    return kvFromArea(chrome.storage.local as unknown as StorageAreaLike);
  },

  storageSession(): KVStore {
    const area = (chrome.storage as Partial<Record<'session', StorageAreaLike>>).session;
    return area ? kvFromArea(area) : memoryKv();
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

  /** Permission helpers - called from extension pages with a user gesture.
   *  Firefox does not grant host permissions via permissions.request(); there
   *  they are toggled per-extension in about:addons, so request failures are
   *  reported as `false` and the UI guides the user to the settings page. */
  async hasOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    return chrome.permissions.contains({ origins });
  },

  async requestOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    try {
      return await chrome.permissions.request({ origins });
    } catch {
      return false;
    }
  },

  async removeOrigins(origins: string[]): Promise<boolean> {
    if (origins.length === 0) return true;
    return chrome.permissions.remove({ origins });
  },

  /** Firefox path: open the extension's permission settings. */
  async openAboutAddons(): Promise<void> {
    try {
      await chrome.tabs.create({ url: 'about:addons' });
    } catch {
      // ignore - user can open it manually
    }
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
