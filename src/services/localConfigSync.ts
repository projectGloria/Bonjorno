import type { ExportPayload } from '../types/settings';

export const ROOT_CONFIG_FILENAME = 'bonjorno.config.json';
const DEV_CONFIG_ENDPOINT = '/__bonjorno/config';
const SYNC_DB_NAME = 'bonjorno-local-sync';
const SYNC_DB_VERSION = 1;
const SYNC_STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root-config-file';

type PermissionStateValue = 'granted' | 'denied' | 'prompt';

interface WritableFileStreamLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface FileHandleLike {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFileStreamLike>;
  queryPermission?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionStateValue>;
  requestPermission?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionStateValue>;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileHandleLike[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileHandleLike>;
}

export type RootSyncStatus =
  | 'dev-synced'
  | 'synced'
  | 'needs-permission'
  | 'unlinked'
  | 'unsupported'
  | 'error';

export interface RootSyncInfo {
  status: RootSyncStatus;
  fileName: string | null;
  lastSyncedAt: number | null;
  errorMessage?: string;
}

export function isDevServerMode(): boolean {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return (
    Boolean(meta.env?.DEV) &&
    typeof window !== 'undefined' &&
    (window.location.protocol === 'http:' || window.location.protocol === 'https:')
  );
}

export function isFileSystemSyncSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as FilePickerWindow;
  return typeof win.showOpenFilePicker === 'function';
}

function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        db.createObjectStore(SYNC_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error('Failed to open local sync store'));
  });
}

async function getStoredFileHandle(): Promise<FileHandleLike | null> {
  try {
    const db = await openSyncDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
      const req = tx.objectStore(SYNC_STORE_NAME).get(ROOT_HANDLE_KEY);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as FileHandleLike | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('Failed to load file handle'));
      };
    });
  } catch {
    return null;
  }
}

async function storeFileHandle(handle: FileHandleLike): Promise<void> {
  const db = await openSyncDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
    tx.objectStore(SYNC_STORE_NAME).put(handle, ROOT_HANDLE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to store file handle'));
    };
  });
}

export async function clearStoredFileHandle(): Promise<void> {
  try {
    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
      tx.objectStore(SYNC_STORE_NAME).delete(ROOT_HANDLE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to clear file handle'));
      };
    });
  } catch {
    // Best-effort cleanup
  }
}

async function queryHandlePermission(
  handle: FileHandleLike,
  mode: 'read' | 'readwrite'
): Promise<PermissionStateValue> {
  if (typeof handle.queryPermission !== 'function') {
    return 'granted';
  }
  try {
    return await handle.queryPermission({ mode });
  } catch {
    return 'prompt';
  }
}

async function requestHandlePermission(
  handle: FileHandleLike,
  mode: 'read' | 'readwrite'
): Promise<PermissionStateValue> {
  if (typeof handle.requestPermission !== 'function') {
    return 'granted';
  }
  try {
    return await handle.requestPermission({ mode });
  } catch {
    return 'denied';
  }
}

/**
 * Fetches the root bonjorno.config.json text from the Vite dev server
 * (in dev mode) or from the extension bundle (`./bonjorno.config.json`).
 */
export async function fetchRootConfigText(): Promise<string | null> {
  if (typeof fetch !== 'function') return null;

  const url = isDevServerMode()
    ? DEV_CONFIG_ENDPOINT
    : `./${ROOT_CONFIG_FILENAME}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function writeToDevServer(payload: ExportPayload): Promise<boolean> {
  try {
    const res = await fetch(DEV_CONFIG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function writePayloadToHandle(
  handle: FileHandleLike,
  payload: ExportPayload
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(`${JSON.stringify(payload, null, 2)}\n`);
  await writable.close();
}

export async function getRootSyncInfo(): Promise<RootSyncInfo> {
  if (isDevServerMode()) {
    return {
      status: 'dev-synced',
      fileName: ROOT_CONFIG_FILENAME,
      lastSyncedAt: null,
    };
  }

  if (!isFileSystemSyncSupported()) {
    return {
      status: 'unsupported',
      fileName: null,
      lastSyncedAt: null,
    };
  }

  const handle = await getStoredFileHandle();
  if (!handle) {
    return {
      status: 'unlinked',
      fileName: null,
      lastSyncedAt: null,
    };
  }

  const perm = await queryHandlePermission(handle, 'readwrite');
  if (perm === 'granted') {
    return {
      status: 'synced',
      fileName: handle.name || ROOT_CONFIG_FILENAME,
      lastSyncedAt: null,
    };
  }

  return {
    status: 'needs-permission',
    fileName: handle.name || ROOT_CONFIG_FILENAME,
    lastSyncedAt: null,
  };
}

/**
 * Prompts the user to pick `bonjorno.config.json` in their repo root folder
 * and persists the FileSystemFileHandle in IndexedDB for automatic syncing.
 */
export async function linkRootConfigFile(
  initialPayload: ExportPayload
): Promise<
  | { ok: true; info: RootSyncInfo }
  | { ok: false; cancelled?: boolean; error: string }
> {
  if (!isFileSystemSyncSupported()) {
    return {
      ok: false,
      error: 'Direct file linking is not supported in this browser.',
    };
  }

  const win = window as FilePickerWindow;
  try {
    const handles = await win.showOpenFilePicker!({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: 'Bonjorno Config JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const handle = handles[0];
    if (!handle) {
      return { ok: false, cancelled: true, error: 'No file selected.' };
    }

    const perm = await requestHandlePermission(handle, 'readwrite');
    if (perm !== 'granted') {
      return {
        ok: false,
        error: 'Write permission was denied for the selected file.',
      };
    }

    await storeFileHandle(handle);
    await writePayloadToHandle(handle, initialPayload);

    return {
      ok: true,
      info: {
        status: 'synced',
        fileName: handle.name || ROOT_CONFIG_FILENAME,
        lastSyncedAt: Date.now(),
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, cancelled: true, error: 'File selection cancelled.' };
    }
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Could not link local configuration file.',
    };
  }
}

/**
 * Re-requests read/write permission for a previously linked file handle
 * (required after browser restarts) and writes the latest payload.
 */
export async function reconnectLinkedFile(
  payload: ExportPayload
): Promise<{ ok: true; info: RootSyncInfo } | { ok: false; error: string }> {
  const handle = await getStoredFileHandle();
  if (!handle) {
    return { ok: false, error: 'No linked config file found.' };
  }

  const perm = await requestHandlePermission(handle, 'readwrite');
  if (perm !== 'granted') {
    return { ok: false, error: 'Write permission was not granted.' };
  }

  try {
    await writePayloadToHandle(handle, payload);
    return {
      ok: true,
      info: {
        status: 'synced',
        fileName: handle.name || ROOT_CONFIG_FILENAME,
        lastSyncedAt: Date.now(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to write to linked config file.',
    };
  }
}

/**
 * Reads the currently linked root config file text (requires read permission).
 */
export async function readLinkedFileText(): Promise<
  { ok: true; text: string; fileName: string } | { ok: false; error: string }
> {
  if (isDevServerMode()) {
    const text = await fetchRootConfigText();
    if (!text) {
      return { ok: false, error: `Could not read ${ROOT_CONFIG_FILENAME}.` };
    }
    return { ok: true, text, fileName: ROOT_CONFIG_FILENAME };
  }

  const handle = await getStoredFileHandle();
  if (!handle) {
    return { ok: false, error: 'No linked config file found.' };
  }

  let perm = await queryHandlePermission(handle, 'read');
  if (perm !== 'granted') {
    perm = await requestHandlePermission(handle, 'read');
  }
  if (perm !== 'granted') {
    return { ok: false, error: 'Read permission was denied.' };
  }

  try {
    const file = await handle.getFile();
    const text = await file.text();
    return { ok: true, text, fileName: handle.name || ROOT_CONFIG_FILENAME };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Could not read linked config file.',
    };
  }
}

/**
 * Automatically writes settings to the root config file if dev server mode
 * is active or if a linked FileSystemFileHandle already has write permission.
 */
export async function syncPayloadToRootFile(
  payload: ExportPayload
): Promise<RootSyncInfo> {
  if (isDevServerMode()) {
    const ok = await writeToDevServer(payload);
    return ok
      ? {
          status: 'dev-synced',
          fileName: ROOT_CONFIG_FILENAME,
          lastSyncedAt: Date.now(),
        }
      : {
          status: 'error',
          fileName: ROOT_CONFIG_FILENAME,
          lastSyncedAt: null,
          errorMessage: `Failed to save ${ROOT_CONFIG_FILENAME}.`,
        };
  }

  if (!isFileSystemSyncSupported()) {
    return {
      status: 'unsupported',
      fileName: null,
      lastSyncedAt: null,
    };
  }

  const handle = await getStoredFileHandle();
  if (!handle) {
    return {
      status: 'unlinked',
      fileName: null,
      lastSyncedAt: null,
    };
  }

  const perm = await queryHandlePermission(handle, 'readwrite');
  if (perm !== 'granted') {
    return {
      status: 'needs-permission',
      fileName: handle.name || ROOT_CONFIG_FILENAME,
      lastSyncedAt: null,
    };
  }

  try {
    await writePayloadToHandle(handle, payload);
    return {
      status: 'synced',
      fileName: handle.name || ROOT_CONFIG_FILENAME,
      lastSyncedAt: Date.now(),
    };
  } catch (err) {
    return {
      status: 'error',
      fileName: handle.name || ROOT_CONFIG_FILENAME,
      lastSyncedAt: null,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Failed to write to linked config file.',
    };
  }
}
