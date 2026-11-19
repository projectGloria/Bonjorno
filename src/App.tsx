import { useEffect, useState } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { ClockGreeting } from './components/ClockGreeting';
import { BookmarkIcon, SettingsIcon } from './components/Icons';
import { QuickLinks } from './components/QuickLinks';
import { SearchBar } from './components/SearchBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { TopSitesBar } from './components/TopSitesBar';
import { WeatherPill } from './components/WeatherPill';
import { WidgetsPanel } from './components/WidgetsPanel';
import { useSettings } from './hooks/useSettings';
import type { DashboardSectionId } from './types/settings';

function useResolvedTheme(mode: 'dark' | 'light' | 'system'): 'dark' | 'light' {
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [mode]);

  if (mode === 'system') return systemDark ? 'dark' : 'light';
  return mode;
}

export function App() {
  const { settings, loaded, saveError, updateSettings, replaceSettings } =
    useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  const resolvedTheme = useResolvedTheme(settings.appearance.theme);

  // Sync theme, accent, transparency, and motion attributes to document root
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.density = settings.layout.density;
    root.dataset.motion = settings.behavior.enableAnimations
      ? 'enabled'
      : 'reduced';
    root.style.setProperty('--accent', settings.appearance.accentColor);
    root.style.setProperty(
      '--surface-alpha',
      String(settings.appearance.surfaceOpacity / 100)
    );
  }, [
    resolvedTheme,
    settings.layout.density,
    settings.behavior.enableAnimations,
    settings.appearance.accentColor,
    settings.appearance.surfaceOpacity,
  ]);

  // Global keyboard shortcut: "," opens Settings when not focused on an input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ',' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setSettingsOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const renderSection = (sectionId: DashboardSectionId) => {
    switch (sectionId) {
      case 'hero':
        return (
          <ClockGreeting
            key="hero"
            behavior={settings.behavior}
            layout={settings.layout}
            visibility={settings.visibility}
          />
        );
      case 'search':
        return settings.visibility.search ? (
          <SearchBar
            key="search"
            behavior={settings.behavior}
            onSelectEngine={(searchEngine) =>
              updateSettings((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, searchEngine },
              }))
            }
          />
        ) : null;
      case 'quickLinks':
        return (
          <div key="quickLinks" className="links-cluster">
            {settings.visibility.quickLinks && (
              <QuickLinks
                links={settings.quickLinks}
                layout={settings.layout}
                openInNewTab={settings.behavior.openLinksInNewTab}
                onChange={(quickLinks) =>
                  updateSettings((prev) => ({ ...prev, quickLinks }))
                }
              />
            )}
            {settings.visibility.topSites && (
              <TopSitesBar openInNewTab={settings.behavior.openLinksInNewTab} />
            )}
          </div>
        );
      case 'widgets':
        return (
          <WidgetsPanel
            key="widgets"
            showTodo={settings.visibility.todo}
            showNotes={settings.visibility.notes}
            todos={settings.todos}
            notes={settings.notes}
            onChangeTodos={(todos) =>
              updateSettings((prev) => ({ ...prev, todos }))
            }
            onChangeNotes={(notes) =>
              updateSettings((prev) => ({ ...prev, notes }))
            }
          />
        );
    }
  };

  return (
    <div className={`app-shell ${loaded ? 'is-ready' : ''}`}>
      <BackgroundLayer appearance={settings.appearance} />

      <header className="topbar">
        <div className="topbar-left">
          {settings.visibility.bookmarks && (
            <button
              type="button"
              className="topbar-pill surface-card"
              onClick={() => setBookmarksOpen(true)}
              aria-label="Open Bookmarks"
            >
              <BookmarkIcon size={15} />
              <span>Bookmarks</span>
            </button>
          )}
          <WeatherPill
            weather={settings.weather}
            onUpdateWeather={(weather) =>
              updateSettings((prev) => ({ ...prev, weather }))
            }
          />
        </div>

        <div className="topbar-right">
          {saveError && (
            <span className="save-error-pill" role="alert">
              {saveError}
            </span>
          )}
          <button
            type="button"
            className="topbar-pill topbar-icon-pill surface-card"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open Settings"
            title="Settings (press ,)"
          >
            <SettingsIcon size={16} />
            <span className="topbar-label-desktop">Customize</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-stack">
          {settings.layout.sectionOrder.map((id) => renderSection(id))}
        </div>
      </main>

      <BookmarksDrawer
        open={bookmarksOpen}
        openInNewTab={settings.behavior.openLinksInNewTab}
        onClose={() => setBookmarksOpen(false)}
      />

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onReplace={replaceSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
