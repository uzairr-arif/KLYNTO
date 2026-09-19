import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '@core/models';
import { loadSettings, mergeSettings, saveSettings } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { STORAGE_KEYS } from '../../shared/constants';

/** Settings with live updates across every Klynto surface. */
export function useSettings(): {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
  ready: boolean;
} {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadSettings(browserApi.storageLocal())
      .then((loaded) => {
        if (mounted) {
          setSettings(loaded);
          setReady(true);
        }
      })
      .catch(() => setReady(true));

    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      const change = changes[STORAGE_KEYS.settings];
      if (change?.newValue) setSettings(mergeSettings(change.newValue));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = mergeSettings({ ...settings, ...patch });
      setSettings(next);
      await saveSettings(browserApi.storageLocal(), next);
      // Let the service worker re-read settings on its next scan.
      void chrome.runtime.sendMessage({ type: 'settings/notify' }).catch(() => undefined);
    },
    [settings],
  );

  return { settings, update, ready };
}

/** Applies the theme to <html data-theme> and follows system changes. */
export function useTheme(settings: Settings): void {
  const theme = settings.theme;
  useEffect(() => {
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
