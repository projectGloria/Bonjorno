import type {
  BuiltinSearchEngineId,
  ExtensionSettings,
  QuickLink,
} from '../types/settings';

export const CURRENT_SCHEMA_VERSION = 1;

export interface SearchEngineDefinition {
  id: BuiltinSearchEngineId;
  name: string;
  shortName: string;
  urlTemplate: string; // %s replaced with encoded query
  placeholder: string;
}

export const SEARCH_ENGINES: SearchEngineDefinition[] = [
  {
    id: 'brave',
    name: 'Brave Search',
    shortName: 'Brave',
    urlTemplate: 'https://search.brave.com/search?q=%s',
    placeholder: 'Search with Brave...',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    shortName: 'DDG',
    urlTemplate: 'https://duckduckgo.com/?q=%s',
    placeholder: 'Search privately with DuckDuckGo...',
  },
  {
    id: 'google',
    name: 'Google',
    shortName: 'Google',
    urlTemplate: 'https://www.google.com/search?q=%s',
    placeholder: 'Search with Google...',
  },
  {
    id: 'startpage',
    name: 'Startpage',
    shortName: 'Startpage',
    urlTemplate: 'https://www.startpage.com/sp/search?query=%s',
    placeholder: 'Search with Startpage...',
  },
  {
    id: 'kagi',
    name: 'Kagi',
    shortName: 'Kagi',
    urlTemplate: 'https://kagi.com/search?q=%s',
    placeholder: 'Search with Kagi...',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    shortName: 'Perplexity',
    urlTemplate: 'https://www.perplexity.ai/search?q=%s',
    placeholder: 'Ask Perplexity...',
  },
  {
    id: 'github',
    name: 'GitHub',
    shortName: 'GitHub',
    urlTemplate: 'https://github.com/search?q=%s',
    placeholder: 'Search GitHub repositories...',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    shortName: 'Wiki',
    urlTemplate: 'https://en.wikipedia.org/w/index.php?search=%s',
    placeholder: 'Search Wikipedia...',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    urlTemplate: 'https://www.youtube.com/results?search_query=%s',
    placeholder: 'Search YouTube...',
  },
];

export const ACCENT_PRESETS = [
  { name: 'Brave Flame', hex: '#fb542b' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Cobalt Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Slate', hex: '#94a3b8' },
];

export const SOLID_PRESETS = [
  { name: 'Obsidian', hex: '#0d0f14' },
  { name: 'Midnight', hex: '#111827' },
  { name: 'Graphite', hex: '#18181b' },
  { name: 'Deep Pine', hex: '#0c1a17' },
  { name: 'Espresso', hex: '#1a1412' },
  { name: 'Alabaster', hex: '#f4f5f7' },
  { name: 'Warm Paper', hex: '#f5f2eb' },
  { name: 'Mist', hex: '#eaf0f6' },
];

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-brave', title: 'Brave Search', url: 'https://search.brave.com' },
  { id: 'ql-github', title: 'GitHub', url: 'https://github.com' },
  { id: 'ql-wiki', title: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { id: 'ql-youtube', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'ql-mdn', title: 'MDN Docs', url: 'https://developer.mozilla.org' },
];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  appearance: {
    theme: 'dark',
    accentColor: '#fb542b',
    backgroundMode: 'gradient',
    solidColor: '#0d0f14',
    gradientId: 'dawn-horizon',
    sceneId: 'alpine-dusk',
    customImageId: null,
    customImages: [],
    backgroundFit: 'cover',
    backgroundPosition: 'center',
    backgroundBlur: 0,
    backgroundDim: 22,
    surfaceOpacity: 74,
  },
  layout: {
    sectionOrder: ['hero', 'search', 'quickLinks', 'widgets'],
    widgetOrder: ['todo', 'notes'],
    heroOrder: ['clock', 'greeting', 'date'],
    linksClusterOrder: ['quickLinks', 'topSites'],
    topbarCorners: {
      'top-left': ['bookmarks', 'weather'],
      'top-right': ['sync', 'edit', 'settings'],
      'bottom-left': [],
      'bottom-right': [],
    },
    freePositions: {},
    snapToGrid: true,
    density: 'comfortable',
    clockStyle: 'editorial',
    greetingStyle: 'subtle',
    quickLinkLayout: 'grid',
    quickLinkColumns: 6,
  },
  behavior: {
    searchEngine: 'brave',
    customSearchName: 'Custom',
    customSearchUrl: 'https://search.brave.com/search?q=%s',
    autoFocusSearch: true,
    openLinksInNewTab: false,
    use24HourClock: true,
    showSeconds: false,
    dateFormat: 'long',
    userName: '',
    customGreeting: '',
    enableAnimations: true,
  },
  visibility: {
    clock: true,
    date: true,
    greeting: true,
    search: true,
    quickLinks: true,
    bookmarks: false,
    topSites: false,
    todo: false,
    notes: false,
    musicPlayer: false,
  },
  weather: {
    enabled: false,
    consentGiven: false,
    unit: 'celsius',
    location: null,
  },
  quickLinks: DEFAULT_QUICK_LINKS,
  todos: [],
  notes: '',
};
