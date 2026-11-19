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
});
