const LIBRARY_FILE = 'bonjorno.music.local.json';
const MUSIC_FOLDER = 'Music';
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'webm'];
const AUDIO_EXTENSION = new RegExp('\\.(' + AUDIO_EXTENSIONS.join('|') + ')$', 'i');
export const MUSIC_FILE_ACCEPT = AUDIO_EXTENSIONS.map((extension) => '.' + extension).join(',');
const MAX_TITLE_LENGTH = 300;
const MAX_INDEX_BYTES = 8 * 1024 * 1024;
const DATABASE = 'bonjorno-music-library';
const HANDLE_STORE = 'handles';
const IMPORT_STORE = 'imported-music';
const FILE_IMPORT_STORE = 'individual-music-files';
const PROJECT_KEY = 'project';
const INDEX_KEY = 'index';
const READ_WRITE = { mode: 'readwrite' } as const;

interface MusicDirectory extends FileSystemDirectoryHandle {
  queryPermission(options: typeof READ_WRITE): Promise<PermissionState>;
  requestPermission(options: typeof READ_WRITE): Promise<PermissionState>;
}

interface IterableDirectory extends FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options: {
    id: string;
    mode: 'readwrite';
  }) => Promise<MusicDirectory>;
};

export interface MusicTrack {
  path: string;
  title: string;
  artist?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMusicPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096 || !AUDIO_EXTENSION.test(value)) {
    return false;
  }
  const [root, ...segments] = value.split('/');
  return root === MUSIC_FOLDER && segments.length > 0 && segments.every((segment) =>
    segment !== '' && segment !== '.' && segment !== '..' &&
    !segment.includes('\\') && !segment.includes(':') && !segment.includes('\0')
  );
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TITLE_LENGTH) : '';
}

function filenameTitle(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(AUDIO_EXTENSION, '') ||
    path.slice(path.lastIndexOf('/') + 1);
}

export function parseMusicIndex(value: unknown): MusicTrack[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tracks)) {
    throw new Error('The music library file is invalid. Refresh Library to rebuild it.');
  }

  const tracks = new Map<string, MusicTrack>();
  for (const entry of value.tracks) {
    if (!isRecord(entry) || !isMusicPath(entry.path) || tracks.has(entry.path)) continue;
    const artist = cleanText(entry.artist);
    tracks.set(entry.path, {
      path: entry.path,
      title: cleanText(entry.title) || filenameTitle(entry.path),
      ...(artist ? { artist } : {}),
    });
  }
  return [...tracks.values()];
}

export function supportsMusicFolder(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 3);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDLE_STORE)) database.createObjectStore(HANDLE_STORE);
      if (!database.objectStoreNames.contains(IMPORT_STORE)) database.createObjectStore(IMPORT_STORE);
      if (!database.objectStoreNames.contains(FILE_IMPORT_STORE)) database.createObjectStore(FILE_IMPORT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readImportedEntry(key: string, store = IMPORT_STORE): Promise<unknown> {
  const database = await openHandleDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function readImportIndex(store: string): Promise<MusicTrack[] | null> {
  const value = await readImportedEntry(INDEX_KEY, store);
  return value === undefined ? null : parseMusicIndex(value);
}

export function readImportedMusicIndex() {
  return readImportIndex(IMPORT_STORE);
}

export async function readMusicFileImports() {
  return (await readImportIndex(FILE_IMPORT_STORE)) ?? [];
}

export async function openImportedMusicFile(path: string, individual = false): Promise<File> {
  if (!isMusicPath(path)) throw new Error('Invalid track path.');
  const file = await readImportedEntry(path, individual ? FILE_IMPORT_STORE : IMPORT_STORE);
  if (!(file instanceof File)) throw new Error('Track is missing from the imported library.');
  return file;
}

export async function importMusicFile(file: File): Promise<MusicTrack[]> {
  const basePath = MUSIC_FOLDER + '/Imported/' + file.name;
  if (!isMusicPath(basePath)) throw new Error('Choose a supported audio file.');

  const track = await readTrackTags(file, basePath);
  const database = await openHandleDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(FILE_IMPORT_STORE, 'readwrite');
      const store = transaction.objectStore(FILE_IMPORT_STORE);
      const request = store.get(INDEX_KEY);
      let updated: MusicTrack[];
      request.onsuccess = () => {
        try {
          const tracks = request.result === undefined ? [] : parseMusicIndex(request.result);
          const usedPaths = new Set(tracks.map(({ path }) => path));
          const extensionStart = basePath.lastIndexOf('.');
          let path = basePath;
          for (let copy = 2; usedPaths.has(path); copy++) {
            path = basePath.slice(0, extensionStart) + ' (' + copy + ')' + basePath.slice(extensionStart);
          }
          updated = [...tracks, { ...track, path }];
          serializeMusicIndex(updated);
          store.put(file, path);
          store.put({ version: 1, tracks: updated }, INDEX_KEY);
        } catch (error) {
          reject(error);
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(updated);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function importMusicFolder(files: File[]) {
  if (!files.every((file) => file.webkitRelativePath.startsWith(MUSIC_FOLDER + '/'))) {
    throw new Error('Choose the Music folder inside the Bonjorno project.');
  }
  const music = new Map<string, File>();
  for (const file of files) {
    const path = file.webkitRelativePath;
    if (isMusicPath(path)) music.set(path, file);
  }
  const tracks: MusicTrack[] = [];
  for (const [path, file] of music) {
    tracks.push(await readTrackTags(file, path));
  }
  sortTracks(tracks);
  const index = { version: 1, tracks };
  serializeMusicIndex(tracks);

  const database = await openHandleDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(IMPORT_STORE, 'readwrite');
      const store = transaction.objectStore(IMPORT_STORE);
      store.clear();
      for (const [path, file] of music) store.put(file, path);
      store.put(index, INDEX_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
  return tracks;
}

async function accessProjectHandle(
  handle?: MusicDirectory
): Promise<MusicDirectory | null> {
  const database = await openHandleDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE, handle ? 'readwrite' : 'readonly');
      const store = transaction.objectStore(HANDLE_STORE);
      const request = handle ? store.put(handle, PROJECT_KEY) : store.get(PROJECT_KEY);
      transaction.oncomplete = () => resolve(
        handle ?? (request.result as MusicDirectory | undefined) ?? null
      );
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export function loadMusicFolder() {
  return accessProjectHandle();
}

export async function pickMusicFolder() {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('This browser cannot link a local music folder.');
  const handle = await picker.call(window, { id: 'bonjorno-music', mode: 'readwrite' });
  try {
    await handle.getFileHandle('bonjorno.config.json');
  } catch (error) {
    if (!isFileError(error, 'NotFoundError') && !isFileError(error, 'TypeMismatchError')) {
      throw error;
    }
    throw new Error('Choose the Bonjorno project folder that contains bonjorno.config.json.');
  }
  await accessProjectHandle(handle);
  return handle;
}

export function canReadMusicFolder(folder: MusicDirectory) {
  return folder.queryPermission(READ_WRITE).then((permission) => permission === 'granted');
}

export function reconnectMusicFolder(folder: MusicDirectory) {
  return folder.requestPermission(READ_WRITE).then((permission) => permission === 'granted');
}

export function isFileError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

export async function readMusicIndex(folder: FileSystemDirectoryHandle) {
  let file: File;
  try {
    file = await (await folder.getFileHandle(LIBRARY_FILE)).getFile();
  } catch (error) {
    if (isFileError(error, 'NotFoundError')) return [];
    throw error;
  }
  if (file.size > MAX_INDEX_BYTES) {
    throw new Error('The music library file is too large. Refresh Library to rebuild it.');
  }
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('The music library file is invalid. Refresh Library to rebuild it.');
  }
  return parseMusicIndex(value);
}

export async function openMusicFile(folder: FileSystemDirectoryHandle, path: string) {
  if (!isMusicPath(path)) throw new Error('Invalid track path.');
  const segments = path.split('/');
  const filename = segments.pop()!;
  let directory = folder;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment);
  }
  return (await directory.getFileHandle(filename)).getFile();
}

async function readTrackTags(file: File, path: string): Promise<MusicTrack> {
  try {
    const { parseBlob } = await import('music-metadata');
    const { common } = await parseBlob(file, { skipCovers: true });
    const artist = cleanText(common.artist);
    return {
      path,
      title: cleanText(common.title) || filenameTitle(path),
      ...(artist ? { artist } : {}),
    };
  } catch {
    return { path, title: filenameTitle(path) };
  }
}

async function scanMusicFolder(directory: FileSystemDirectoryHandle, path: string, tracks: MusicTrack[]) {
  for await (const entry of (directory as IterableDirectory).values()) {
    const entryPath = path + '/' + entry.name;
    if (entryPath.length > 4096) continue;
    if (entry.kind === 'directory') {
      await scanMusicFolder(entry as FileSystemDirectoryHandle, entryPath, tracks);
    } else if (isMusicPath(entryPath)) {
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        tracks.push(await readTrackTags(file, entryPath));
      } catch (error) {
        if (!isFileError(error, 'NotFoundError')) throw error;
      }
    }
  }
}

function sortTracks(tracks: MusicTrack[]) {
  tracks.sort((first, second) =>
    first.path.localeCompare(second.path, undefined, { numeric: true })
  );
}

function serializeMusicIndex(tracks: MusicTrack[]) {
  const index = JSON.stringify({ version: 1, tracks }, null, 2) + '\n';
  if (new Blob([index]).size > MAX_INDEX_BYTES) {
    throw new Error('The music library exceeds the maximum index size.');
  }
  return index;
}

export function downloadMusicIndex(tracks: MusicTrack[]) {
  const index = new Blob([serializeMusicIndex(tracks)], { type: 'application/json' });
  const url = URL.createObjectURL(index);
  const link = document.createElement('a');
  link.href = url;
  link.download = LIBRARY_FILE;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function refreshMusicIndex(folder: FileSystemDirectoryHandle) {
  const refresh = async () => {
    const directory = await folder.getDirectoryHandle(MUSIC_FOLDER, { create: true });
    const tracks: MusicTrack[] = [];
    await scanMusicFolder(directory, MUSIC_FOLDER, tracks);
    sortTracks(tracks);
    const index = serializeMusicIndex(tracks);
    const handle = await folder.getFileHandle(LIBRARY_FILE, { create: true });
    const writer = await handle.createWritable();
    try {
      await writer.write(index);
      await writer.close();
    } catch (error) {
      await writer.abort().catch(() => undefined);
      throw error;
    }
    return tracks;
  };

  return navigator.locks
    ? navigator.locks.request('bonjorno-music-index', refresh)
    : refresh();
}

export async function readTrackArtwork(file: File): Promise<Blob | null> {
  const { parseBlob, selectCover } = await import('music-metadata');
  const { common } = await parseBlob(file);
  const picture = selectCover(common.picture);
  const format = picture?.format.toLowerCase();
  if (
    !picture || !format ||
    !/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(format) ||
    picture.data.length > MAX_INDEX_BYTES
  ) {
    return null;
  }
  return new Blob([new Uint8Array(picture.data)], { type: format });
}
