import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { subscribeStorageChanges } from '../services/chromeApi';
import {
  loadSettings,
  sanitizeSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from '../services/settingsStorage';
import type { ExtensionSettings } from '../types/settings';

export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestRef = useRef(settings);
  latestRef.current = settings;

  useEffect(() => {
    let active = true;
    loadSettings().then((initial) => {
      if (!active) return;
      setSettings(initial);
      setLoaded(true);
    });

    const unsubscribe = subscribeStorageChanges(SETTINGS_STORAGE_KEY, (nextRaw) => {
      if (!active) return;
      setSettings(sanitizeSettings(nextRaw));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateSettings = useCallback(
    (updater: (prev: ExtensionSettings) => ExtensionSettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        void saveSettings(next).then((ok) => {
          setSaveError(ok ? null : 'Could not save changes to local storage.');
        });
        return next;
      });
    },
    []
  );

  const replaceSettings = useCallback((next: ExtensionSettings) => {
    const clean = sanitizeSettings(next);
    setSettings(clean);
    void saveSettings(clean).then((ok) => {
      setSaveError(ok ? null : 'Could not save changes to local storage.');
    });
  }, []);

  return {
    settings,
    loaded,
    saveError,
    updateSettings,
    replaceSettings,
  };
}
