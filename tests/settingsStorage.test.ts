import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/constants/defaults';
import {
  createExportPayload,
  parseImportJson,
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
});
