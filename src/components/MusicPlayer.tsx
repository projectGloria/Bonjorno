import { useEffect, useRef, useState } from 'react';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { isFileError, MUSIC_FILE_ACCEPT, readTrackArtwork, type MusicTrack } from '../services/musicLibrary';
import type { FreePosition, LayoutSettings } from '../types/settings';
import { FreeMoveBadge, useFreeDrag } from './FreeMoveSlot';
import { CloseIcon, MusicNoteIcon, PauseIcon, PlayIcon, SkipTrackIcon } from './Icons';

const PLAYER_ID = 'widget:musicPlayer';

function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(total / 60);
  const remainder = String(total % 60).padStart(2, '0');
  if (minutes < 60) return minutes + ':' + remainder;
  const hours = Math.floor(minutes / 60);
  return hours + ':' + String(minutes % 60).padStart(2, '0') + ':' + remainder;
}

interface TrackPlaybackProps {
  track: MusicTrack;
  openTrack: (path: string, individual: boolean) => Promise<File>;
  individual: boolean;
  volume: number;
  playOnLoad: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onStep: (direction: -1 | 1, play: boolean) => void;
  onAccessLost: () => void;
  onPlayRequestConsumed: () => void;
}

function TrackPlayback({
  track,
  openTrack,
  individual,
  volume,
  playOnLoad,
  hasPrevious,
  hasNext,
  onStep,
  onAccessLost,
  onPlayRequestConsumed,
}: TrackPlaybackProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const playWhenReady = useRef(playOnLoad);

  useEffect(() => {
    let current = true;
    let audioUrl: string | undefined;
    let artworkUrl: string | undefined;
    const element = audio.current;
    const load = async () => {
      let file: File;
      try {
        file = await openTrack(track.path, individual);
      } catch (failure) {
        if (!current) return;
        if (isFileError(failure, 'NotAllowedError')) {
          onAccessLost();
        } else {
          setError('Could not open this track. Choose another track or update the library.');
        }
        return;
      }

      if (!current) return;
      audioUrl = URL.createObjectURL(file);
      setSource(audioUrl);
      try {
        const image = await readTrackArtwork(file);
        if (!current || !image) return;
        artworkUrl = URL.createObjectURL(image);
        setArtwork(artworkUrl);
      } catch {
        // The file may still be playable with the fallback artwork.
      }
    };
    void load();
    return () => {
      current = false;
      element?.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (artworkUrl) URL.revokeObjectURL(artworkUrl);
    };
  }, [openTrack, track.path, individual, onAccessLost]);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  const play = (element: HTMLAudioElement) => {
    setError('');
    void element.play().catch((failure: DOMException) => {
      if (audio.current === element && failure.name !== 'AbortError') {
        setError('Could not start playback. Try Play again or choose another track.');
      }
    });
  };

  const syncDuration = (element: HTMLAudioElement) => {
    setDuration(Number.isFinite(element.duration) ? element.duration : 0);
  };

  return (
    <>
      <audio
        ref={audio}
        src={source ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          syncDuration(event.currentTarget);
          if (playWhenReady.current) {
            playWhenReady.current = false;
            onPlayRequestConsumed();
            play(event.currentTarget);
          }
        }}
        onDurationChange={(event) => syncDuration(event.currentTarget)}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (hasNext) onStep(1, true);
        }}
        onError={() => {
          setPlaying(false);
          setError('Brave could not play this audio file. Choose another track.');
        }}
      />
      <div className="music-track">
        <div className="music-artwork" aria-hidden="true">
          {artwork ? <img src={artwork} alt="" /> : <MusicNoteIcon size={23} />}
          {playing && (
            <span className="music-playing-indicator">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
        <div className="music-track-text">
          <div className="music-title" title={track.title}>{track.title}</div>
          {track.artist && <div className="music-artist" title={track.artist}>{track.artist}</div>}
        </div>
        <div className="music-transport">
          <button type="button" className="icon-btn-tiny" aria-label="Previous track"
            disabled={!hasPrevious} onClick={() => onStep(-1, playing)}>
            <SkipTrackIcon previous />
          </button>
          <button
            type="button"
            className="icon-btn-tiny music-play-button"
            disabled={!source || Boolean(audio.current?.error)}
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              const element = audio.current;
              if (!element) return;
              if (element.paused) play(element);
              else element.pause();
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className="icon-btn-tiny" aria-label="Next track"
            disabled={!hasNext} onClick={() => onStep(1, playing)}>
            <SkipTrackIcon />
          </button>
        </div>
      </div>
      <div className="music-timeline">
        <span>{formatTime(elapsed)}</span>
        <input
          type="range"
          aria-label="Track position"
          aria-valuetext={formatTime(elapsed) + ' of ' + formatTime(duration)}
          min={0}
          max={duration || 1}
          step={0.01}
          disabled={duration <= 0}
          value={Math.min(elapsed, duration)}
          onChange={(event) => {
            if (!audio.current || duration <= 0) return;
            const time = event.currentTarget.valueAsNumber;
            audio.current.currentTime = time;
            setElapsed(time);
          }}
        />
        <span>{formatTime(duration)}</span>
      </div>
      {error && <p className="music-status" role="status">{error}</p>}
    </>
  );
}

interface MusicPlayerProps {
  editMode: boolean;
  layout: LayoutSettings;
  onSetPosition: (itemId: string, position: FreePosition | null) => void;
  onClose: () => void;
}

export function MusicPlayer({ editMode, layout, onSetPosition, onClose }: MusicPlayerProps) {
  const ref = useRef<HTMLElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const library = useMusicLibrary();
  const [selection, setSelection] = useState({ path: '', play: false });
  const [volume, setVolume] = useState(0.7);
  const drag = useFreeDrag({
    itemId: PLAYER_ID,
    freePositions: layout.freePositions,
    snapToGrid: layout.snapToGrid,
    onSetPosition,
    targetRef: ref,
  });

  const selectedIndex = Math.max(0, library.tracks.findIndex((track) => track.path === selection.path));
  const track = library.tracks[selectedIndex];
  const showLibraryActions = editMode || (library.supported && (library.needsAccess || library.folderReady));
  const selectTrack = (index: number, play: boolean) => {
    const next = library.tracks[index];
    if (next) setSelection({ path: next.path, play });
  };

  return (
    <section
      ref={ref}
      className={`music-player surface-popover${drag.isFree ? ' is-free-placed' : ''}${
        drag.isFreeDragging ? ' is-dragging' : ''
      }`}
      style={drag.freeStyle}
      aria-label="Music Player"
      tabIndex={0}
    >
      <div className="music-header">
        <span>Music Player</span>
        {editMode && (
          <>
            <FreeMoveBadge
              label="Music Player"
              isFree={drag.isFree}
              activePos={drag.activePos}
              onStartFreeDrag={(event) => drag.startPointerDrag(event, ref.current)}
              onDock={drag.dockItem}
              compact
            />
            <button type="button" className="icon-btn-tiny" aria-label="Close music player" onClick={onClose}>
              <CloseIcon size={15} />
            </button>
          </>
        )}
      </div>

      {!track && (
        <div className="music-artwork music-empty-artwork" aria-hidden="true">
          <MusicNoteIcon size={23} />
        </div>
      )}

      {track && (
        <>
          <TrackPlayback
            key={library.revision + ':' + track.path}
            track={track}
            openTrack={library.openTrack}
            individual={library.isFileImport(track.path)}
            volume={volume}
            playOnLoad={track.path === selection.path && selection.play}
            hasPrevious={selectedIndex > 0}
            hasNext={selectedIndex < library.tracks.length - 1}
            onStep={(direction, play) => selectTrack(selectedIndex + direction, play)}
            onAccessLost={library.requireAccess}
            onPlayRequestConsumed={() => setSelection((previous) => ({ ...previous, play: false }))}
          />
          <label className="music-volume">
            <span>Volume</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              aria-valuetext={Math.round(volume * 100) + '%'}
              onChange={(event) => setVolume(event.currentTarget.valueAsNumber)} />
          </label>
        </>
      )}

      {!library.supported && !library.folderReady && !track && !library.busy && (
        <p className="music-status">In edit mode, import an audio file or the Music folder from your Bonjorno project.</p>
      )}
      {library.supported && !library.linked && !track && !library.busy && (
        <p className="music-status">In edit mode, link the Bonjorno project folder to play tracks from its Music folder.</p>
      )}
      {library.folderReady && !track && !library.busy && (
        <p className="music-status">
          Add tracks to the Music folder, then {library.supported ? 'refresh the library' : 'import the folder again in edit mode'}.
        </p>
      )}
      {library.error && <p className="music-status" role="status">{library.error}</p>}
      {library.busy && <p className="music-status" role="status">Loading music library…</p>}

      {(track || showLibraryActions) && (
        <div className="music-library">
          {track && (
            <select aria-label="Choose a track" value={track.path}
              onChange={(event) => selectTrack(event.currentTarget.selectedIndex, false)}>
              {library.tracks.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.title}{item.artist ? ' · ' + item.artist : ''}
                </option>
              ))}
            </select>
          )}
          {showLibraryActions && (
            <div className="music-library-actions">
              {editMode && (
                <>
                  <input
                    hidden
                    type="file"
                    accept={MUSIC_FILE_ACCEPT}
                    ref={fileInput}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void library.importFile(file);
                    }}
                  />
                  <button type="button" className="mini-chip-btn" disabled={library.busy}
                    onClick={() => fileInput.current?.click()}>
                    Import Music File
                  </button>
                </>
              )}
              {library.supported && (
                <>
                  {editMode && (
                    <button type="button" className="mini-chip-btn" disabled={library.busy}
                      onClick={() => void library.link()}>
                      {library.linked ? 'Relink Folder' : 'Link Bonjorno Folder'}
                    </button>
                  )}
                  {library.needsAccess && (
                    <button type="button" className="mini-chip-btn" disabled={library.busy}
                      onClick={() => void library.reconnect()}>
                      Reconnect
                    </button>
                  )}
                  {library.folderReady && (
                    <button type="button" className="mini-chip-btn" disabled={library.busy}
                      onClick={() => void library.refresh()}>
                      Refresh Library
                    </button>
                  )}
                </>
              )}
              {editMode && !library.supported && (
                <>
                  <input
                    {...{ webkitdirectory: '' }}
                    hidden
                    type="file"
                    ref={folderInput}
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      event.currentTarget.value = '';
                      void library.importFolder(files);
                    }}
                  />
                  <button type="button" className="mini-chip-btn" disabled={library.busy}
                    onClick={() => folderInput.current?.click()}>
                    {library.folderReady ? 'Reimport Music Folder' : 'Import Music Folder'}
                  </button>
                </>
              )}
              {editMode && (library.hasFileImports || (!library.supported && library.folderReady)) && (
                <button type="button" className="mini-chip-btn" disabled={library.busy}
                  onClick={library.savePlaylist} title="Save the JSON beside bonjorno.config.json">
                  Save Playlist
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
