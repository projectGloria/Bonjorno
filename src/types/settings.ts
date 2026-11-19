export type ThemeMode = 'dark' | 'light' | 'system';

export type BackgroundMode = 'solid' | 'gradient' | 'scene' | 'custom';

export type BackgroundFit = 'cover' | 'contain' | 'center';

export type BackgroundPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export type DensityMode = 'compact' | 'comfortable' | 'spacious';

export type ClockStyle = 'editorial' | 'display' | 'mono' | 'minimal';

export type GreetingStyle = 'subtle' | 'centered' | 'inline';

export type DateFormat = 'long' | 'short' | 'numeric' | 'iso';

export type QuickLinkLayout = 'grid' | 'compact' | 'dock' | 'list';

export type DashboardSectionId = 'hero' | 'search' | 'quickLinks' | 'widgets';

export type WidgetId = 'todo' | 'notes';

export type BuiltinSearchEngineId =
  | 'brave'
  | 'duckduckgo'
  | 'google'
  | 'startpage'
  | 'kagi'
  | 'perplexity'
  | 'youtube'
  | 'wikipedia'
  | 'github'
  | 'custom';

export interface QuickLink {
  id: string;
  title: string;
  url: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface CustomImageMeta {
  id: string;
  name: string;
  addedAt: number;
}

export interface WeatherLocation {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherSettings {
  enabled: boolean;
  consentGiven: boolean;
  unit: 'celsius' | 'fahrenheit';
  location: WeatherLocation | null;
}

export interface VisibilitySettings {
  clock: boolean;
  date: boolean;
  greeting: boolean;
  search: boolean;
  quickLinks: boolean;
  bookmarks: boolean;
  topSites: boolean;
  todo: boolean;
  notes: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string;
  backgroundMode: BackgroundMode;
  solidColor: string;
  gradientId: string;
  sceneId: string;
  customImageId: string | null;
  customImages: CustomImageMeta[];
  backgroundFit: BackgroundFit;
  backgroundPosition: BackgroundPosition;
  backgroundBlur: number; // 0 to 24 px
  backgroundDim: number; // 0 to 75 %
  surfaceOpacity: number; // 35 to 98 %
}

export interface LayoutSettings {
  sectionOrder: DashboardSectionId[];
  widgetOrder: WidgetId[];
  density: DensityMode;
  clockStyle: ClockStyle;
  greetingStyle: GreetingStyle;
  quickLinkLayout: QuickLinkLayout;
  quickLinkColumns: number; // 4 to 8
}

export interface BehaviorSettings {
  searchEngine: BuiltinSearchEngineId;
  customSearchName: string;
  customSearchUrl: string; // must include %s or query appended
  autoFocusSearch: boolean;
  openLinksInNewTab: boolean;
  use24HourClock: boolean;
  showSeconds: boolean;
  dateFormat: DateFormat;
  userName: string;
  customGreeting: string;
  enableAnimations: boolean;
}

export interface ExtensionSettings {
  schemaVersion: number;
  appearance: AppearanceSettings;
  layout: LayoutSettings;
  behavior: BehaviorSettings;
  visibility: VisibilitySettings;
  weather: WeatherSettings;
  quickLinks: QuickLink[];
  todos: TodoItem[];
  notes: string;
}

export interface ExportPayload {
  app: 'bonjorno';
  exportedAt: string;
  schemaVersion: number;
  settings: ExtensionSettings;
}
