import { useEffect, useState } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { ClockGreeting } from './components/ClockGreeting';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  GripIcon,
  SettingsIcon,
} from './components/Icons';
import { QuickLinks } from './components/QuickLinks';
import { SearchBar } from './components/SearchBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { TopSitesBar } from './components/TopSitesBar';
import { WeatherPill } from './components/WeatherPill';
import { WidgetsPanel } from './components/WidgetsPanel';
import { useSettings } from './hooks/useSettings';
import type { DashboardSectionId } from './types/settings';

const SECTION_MIME = 'application/x-bonjorno-section';

const SECTION_TITLES: Record<DashboardSectionId, string> = {
  hero: 'Clock & Greeting',
  search: 'Search Bar',
  quickLinks: 'Quick Links',
  widgets: 'Widgets',
};

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
  const {
    settings,
    loaded,
    saveError,
    rootSync,
    updateSettings,
    replaceSettings,
  } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggedSection, setDraggedSection] =
    useState<DashboardSectionId | null>(null);
  const [dragOverSection, setDragOverSection] =
    useState<DashboardSectionId | null>(null);

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

  // Global keyboard shortcuts: "," opens Settings; Escape exits Edit Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editMode && !settingsOpen && !bookmarksOpen) {
        setEditMode(false);
        return;
      }
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
  }, [editMode, settingsOpen, bookmarksOpen]);

  const reorderSection = (
    fromId: DashboardSectionId,
    toId: DashboardSectionId
  ) => {
    if (fromId === toId) return;
    updateSettings((prev) => {
      const order = [...prev.layout.sectionOrder];
      const fromIdx = order.indexOf(fromId);
      const toIdx = order.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      return {
        ...prev,
        layout: { ...prev.layout, sectionOrder: order },
      };
    });
  };

  const moveSectionBy = (id: DashboardSectionId, delta: -1 | 1) => {
    updateSettings((prev) => {
      const order = [...prev.layout.sectionOrder];
      const idx = order.indexOf(id);
      const target = idx + delta;
      if (idx === -1 || target < 0 || target >= order.length) return prev;
      const [moved] = order.splice(idx, 1);
      order.splice(target, 0, moved);
      return {
        ...prev,
        layout: { ...prev.layout, sectionOrder: order },
      };
    });
  };

  const hideSection = (id: DashboardSectionId) => {
    updateSettings((prev) => {
      if (id === 'hero') {
        return {
          ...prev,
          visibility: {
            ...prev.visibility,
            clock: false,
            date: false,
            greeting: false,
          },
        };
      }
      if (id === 'search') {
        return { ...prev, visibility: { ...prev.visibility, search: false } };
      }
      if (id === 'quickLinks') {
        return {
          ...prev,
          visibility: { ...prev.visibility, quickLinks: false, topSites: false },
        };
      }
      return {
        ...prev,
        visibility: { ...prev.visibility, todo: false, notes: false },
      };
    });
  };

  const isSectionVisible = (id: DashboardSectionId): boolean => {
    switch (id) {
      case 'hero':
        return (
          settings.visibility.clock ||
          settings.visibility.date ||
          settings.visibility.greeting
        );
      case 'search':
        return settings.visibility.search;
      case 'quickLinks':
        return settings.visibility.quickLinks || settings.visibility.topSites;
      case 'widgets':
        return settings.visibility.todo || settings.visibility.notes;
    }
  };

  const renderSectionContent = (sectionId: DashboardSectionId) => {
    switch (sectionId) {
      case 'hero':
        return (
          <ClockGreeting
            behavior={settings.behavior}
            layout={settings.layout}
            visibility={settings.visibility}
            editMode={editMode}
            onUpdateBehavior={(patch) =>
              updateSettings((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, ...patch },
              }))
            }
            onUpdateLayout={(patch) =>
              updateSettings((prev) => ({
                ...prev,
                layout: { ...prev.layout, ...patch },
              }))
            }
          />
        );
      case 'search':
        return (
          <SearchBar
            behavior={settings.behavior}
            onSelectEngine={(searchEngine) =>
              updateSettings((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, searchEngine },
              }))
            }
          />
        );
      case 'quickLinks':
        return (
          <div className="links-cluster">
            {settings.visibility.quickLinks && (
              <QuickLinks
                links={settings.quickLinks}
                layout={settings.layout}
                openInNewTab={settings.behavior.openLinksInNewTab}
                editMode={editMode}
                onToggleEditMode={() => setEditMode((prev) => !prev)}
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
            showTodo={settings.visibility.todo}
            showNotes={settings.visibility.notes}
            widgetOrder={settings.layout.widgetOrder}
            todos={settings.todos}
            notes={settings.notes}
            editMode={editMode}
            onChangeTodos={(todos) =>
              updateSettings((prev) => ({ ...prev, todos }))
            }
            onChangeNotes={(notes) =>
              updateSettings((prev) => ({ ...prev, notes }))
            }
            onReorderWidgets={(widgetOrder) =>
              updateSettings((prev) => ({
                ...prev,
                layout: { ...prev.layout, widgetOrder },
              }))
            }
          />
        );
    }
  };

  const visibleSections = settings.layout.sectionOrder.filter(isSectionVisible);

  return (
    <div
      className={`app-shell ${loaded ? 'is-ready' : ''} ${
        editMode ? 'is-edit-mode' : ''
      }`}
    >
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
          {rootSync.info.status === 'needs-permission' && (
            <button
              type="button"
              className="topbar-pill surface-card"
              onClick={() => void rootSync.reconnectFile()}
              title="Reconnect write access to bonjorno.config.json"
            >
              <span>Sync Config</span>
            </button>
          )}
          {(editMode || !settings.visibility.quickLinks) && (
            <button
              type="button"
              className={`topbar-pill surface-card ${
                editMode ? 'is-edit-active' : ''
              }`}
              onClick={() => setEditMode((prev) => !prev)}
              aria-pressed={editMode}
            >
              {editMode ? <CheckIcon size={15} /> : <EditIcon size={15} />}
              <span>{editMode ? 'Done Editing' : 'Edit'}</span>
            </button>
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
          {visibleSections.map((id, idx) => (
            <div
              key={id}
              className={`dashboard-section-slot ${
                editMode ? 'is-editable-section' : ''
              } ${dragOverSection === id ? 'is-section-drag-over' : ''} ${
                draggedSection === id ? 'is-section-dragging' : ''
              }`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(SECTION_MIME, id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggedSection(id);
              }}
              onDragOver={(e) => {
                if (
                  !draggedSection &&
                  !e.dataTransfer.types.includes(SECTION_MIME)
                ) {
                  return;
                }
                e.preventDefault();
                if (dragOverSection !== id) setDragOverSection(id);
              }}
              onDragLeave={() => {
                if (dragOverSection === id) setDragOverSection(null);
              }}
              onDrop={(e) => {
                if (
                  !draggedSection &&
                  !e.dataTransfer.types.includes(SECTION_MIME)
                ) {
                  return;
                }
                e.preventDefault();
                if (draggedSection) {
                  reorderSection(draggedSection, id);
                }
                setDraggedSection(null);
                setDragOverSection(null);
              }}
              onDragEnd={() => {
                setDraggedSection(null);
                setDragOverSection(null);
              }}
            >
              {editMode && (
                <div className="section-edit-bar">
                  <span className="section-edit-label">
                    <GripIcon size={13} />
                    {SECTION_TITLES[id]}
                  </span>
                  <div className="section-edit-controls">
                    <button
                      type="button"
                      className="icon-btn-tiny"
                      onClick={() => moveSectionBy(id, -1)}
                      disabled={idx === 0}
                      title="Move section up"
                      aria-label={`Move ${SECTION_TITLES[id]} up`}
                    >
                      <ArrowUpIcon size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn-tiny"
                      onClick={() => moveSectionBy(id, 1)}
                      disabled={idx === visibleSections.length - 1}
                      title="Move section down"
                      aria-label={`Move ${SECTION_TITLES[id]} down`}
                    >
                      <ArrowDownIcon size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn-tiny danger"
                      onClick={() => hideSection(id)}
                      title={`Hide ${SECTION_TITLES[id]}`}
                      aria-label={`Hide ${SECTION_TITLES[id]}`}
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                </div>
              )}

              {renderSectionContent(id)}
            </div>
          ))}
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
        rootSync={rootSync}
        onUpdate={updateSettings}
        onReplace={replaceSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
