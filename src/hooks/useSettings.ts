import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { subscribeStorageChanges } from '../services/chromeApi';
import {
  clearStoredFileHandle,
  getRootSyncInfo,
  linkRootConfigFile,
  readLinkedFileText,
  reconnectLinkedFile,
  syncPayloadToRootFile,
  type RootSyncInfo,
} from '../services/localConfigSync';
import {
  createExportPayload,
  loadSettings,
  parseImportJson,
  sanitizeSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from '../services/settingsStorage';
import type { ExtensionSettings } from '../types/settings';

const INITIAL_SYNC_INFO: RootSyncInfo = {
  status: 'unlinked',
  fileName: null,
  lastSyncedAt: null,
};

export interface RootSyncActions {
  info: RootSyncInfo;
  linkFile: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  reconnectFile: () => Promise<{ ok: boolean; message: string }>;
  saveNow: () => Promise<{ ok: boolean; message: string }>;
  reloadFromFile: () => Promise<{ ok: boolean; message: string }>;
  unlinkFile: () => Promise<void>;
}

export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<RootSyncInfo>(INITIAL_SYNC_INFO);
  const latestRef = useRef(settings);
  latestRef.current = settings;
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    loadSettings().then((initial) => {
      if (!active) return;
      setSettings(initial);
      setLoaded(true);
    });

    getRootSyncInfo().then((info) => {
      if (!active) return;
      setSyncInfo(info);
    });

    const unsubscribe = subscribeStorageChanges(SETTINGS_STORAGE_KEY, (nextRaw) => {
      if (!active) return;
      setSettings(sanitizeSettings(nextRaw));
    });

    return () => {
      active = false;
      unsubscribe();
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const scheduleRootSync = useCallback(
    (next: ExtensionSettings, updatedAt: number) => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        const payload = createExportPayload(next, updatedAt);
        void syncPayloadToRootFile(payload).then((info) => {
          setSyncInfo(info);
        });
      }, 250);
    },
    []
  );

  const persist = useCallback(
    (next: ExtensionSettings, skipRootSync = false) => {
      const updatedAt = Date.now();
      void saveSettings(next, updatedAt).then((ok) => {
        setSaveError(ok ? null : 'Could not save changes to local storage.');
      });
      if (!skipRootSync) {
        scheduleRootSync(next, updatedAt);
      }
    },
    [scheduleRootSync]
  );

  const updateSettings = useCallback(
    (updater: (prev: ExtensionSettings) => ExtensionSettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const replaceSettings = useCallback(
    (next: ExtensionSettings) => {
      const clean = sanitizeSettings(next);
      setSettings(clean);
      persist(clean);
    },
    [persist]
  );

  const linkFile = useCallback(async () => {
    const payload = createExportPayload(latestRef.current, Date.now());
    const result = await linkRootConfigFile(payload);
    if (!result.ok) {
      return {
        ok: false,
        cancelled: result.cancelled,
        message: result.error,
      };
    }
    setSyncInfo(result.info);
    return {
      ok: true,
      message: `Linked and saved to ${result.info.fileName ?? 'bonjorno.config.json'}.`,
    };
  }, []);

  const reconnectFile = useCallback(async () => {
    const payload = createExportPayload(latestRef.current, Date.now());
    const result = await reconnectLinkedFile(payload);
    if (!result.ok) {
      return { ok: false, message: result.error };
    }
    setSyncInfo(result.info);
    return {
      ok: true,
      message: `Reconnected and saved to ${result.info.fileName ?? 'bonjorno.config.json'}.`,
    };
  }, []);

  const saveNow = useCallback(async () => {
    const payload = createExportPayload(latestRef.current, Date.now());
    const info = await syncPayloadToRootFile(payload);
    setSyncInfo(info);
    if (info.status === 'synced' || info.status === 'dev-synced') {
      return {
        ok: true,
        message: `Saved to ${info.fileName ?? 'bonjorno.config.json'}.`,
      };
    }
    if (info.status === 'needs-permission') {
      return reconnectFile();
    }
    return {
      ok: false,
      message: info.errorMessage ?? 'Could not save to local root config file.',
    };
  }, [reconnectFile]);

  const reloadFromFile = useCallback(async () => {
    const readRes = await readLinkedFileText();
    if (!readRes.ok) {
      return { ok: false, message: readRes.error };
    }
    const parsed = parseImportJson(readRes.text);
    if (!parsed.ok) {
      return { ok: false, message: parsed.error };
    }
    setSettings(parsed.settings);
    const ts = parsed.updatedAt || Date.now();
    await saveSettings(parsed.settings, ts);
    return {
      ok: true,
      message: `Loaded settings and shortcuts from ${readRes.fileName}.`,
    };
  }, []);

  const unlinkFile = useCallback(async () => {
    await clearStoredFileHandle();
    const info = await getRootSyncInfo();
    setSyncInfo(info);
  }, []);

  const rootSync: RootSyncActions = {
    info: syncInfo,
    linkFile,
    reconnectFile,
    saveNow,
    reloadFromFile,
    unlinkFile,
  };

  return {
    settings,
    loaded,
    saveError,
    rootSync,
    updateSettings,
    replaceSettings,
  };
}
