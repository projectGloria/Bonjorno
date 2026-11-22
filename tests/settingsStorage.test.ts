import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/constants/defaults';
import {
  createExportPayload,
  parseImportJson,
  resolveInitialSettings,
  sanitizeSettings,
} from '../src/services/settingsStorage';

describe('Settings sanitization and import/export', () => {
  it('recovers gracefully from corrupted or partial stored data', () => {
    const result = sanitizeSettings({
      appearance: {
        theme: 'invalid-theme',
        accentColor: 'not-a-hex',
        backgroundBlur: 999,
        surfaceOpacity: -10,
      },
      layout: {
        sectionOrder: ['search', 'unknown', 'search'],
        quickLinkColumns: 50,
      },
      quickLinks: [
        { id: '1', title: 'Evil', url: 'javascript:alert(1)' },
        { id: '2', title: 'Brave', url: 'brave.com' },
      ],
    });

    expect(result.appearance.theme).toBe(DEFAULT_SETTINGS.appearance.theme);
    expect(result.appearance.accentColor).toBe(
      DEFAULT_SETTINGS.appearance.accentColor
    );
    expect(result.appearance.backgroundBlur).toBe(24);
    expect(result.appearance.surfaceOpacity).toBe(35);
    expect(result.layout.sectionOrder).toEqual([
      'search',
      'hero',
      'quickLinks',
      'widgets',
    ]);
    expect(result.layout.quickLinkColumns).toBe(8);
    expect(result.quickLinks).toHaveLength(1);
    expect(result.quickLinks[0].url).toBe('https://brave.com/');
    expect(result.visibility.musicPlayer).toBe(false);
  });

  it('preserves music player visibility and placement through settings exports', () => {
    const position = { x: 88, y: 42, anchor: 'center' } as const;
    const settings = sanitizeSettings({
      layout: { freePositions: { 'widget:musicPlayer': position } },
      visibility: { musicPlayer: true },
    });
    const result = parseImportJson(JSON.stringify(createExportPayload(settings)));
    expect(result).toMatchObject({
      ok: true,
      settings: {
        visibility: { musicPlayer: true },
        layout: { freePositions: { 'widget:musicPlayer': position } },
      },
    });
  });

  it('round-trips export and import JSON cleanly', () => {
    const custom = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'Ada' },
    });
    const exported = JSON.stringify(createExportPayload(custom));
    const parsed = parseImportJson(exported);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.settings.behavior.userName).toBe('Ada');
    }
  });

  it('rejects malformed or unsupported import files', () => {
    expect(parseImportJson('{bad json').ok).toBe(false);
    expect(parseImportJson('{"app":"other","settings":{}}').ok).toBe(false);
    expect(
      parseImportJson(
        JSON.stringify({ app: 'bonjorno', schemaVersion: 99, settings: {} })
      ).ok
    ).toBe(false);
  });

  it('loads from root bonjorno.config.json on a fresh browser install', () => {
    const rootSettings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'Nihil' },
      quickLinks: [{ id: 'ql-1', title: 'Local', url: 'https://example.com' }],
    });

    const resolved = resolveInitialSettings(null, null, {
      settings: rootSettings,
      updatedAt: 1700000000000,
    });

    expect(resolved.fromRoot).toBe(true);
    expect(resolved.settings.behavior.userName).toBe('Nihil');
    expect(resolved.settings.quickLinks).toHaveLength(1);
    expect(resolved.updatedAt).toBe(1700000000000);
  });

  it('prefers newer root config over older local browser storage', () => {
    const localSettings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'OldName' },
    });
    const rootSettings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'SyncedName' },
    });

    const resolved = resolveInitialSettings(localSettings, 1000, {
      settings: rootSettings,
      updatedAt: 2000,
    });

    expect(resolved.fromRoot).toBe(true);
    expect(resolved.settings.behavior.userName).toBe('SyncedName');
  });

  it('preserves newer local browser storage over older root config', () => {
    const localSettings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'LatestLocal' },
    });
    const rootSettings = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      behavior: { ...DEFAULT_SETTINGS.behavior, userName: 'OlderRoot' },
    });

    const resolved = resolveInitialSettings(localSettings, 3000, {
      settings: rootSettings,
      updatedAt: 2000,
    });

    expect(resolved.fromRoot).toBe(false);
    expect(resolved.settings.behavior.userName).toBe('LatestLocal');
  });

  it('sanitizes universal drag-and-drop layout fields and free-form 2D positions', () => {
    const result = sanitizeSettings({
      layout: {
        heroOrder: ['date', 'invalid', 'clock'],
        linksClusterOrder: ['topSites', 'unknown'],
        topbarCorners: {
          'top-left': ['settings', 'invalid-pill'],
          'bottom-right': ['weather', 'settings'], // duplicate 'settings' should be deduplicated
        },
        freePositions: {
          'hero:clock': { x: 42.5, y: 18.2 },
          'quicklink:ql-brave': { x: 150, y: -20 }, // clamped to 0..96
          invalidPos: { x: 'bad', y: null },
        },
        snapToGrid: false,
      },
    });

    expect(result.layout.heroOrder).toEqual(['date', 'clock', 'greeting']);
    expect(result.layout.linksClusterOrder).toEqual(['topSites', 'quickLinks']);
    expect(result.layout.topbarCorners['top-left']).toContain('settings');
    expect(result.layout.topbarCorners['bottom-right']).toEqual(['weather']);
    // Remaining missing pills are placed into their default corners
    expect(result.layout.topbarCorners['top-left']).toContain('bookmarks');
    expect(result.layout.topbarCorners['top-right']).toEqual(['sync', 'edit']);
    expect(result.layout.freePositions['hero:clock']).toEqual({
      x: 42.5,
      y: 18.2,
    });
    expect(result.layout.freePositions['quicklink:ql-brave']).toEqual({
      x: 96,
      y: 0,
    });
    expect(result.layout.freePositions.invalidPos).toBeUndefined();
    expect(result.layout.snapToGrid).toBe(false);
  });

  it('drops free positions for unknown element IDs and removed quick links', () => {
    const result = sanitizeSettings({
      quickLinks: [{ id: 'ql-keep', title: 'Keep', url: 'https://example.com' }],
      layout: {
        freePositions: {
          'section:search': { x: 10, y: 20 },
          'section:nope': { x: 10, y: 20 },
          'pill:weather': { x: 80, y: 5 },
          'pill:rocket': { x: 1, y: 1 },
          'hero:date': { x: 40, y: 30 },
          'widget:todo': { x: 5, y: 60 },
          'widget:calendar': { x: 5, y: 60 },
          'cluster:topSites': { x: 30, y: 70 },
          'quicklink:ql-keep': { x: 12, y: 12 },
          'quicklink:ql-deleted': { x: 12, y: 12 },
          __proto__: { x: 1, y: 1 },
          'hero:clock': { x: Number.NaN, y: 10 },
          'hero:greeting': { x: Infinity, y: 10 },
        },
      },
    });

    expect(Object.keys(result.layout.freePositions).sort()).toEqual(
      [
        'cluster:topSites',
        'hero:date',
        'pill:weather',
        'quicklink:ql-keep',
        'section:search',
        'widget:todo',
      ].sort()
    );
  });

  it('clamps free position coordinates to the 0..96 viewport range', () => {
    const result = sanitizeSettings({
      layout: {
        freePositions: {
          'section:hero': { x: -5, y: 400 },
          'section:search': { x: 33.33333, y: 66.66666 },
        },
      },
    });
    expect(result.layout.freePositions['section:hero']).toEqual({ x: 0, y: 96 });
    expect(result.layout.freePositions['section:search']).toEqual({
      x: 33.33,
      y: 66.67,
    });
  });

  it('round-trips free positions through export and import', () => {
    const settings = sanitizeSettings({
      layout: {
        freePositions: {
          'widget:notes': { x: 70, y: 40 },
          'section:search': { x: 100, y: 35, anchor: 'center' },
        },
      },
    });
    const imported = parseImportJson(
      JSON.stringify(createExportPayload(settings))
    );
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.settings.layout.freePositions).toEqual({
      'widget:notes': { x: 70, y: 40 },
      'section:search': { x: 100, y: 35, anchor: 'center' },
    });
  });

  it('defaults to no free positions when the field is missing or malformed', () => {
    expect(sanitizeSettings({}).layout.freePositions).toEqual({});
    expect(
      sanitizeSettings({ layout: { freePositions: ['section:hero'] } }).layout
        .freePositions
    ).toEqual({});
  });
});
