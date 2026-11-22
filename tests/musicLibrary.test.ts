import { describe, expect, it } from 'vitest';
import { importMusicFile, openMusicFile, parseMusicIndex } from '../src/services/musicLibrary';

describe('Music library index', () => {
  it('keeps ordered music paths, cleans tags, and falls back to the filename', () => {
    expect(parseMusicIndex({
      version: 1,
      tracks: [
        { path: 'Music/Night/01.MP3', title: '  Night Walk ', artist: ' Artist ' },
        { path: 'Music/02.ogg', title: '   ', artist: 2 },
        { path: 'Music/Night/01.MP3', title: 'Duplicate' },
      ],
    })).toEqual([
      { path: 'Music/Night/01.MP3', title: 'Night Walk', artist: 'Artist' },
      { path: 'Music/02.ogg', title: '02' },
    ]);
  });

  it('rejects invalid and unsupported paths before accessing a handle', async () => {
    const badPaths = [
      '/Music/song.mp3', 'Elsewhere/song.mp3', 'Music/../song.mp3',
      'Music/a\\..\\song.mp3', 'Music/C:/song.mp3', 'Music//song.mp3',
      'Music/song.mp3\0.wav', 'Music/song.txt',
    ];
    expect(parseMusicIndex({
      version: 1,
      tracks: badPaths.map((path) => ({ path })),
    })).toEqual([]);
    for (const path of badPaths) {
      await expect(openMusicFile({} as FileSystemDirectoryHandle, path))
        .rejects.toThrow('Invalid track path');
    }
  });

  it('rejects malformed or incompatible index files', () => {
    expect(() => parseMusicIndex(null)).toThrow('music library file is invalid');
    expect(() => parseMusicIndex({ version: 2, tracks: [] })).toThrow('music library file is invalid');
  });

  it('rejects unsupported individual imports before accessing storage', async () => {
    await expect(importMusicFile(new File(['text'], 'notes.txt')))
      .rejects.toThrow('Choose a supported audio file.');
  });
});
