import { useCallback, useEffect, useRef, useState } from 'react';
import {
  canReadMusicFolder,
  downloadMusicIndex,
  importMusicFile,
  importMusicFolder,
  isFileError,
  loadMusicFolder,
  openImportedMusicFile,
  openMusicFile,
  pickMusicFolder,
  readImportedMusicIndex,
  readMusicFileImports,
  readMusicIndex,
  reconnectMusicFolder,
  refreshMusicIndex,
  supportsMusicFolder,
  type MusicTrack,
} from '../services/musicLibrary';

type LinkedFolder = NonNullable<Awaited<ReturnType<typeof loadMusicFolder>>>;

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not access the music library.';
}

export function useMusicLibrary() {
  const [folder, setFolder] = useState<LinkedFolder | null>(null);
  const [folderTracks, setFolderTracks] = useState<MusicTrack[]>([]);
  const [fileTracks, setFileTracks] = useState<MusicTrack[]>([]);
  const [imported, setImported] = useState(false);
  const [revision, setRevision] = useState(0);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const inProgress = useRef(true);
  const supported = supportsMusicFolder();
  const requireAccess = useCallback(() => setNeedsAccess(true), []);
  const openTrack = useCallback((path: string, individual: boolean) => {
    if (individual || !supported) return openImportedMusicFile(path, individual);
    if (folder) return openMusicFile(folder, path);
    return Promise.reject(new Error('Music folder is not linked.'));
  }, [folder, supported]);

  useEffect(() => {
    let current = true;
    const restore = async () => {
      try {
        const files = await readMusicFileImports();
        if (!current) return;
        setFileTracks(files);
        if (!supported) {
          const saved = await readImportedMusicIndex();
          if (current && saved) {
            setFolderTracks(saved);
            setImported(true);
          }
          return;
        }
        const saved = await loadMusicFolder();
        if (!current || !saved) return;
        setFolder(saved);
        const granted = await canReadMusicFolder(saved);
        if (!current) return;
        setNeedsAccess(!granted);
        if (!granted) return;
        const savedTracks = await readMusicIndex(saved);
        if (current) setFolderTracks(savedTracks);
      } catch (failure) {
        if (!current) return;
        if (isFileError(failure, 'NotAllowedError')) setNeedsAccess(true);
        else setError(messageFor(failure));
      } finally {
        if (current) {
          inProgress.current = false;
          setBusy(false);
        }
      }
    };
    void restore();
    return () => { current = false; };
  }, [supported]);

  const run = async (operation: () => Promise<void>) => {
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    try {
      await operation();
      setError('');
    } catch (failure) {
      if (isFileError(failure, 'AbortError')) return;
      if (isFileError(failure, 'NotAllowedError') && folder) setNeedsAccess(true);
      setError(messageFor(failure));
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const refresh = (target: LinkedFolder) => refreshMusicIndex(target)
    .then((updated) => {
      setFolderTracks(updated);
      setRevision((previous) => previous + 1);
    });

  const folderReady = supported ? Boolean(folder && !needsAccess) : imported;
  const filePaths = new Set(fileTracks.map((track) => track.path));
  const tracks = [
    ...(folderReady ? folderTracks.filter((track) => !filePaths.has(track.path)) : []),
    ...fileTracks,
  ];
  return {
    linked: folder !== null,
    folderReady,
    hasFileImports: fileTracks.length > 0,
    isFileImport: (path: string) => filePaths.has(path),
    tracks,
    revision,
    needsAccess,
    busy,
    error,
    supported,
    openTrack,
    importFile: (file: File) => run(async () => {
      setFileTracks(await importMusicFile(file));
    }),
    importFolder: (files: File[]) => run(async () => {
      if (!files.length) return;
      setFolderTracks(await importMusicFolder(files));
      setImported(true);
      setRevision((previous) => previous + 1);
    }),
    savePlaylist: () => run(async () => downloadMusicIndex(tracks)),
    link: () => run(async () => {
      const selected = await pickMusicFolder();
      setFolder(selected);
      setFolderTracks([]);
      setNeedsAccess(false);
      try {
        await refresh(selected);
      } catch (failure) {
        if (isFileError(failure, 'NotAllowedError')) setNeedsAccess(true);
        throw failure;
      }
    }),
    reconnect: () => run(async () => {
      if (!folder) return;
      if (!await reconnectMusicFolder(folder)) {
        throw new Error('Folder access was declined.');
      }
      setNeedsAccess(false);
      setFolderTracks(await readMusicIndex(folder));
    }),
    refresh: () => run(async () => {
      if (folder) await refresh(folder);
    }),
    requireAccess,
  };
}
