import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS } from '../constants/defaults';
import type {
  BackgroundFit,
  BackgroundMode,
  BackgroundPosition,
  BuiltinSearchEngineId,
  ClockStyle,
  DashboardSectionId,
  DateFormat,
  DensityMode,
  ExportPayload,
  ExtensionSettings,
  GreetingStyle,
  QuickLink,
  QuickLinkLayout,
  ThemeMode,
  TodoItem,
} from '../types/settings';
import { normalizeAndValidateUrl } from '../utils/url';
import { storageGet, storageSet } from './chromeApi';

export const SETTINGS_STORAGE_KEY = 'bonjorno_settings_v1';

const VALID_THEMES: ThemeMode[] = ['dark', 'light', 'system'];
const VALID_BG_MODES: BackgroundMode[] = ['solid', 'gradient', 'scene', 'custom'];
const VALID_BG_FITS: BackgroundFit[] = ['cover', 'contain', 'center'];
const VALID_BG_POSITIONS: BackgroundPosition[] = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
];
const VALID_DENSITIES: DensityMode[] = ['compact', 'comfortable', 'spacious'];
const VALID_CLOCK_STYLES: ClockStyle[] = ['editorial', 'display', 'mono', 'minimal'];
const VALID_GREETING_STYLES: GreetingStyle[] = ['subtle', 'centered', 'inline'];
const VALID_DATE_FORMATS: DateFormat[] = ['long', 'short', 'numeric', 'iso'];
const VALID_QL_LAYOUTS: QuickLinkLayout[] = ['grid', 'compact', 'dock', 'list'];
const VALID_SECTIONS: DashboardSectionId[] = [
  'hero',
  'search',
  'quickLinks',
  'widgets',
];
const VALID_ENGINES: BuiltinSearchEngineId[] = [
  'brave',
  'duckduckgo',
  'google',
  'startpage',
  'kagi',
  'perplexity',
  'youtube',
  'wikipedia',
  'github',
  'custom',
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === 'string' && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickString(value: unknown, fallback: string, maxLen = 500): string {
  return typeof value === 'string' ? value.slice(0, maxLen) : fallback;
}

function pickHexColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

function pickNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, Math.round(value)));
  }
  return fallback;
}

function sanitizeSectionOrder(value: unknown): DashboardSectionId[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.layout.sectionOrder];
  const seen = new Set<DashboardSectionId>();
  const result: DashboardSectionId[] = [];
  for (const item of value) {
    if (
      typeof item === 'string' &&
      VALID_SECTIONS.includes(item as DashboardSectionId) &&
      !seen.has(item as DashboardSectionId)
    ) {
      seen.add(item as DashboardSectionId);
      result.push(item as DashboardSectionId);
    }
  }
  for (const required of VALID_SECTIONS) {
    if (!seen.has(required)) result.push(required);
  }
  return result;
}

function sanitizeQuickLinks(value: unknown): QuickLink[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.quickLinks.map((q) => ({ ...q }));
  const cleaned: QuickLink[] = [];
  for (let i = 0; i < value.length && cleaned.length < 48; i++) {
    const item = value[i];
    if (!isRecord(item)) continue;
    const validUrl =
      typeof item.url === 'string' ? normalizeAndValidateUrl(item.url) : null;
    if (!validUrl) continue;
    const title = pickString(item.title, validUrl, 60).trim() || validUrl;
    const id = pickString(item.id, `ql-${i}-${Date.now()}`, 64);
    cleaned.push({ id, title, url: validUrl });
  }
  return cleaned;
}

function sanitizeTodos(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) return [];
  const cleaned: TodoItem[] = [];
  for (let i = 0; i < value.length && cleaned.length < 100; i++) {
    const item = value[i];
    if (!isRecord(item)) continue;
    const text = pickString(item.text, '', 240).trim();
    if (!text) continue;
    cleaned.push({
      id: pickString(item.id, `todo-${i}-${Date.now()}`, 64),
      text,
      completed: pickBoolean(item.completed, false),
      createdAt:
        typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
    });
  }
  return cleaned;
}

/**
 * Sanitizes and merges any partial/corrupted settings object with defaults.
 * Guarantees a completely valid ExtensionSettings object.
 */
export function sanitizeSettings(raw: unknown): ExtensionSettings {
  if (!isRecord(raw)) {
    return structuredClone(DEFAULT_SETTINGS);
  }

  const rawApp = isRecord(raw.appearance) ? raw.appearance : {};
  const rawLayout = isRecord(raw.layout) ? raw.layout : {};
  const rawBehavior = isRecord(raw.behavior) ? raw.behavior : {};
  const rawVis = isRecord(raw.visibility) ? raw.visibility : {};
  const rawWeather = isRecord(raw.weather) ? raw.weather : {};

  const customImages = Array.isArray(rawApp.customImages)
    ? rawApp.customImages
        .filter((img): img is Record<string, unknown> => isRecord(img))
        .slice(0, 24)
        .map((img, idx) => ({
          id: pickString(img.id, `img-${idx}`, 64),
          name: pickString(img.name, `Image ${idx + 1}`, 80),
          addedAt:
            typeof img.addedAt === 'number' && Number.isFinite(img.addedAt)
              ? img.addedAt
              : Date.now(),
        }))
    : [];

  let weatherLocation = DEFAULT_SETTINGS.weather.location;
  if (isRecord(rawWeather.location)) {
    const lat = rawWeather.location.latitude;
    const lon = rawWeather.location.longitude;
    const name = pickString(rawWeather.location.name, '', 80).trim();
    if (
      name &&
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lon)
    ) {
      weatherLocation = {
        name,
        country: pickString(rawWeather.location.country, '', 80),
        admin1: pickString(rawWeather.location.admin1, '', 80) || undefined,
        latitude: lat,
        longitude: lon,
      };
    }
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appearance: {
      theme: pickEnum(rawApp.theme, VALID_THEMES, DEFAULT_SETTINGS.appearance.theme),
      accentColor: pickHexColor(
        rawApp.accentColor,
        DEFAULT_SETTINGS.appearance.accentColor
      ),
      backgroundMode: pickEnum(
        rawApp.backgroundMode,
        VALID_BG_MODES,
        DEFAULT_SETTINGS.appearance.backgroundMode
      ),
      solidColor: pickHexColor(
        rawApp.solidColor,
        DEFAULT_SETTINGS.appearance.solidColor
      ),
      gradientId: pickString(
        rawApp.gradientId,
        DEFAULT_SETTINGS.appearance.gradientId,
        64
      ),
      sceneId: pickString(rawApp.sceneId, DEFAULT_SETTINGS.appearance.sceneId, 64),
      customImageId:
        typeof rawApp.customImageId === 'string' && rawApp.customImageId.length > 0
          ? rawApp.customImageId.slice(0, 64)
          : null,
      customImages,
      backgroundFit: pickEnum(
        rawApp.backgroundFit,
        VALID_BG_FITS,
        DEFAULT_SETTINGS.appearance.backgroundFit
      ),
      backgroundPosition: pickEnum(
        rawApp.backgroundPosition,
        VALID_BG_POSITIONS,
        DEFAULT_SETTINGS.appearance.backgroundPosition
      ),
      backgroundBlur: pickNumber(
        rawApp.backgroundBlur,
        DEFAULT_SETTINGS.appearance.backgroundBlur,
        0,
        24
      ),
      backgroundDim: pickNumber(
        rawApp.backgroundDim,
        DEFAULT_SETTINGS.appearance.backgroundDim,
        0,
        75
      ),
      surfaceOpacity: pickNumber(
        rawApp.surfaceOpacity,
        DEFAULT_SETTINGS.appearance.surfaceOpacity,
        35,
        98
      ),
    },
    layout: {
      sectionOrder: sanitizeSectionOrder(rawLayout.sectionOrder),
      density: pickEnum(
        rawLayout.density,
        VALID_DENSITIES,
        DEFAULT_SETTINGS.layout.density
      ),
      clockStyle: pickEnum(
        rawLayout.clockStyle,
        VALID_CLOCK_STYLES,
        DEFAULT_SETTINGS.layout.clockStyle
      ),
      greetingStyle: pickEnum(
        rawLayout.greetingStyle,
        VALID_GREETING_STYLES,
        DEFAULT_SETTINGS.layout.greetingStyle
      ),
      quickLinkLayout: pickEnum(
        rawLayout.quickLinkLayout,
        VALID_QL_LAYOUTS,
        DEFAULT_SETTINGS.layout.quickLinkLayout
      ),
      quickLinkColumns: pickNumber(
        rawLayout.quickLinkColumns,
        DEFAULT_SETTINGS.layout.quickLinkColumns,
        4,
        8
      ),
    },
    behavior: {
      searchEngine: pickEnum(
        rawBehavior.searchEngine,
        VALID_ENGINES,
        DEFAULT_SETTINGS.behavior.searchEngine
      ),
      customSearchName: pickString(
        rawBehavior.customSearchName,
        DEFAULT_SETTINGS.behavior.customSearchName,
        40
      ),
      customSearchUrl: pickString(
        rawBehavior.customSearchUrl,
        DEFAULT_SETTINGS.behavior.customSearchUrl,
        300
      ),
      autoFocusSearch: pickBoolean(
        rawBehavior.autoFocusSearch,
        DEFAULT_SETTINGS.behavior.autoFocusSearch
      ),
      openLinksInNewTab: pickBoolean(
        rawBehavior.openLinksInNewTab,
        DEFAULT_SETTINGS.behavior.openLinksInNewTab
      ),
      use24HourClock: pickBoolean(
        rawBehavior.use24HourClock,
        DEFAULT_SETTINGS.behavior.use24HourClock
      ),
      showSeconds: pickBoolean(
        rawBehavior.showSeconds,
        DEFAULT_SETTINGS.behavior.showSeconds
      ),
      dateFormat: pickEnum(
        rawBehavior.dateFormat,
        VALID_DATE_FORMATS,
        DEFAULT_SETTINGS.behavior.dateFormat
      ),
      userName: pickString(rawBehavior.userName, '', 48),
      customGreeting: pickString(rawBehavior.customGreeting, '', 80),
      enableAnimations: pickBoolean(
        rawBehavior.enableAnimations,
        DEFAULT_SETTINGS.behavior.enableAnimations
      ),
    },
    visibility: {
      clock: pickBoolean(rawVis.clock, DEFAULT_SETTINGS.visibility.clock),
      date: pickBoolean(rawVis.date, DEFAULT_SETTINGS.visibility.date),
      greeting: pickBoolean(rawVis.greeting, DEFAULT_SETTINGS.visibility.greeting),
      search: pickBoolean(rawVis.search, DEFAULT_SETTINGS.visibility.search),
      quickLinks: pickBoolean(
        rawVis.quickLinks,
        DEFAULT_SETTINGS.visibility.quickLinks
      ),
      bookmarks: pickBoolean(
        rawVis.bookmarks,
        DEFAULT_SETTINGS.visibility.bookmarks
      ),
      topSites: pickBoolean(rawVis.topSites, DEFAULT_SETTINGS.visibility.topSites),
      todo: pickBoolean(rawVis.todo, DEFAULT_SETTINGS.visibility.todo),
      notes: pickBoolean(rawVis.notes, DEFAULT_SETTINGS.visibility.notes),
    },
    weather: {
      enabled: pickBoolean(rawWeather.enabled, DEFAULT_SETTINGS.weather.enabled),
      consentGiven: pickBoolean(
        rawWeather.consentGiven,
        DEFAULT_SETTINGS.weather.consentGiven
      ),
      unit:
        rawWeather.unit === 'fahrenheit'
          ? 'fahrenheit'
          : DEFAULT_SETTINGS.weather.unit,
      location: weatherLocation,
    },
    quickLinks: sanitizeQuickLinks(raw.quickLinks),
    todos: sanitizeTodos(raw.todos),
    notes: pickString(raw.notes, '', 12000),
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await storageGet<unknown>(SETTINGS_STORAGE_KEY);
  return sanitizeSettings(stored);
}

export async function saveSettings(settings: ExtensionSettings): Promise<boolean> {
  return storageSet(SETTINGS_STORAGE_KEY, settings);
}

export function createExportPayload(settings: ExtensionSettings): ExportPayload {
  return {
    app: 'bonjorno',
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      ...settings,
      appearance: {
        ...settings.appearance,
        // Local IndexedDB image blobs are not embedded in JSON export
        customImageId: null,
        customImages: [],
        backgroundMode:
          settings.appearance.backgroundMode === 'custom'
            ? 'gradient'
            : settings.appearance.backgroundMode,
      },
    },
  };
}

export function parseImportJson(
  jsonText: string
): { ok: true; settings: ExtensionSettings } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Invalid JSON file. Please select a Bonjorno export file.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Unsupported configuration format.' };
  }

  if (parsed.app !== 'bonjorno' || !isRecord(parsed.settings)) {
    return {
      ok: false,
      error: 'This file does not appear to be a valid Bonjorno configuration export.',
    };
  }

  if (
    typeof parsed.schemaVersion === 'number' &&
    parsed.schemaVersion > CURRENT_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: 'This backup was created by a newer version of Bonjorno and cannot be imported.',
    };
  }

  return { ok: true, settings: sanitizeSettings(parsed.settings) };
}
