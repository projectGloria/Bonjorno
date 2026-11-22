import { useEffect, useRef, useState } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { ClockGreeting } from './components/ClockGreeting';
import { FreeMoveBadge, useFreeDrag, useReorderArm } from './components/FreeMoveSlot';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  GridIcon,
  GripIcon,
  PinIcon,
  SettingsIcon,
} from './components/Icons';
import { QuickLinks } from './components/QuickLinks';
import { MusicPlayer } from './components/MusicPlayer';
import { SearchBar } from './components/SearchBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { TopSitesBar } from './components/TopSitesBar';
import { WeatherPill } from './components/WeatherPill';
import { WidgetsPanel } from './components/WidgetsPanel';
import { useSettings } from './hooks/useSettings';
import type {
  DashboardSectionId,
  FreePosition,
  LayoutSettings,
  LinksClusterPartId,
  TopbarCorner,
  TopbarPillId,
} from './types/settings';

const SECTION_MIME = 'application/x-bonjorno-section';
const PILL_MIME = 'application/x-bonjorno-pill';
const CLUSTER_PART_MIME = 'application/x-bonjorno-cluster-part';

const SECTION_TITLES: Record<DashboardSectionId, string> = {
  hero: 'Clock & Greeting',
  search: 'Search Bar',
  quickLinks: 'Quick Links & Sites',
  widgets: 'Widgets',
};

const PILL_LABELS: Record<TopbarPillId, string> = {
  bookmarks: 'Bookmarks Button',
  weather: 'Weather Pill',
  sync: 'Sync Config Pill',
  edit: 'Edit Mode Button',
  settings: 'Customize Button',
};

const CORNERS: TopbarCorner[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

const CORNER_LABELS: Record<TopbarCorner, string> = {
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
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

function DraggablePillSlot({
  pillId,
  editMode,
  layout,
  draggedPill,
  dragOverPill,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDropOnPill,
  onDragEnd,
  onSetFreePosition,
  children,
}: {
  pillId: TopbarPillId;
  editMode: boolean;
  layout: LayoutSettings;
  draggedPill: TopbarPillId | null;
  dragOverPill: TopbarPillId | null;
  onDragStart: (id: TopbarPillId) => void;
  onDragOver: (id: TopbarPillId) => void;
  onDragLeave: (id: TopbarPillId) => void;
  onDropOnPill: (id: TopbarPillId) => void;
  onDragEnd: () => void;
  onSetFreePosition: (itemId: string, pos: FreePosition | null) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemId = `pill:${pillId}`;
  const {
    isFree,
    isFreeDragging,
    activePos,
    freeStyle,
    startPointerDrag,
    bodyPointerDown,
    dockItem,
  } = useFreeDrag({
    itemId,
    targetRef: ref,
    freePositions: layout.freePositions,
    snapToGrid: layout.snapToGrid,
    onSetPosition: onSetFreePosition,
  });
  const reorder = useReorderArm();

  return (
    <div
      ref={ref}
      style={freeStyle}
      className={`topbar-pill-slot ${editMode ? 'is-editable-pill' : ''} ${
        dragOverPill === pillId ? 'is-drag-over' : ''
      } ${draggedPill === pillId || isFreeDragging ? 'is-dragging' : ''} ${
        isFree ? 'is-free-placed' : ''
      }`}
      {...reorder}
      onPointerDown={
        editMode ? (e) => bodyPointerDown(e, ref.current) : undefined
      }
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(PILL_MIME, pillId);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(pillId);
      }}
      onDragOver={(e) => {
        if (!draggedPill && !e.dataTransfer.types.includes(PILL_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragOver(pillId);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(pillId);
      }}
      onDrop={(e) => {
        if (!draggedPill && !e.dataTransfer.types.includes(PILL_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDropOnPill(pillId);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd();
      }}
    >
      {editMode && (
        <div className="pill-edit-badge">
          <span
            data-reorder-grip
            className="pill-drag-grip"
            title={`Drag "${PILL_LABELS[pillId]}" to any corner or reorder`}
          >
            <GripIcon size={11} />
          </span>
          <FreeMoveBadge
            label={PILL_LABELS[pillId]}
            isFree={isFree}
            activePos={activePos}
            onStartFreeDrag={(e) => startPointerDrag(e, ref.current)}
            onDock={dockItem}
            compact
          />
        </div>
      )}
      {children}
    </div>
  );
}

function DashboardSectionWrapper({
  id,
  idx,
  totalVisible,
  editMode,
  layout,
  draggedSection,
  dragOverSection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveBy,
  onHide,
  onSetFreePosition,
  children,
}: {
  id: DashboardSectionId;
  idx: number;
  totalVisible: number;
  editMode: boolean;
  layout: LayoutSettings;
  draggedSection: DashboardSectionId | null;
  dragOverSection: DashboardSectionId | null;
  onDragStart: (id: DashboardSectionId) => void;
  onDragOver: (id: DashboardSectionId) => void;
  onDragLeave: (id: DashboardSectionId) => void;
  onDrop: (id: DashboardSectionId) => void;
  onDragEnd: () => void;
  onMoveBy: (id: DashboardSectionId, delta: -1 | 1) => void;
  onHide: (id: DashboardSectionId) => void;
  onSetFreePosition: (itemId: string, pos: FreePosition | null) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemId = `section:${id}`;
  const {
    isFree,
    isFreeDragging,
    activePos,
    freeStyle,
    startPointerDrag,
    bodyPointerDown,
    dockItem,
  } = useFreeDrag({
    itemId,
    targetRef: ref,
    freePositions: layout.freePositions,
    snapToGrid: layout.snapToGrid,
    onSetPosition: onSetFreePosition,
  });
  const reorder = useReorderArm();

  return (
    <div
      ref={ref}
      style={freeStyle}
      className={`dashboard-section-slot ${
        editMode ? 'is-editable-section' : ''
      } ${dragOverSection === id ? 'is-section-drag-over' : ''} ${
        draggedSection === id || isFreeDragging ? 'is-section-dragging' : ''
      } ${isFree ? 'is-free-placed' : ''}`}
      {...reorder}
      onPointerDown={
        editMode ? (e) => bodyPointerDown(e, ref.current) : undefined
      }
      onDragStart={(e) => {
        e.dataTransfer.setData(SECTION_MIME, id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(id);
      }}
      onDragOver={(e) => {
        if (
          !draggedSection &&
          !e.dataTransfer.types.includes(SECTION_MIME)
        ) {
          return;
        }
        e.preventDefault();
        onDragOver(id);
      }}
      onDragLeave={() => {
        onDragLeave(id);
      }}
      onDrop={(e) => {
        if (
          !draggedSection &&
          !e.dataTransfer.types.includes(SECTION_MIME)
        ) {
          return;
        }
        e.preventDefault();
        onDrop(id);
      }}
      onDragEnd={onDragEnd}
    >
      {editMode && (
        <div className="section-edit-bar">
          <span
            data-reorder-grip
            className="section-edit-label"
            title="Drag to swap section order"
          >
            <GripIcon size={13} />
            {SECTION_TITLES[id]}
          </span>
          <div className="section-edit-controls">
            <FreeMoveBadge
              label={SECTION_TITLES[id]}
              isFree={isFree}
              activePos={activePos}
              onStartFreeDrag={(e) => startPointerDrag(e, ref.current)}
              onDock={dockItem}
            />
            <button
              type="button"
              className="icon-btn-tiny"
              onClick={() => onMoveBy(id, -1)}
              disabled={idx === 0}
              title="Move section up"
              aria-label={`Move ${SECTION_TITLES[id]} up`}
            >
              <ArrowUpIcon size={12} />
            </button>
            <button
              type="button"
              className="icon-btn-tiny"
              onClick={() => onMoveBy(id, 1)}
              disabled={idx === totalVisible - 1}
              title="Move section down"
              aria-label={`Move ${SECTION_TITLES[id]} down`}
            >
              <ArrowDownIcon size={12} />
            </button>
            <button
              type="button"
              className="icon-btn-tiny danger"
              onClick={() => onHide(id)}
              title={`Hide ${SECTION_TITLES[id]}`}
              aria-label={`Hide ${SECTION_TITLES[id]}`}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
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

  const [draggedPill, setDraggedPill] = useState<TopbarPillId | null>(null);
  const [dragOverPill, setDragOverPill] = useState<TopbarPillId | null>(null);
  const [dragOverCorner, setDragOverCorner] = useState<TopbarCorner | null>(
    null
  );

  const [draggedClusterPart, setDraggedClusterPart] =
    useState<LinksClusterPartId | null>(null);
  const [armedClusterPart, setArmedClusterPart] =
    useState<LinksClusterPartId | null>(null);
  const [dragOverClusterPart, setDragOverClusterPart] =
    useState<LinksClusterPartId | null>(null);

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

  const setFreePosition = (itemId: string, pos: FreePosition | null) => {
    updateSettings((prev) => {
      const nextMap = { ...prev.layout.freePositions };
      if (pos === null) {
        delete nextMap[itemId];
      } else {
        nextMap[itemId] = pos;
      }
      return {
        ...prev,
        layout: {
          ...prev.layout,
          freePositions: nextMap,
        },
      };
    });
  };

  const resetAllFreePositions = () => {
    updateSettings((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        freePositions: {},
      },
    }));
  };

  const toggleSnapToGrid = () => {
    updateSettings((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        snapToGrid: !prev.layout.snapToGrid,
      },
    }));
  };

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

  const movePillToCorner = (pillId: TopbarPillId, targetCorner: TopbarCorner) => {
    updateSettings((prev) => {
      const corners = structuredClone(prev.layout.topbarCorners);
      for (const c of CORNERS) {
        corners[c] = corners[c].filter((p) => p !== pillId);
      }
      corners[targetCorner].push(pillId);
      // Also dock it if it was free-floating so dropping in a corner zone snaps it there
      const nextFree = { ...prev.layout.freePositions };
      delete nextFree[`pill:${pillId}`];
      return {
        ...prev,
        layout: {
          ...prev.layout,
          topbarCorners: corners,
          freePositions: nextFree,
        },
      };
    });
  };

  const movePillOntoPill = (fromId: TopbarPillId, toId: TopbarPillId) => {
    if (fromId === toId) return;
    updateSettings((prev) => {
      const corners = structuredClone(prev.layout.topbarCorners);
      let targetCorner: TopbarCorner = 'top-right';
      for (const c of CORNERS) {
        if (corners[c].includes(toId)) {
          targetCorner = c;
        }
        corners[c] = corners[c].filter((p) => p !== fromId);
      }
      const targetList = corners[targetCorner];
      const toIdx = targetList.indexOf(toId);
      if (toIdx === -1) {
        targetList.push(fromId);
      } else {
        targetList.splice(toIdx, 0, fromId);
      }
      const nextFree = { ...prev.layout.freePositions };
      delete nextFree[`pill:${fromId}`];
      return {
        ...prev,
        layout: {
          ...prev.layout,
          topbarCorners: corners,
          freePositions: nextFree,
        },
      };
    });
  };

  const swapClusterParts = (
    fromId: LinksClusterPartId,
    toId: LinksClusterPartId
  ) => {
    if (fromId === toId) return;
    updateSettings((prev) => {
      const order = [...prev.layout.linksClusterOrder];
      const fromIdx = order.indexOf(fromId);
      const toIdx = order.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      return {
        ...prev,
        layout: { ...prev.layout, linksClusterOrder: order },
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

  const isPillVisible = (pillId: TopbarPillId): boolean => {
    switch (pillId) {
      case 'bookmarks':
        return settings.visibility.bookmarks;
      case 'weather':
        return settings.weather.enabled;
      case 'sync':
        return rootSync.info.status === 'needs-permission';
      case 'edit':
        return true;
      case 'settings':
        return true;
    }
  };

  const renderPillContent = (pillId: TopbarPillId) => {
    switch (pillId) {
      case 'bookmarks':
        return (
          <button
            type="button"
            className="topbar-pill surface-card"
            onClick={() => setBookmarksOpen(true)}
            aria-label="Open Bookmarks"
          >
            <BookmarkIcon size={15} />
            <span>Bookmarks</span>
          </button>
        );
      case 'weather':
        return (
          <WeatherPill
            weather={settings.weather}
            onUpdateWeather={(weather) =>
              updateSettings((prev) => ({ ...prev, weather }))
            }
          />
        );
      case 'sync':
        return (
          <button
            type="button"
            className="topbar-pill surface-card"
            onClick={() => void rootSync.reconnectFile()}
            title="Reconnect write access to bonjorno.config.json"
          >
            <span>Sync Config</span>
          </button>
        );
      case 'edit':
        return (
          <button
            type="button"
            className={`topbar-pill surface-card ${
              editMode ? 'is-edit-active' : ''
            }`}
            onClick={() => setEditMode((prev) => !prev)}
            aria-pressed={editMode}
            title="Toggle Edit Mode (drag & drop anything anywhere)"
          >
            {editMode ? <CheckIcon size={15} /> : <EditIcon size={15} />}
            {/* Both labels share one grid cell so the pill width never changes. */}
            <span className="edit-toggle-label">
              <span aria-hidden={!editMode} className={editMode ? '' : 'is-hidden'}>
                Done
              </span>
              <span aria-hidden={editMode} className={editMode ? 'is-hidden' : ''}>
                Edit
              </span>
            </span>
          </button>
        );
      case 'settings':
        return (
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
        );
    }
  };

  const renderCornerZone = (corner: TopbarCorner) => {
    const pills = settings.layout.topbarCorners[corner].filter(isPillVisible);
    const isOver = dragOverCorner === corner;
    if (pills.length === 0 && !editMode && !draggedPill) {
      return <div key={corner} className={`corner-zone corner-${corner} is-empty-corner`} />;
    }

    return (
      <div
        key={corner}
        className={`corner-zone corner-${corner} ${
          editMode ? 'is-editable-corner' : ''
        } ${isOver ? 'is-corner-drag-over' : ''}`}
        aria-label={`${CORNER_LABELS[corner]} corner slot`}
        onDragOver={(e) => {
          if (!draggedPill && !e.dataTransfer.types.includes(PILL_MIME)) return;
          e.preventDefault();
          if (dragOverCorner !== corner) setDragOverCorner(corner);
        }}
        onDragLeave={() => {
          if (dragOverCorner === corner) setDragOverCorner(null);
        }}
        onDrop={(e) => {
          if (!draggedPill && !e.dataTransfer.types.includes(PILL_MIME)) return;
          e.preventDefault();
          const pillId =
            draggedPill || (e.dataTransfer.getData(PILL_MIME) as TopbarPillId);
          if (pillId) {
            movePillToCorner(pillId, corner);
          }
          setDraggedPill(null);
          setDragOverPill(null);
          setDragOverCorner(null);
        }}
      >
        {editMode && pills.length === 0 && (
          <span className="corner-placeholder-hint">
            Drop pill in {CORNER_LABELS[corner]}
          </span>
        )}
        {pills.map((pillId) => (
          <DraggablePillSlot
            key={pillId}
            pillId={pillId}
            editMode={editMode}
            layout={settings.layout}
            draggedPill={draggedPill}
            dragOverPill={dragOverPill}
            onDragStart={(id) => setDraggedPill(id)}
            onDragOver={(id) => {
              if (dragOverPill !== id) setDragOverPill(id);
            }}
            onDragLeave={(id) => {
              if (dragOverPill === id) setDragOverPill(null);
            }}
            onDropOnPill={(targetId) => {
              if (draggedPill) {
                movePillOntoPill(draggedPill, targetId);
              }
              setDraggedPill(null);
              setDragOverPill(null);
              setDragOverCorner(null);
            }}
            onDragEnd={() => {
              setDraggedPill(null);
              setDragOverPill(null);
              setDragOverCorner(null);
            }}
            onSetFreePosition={setFreePosition}
          >
            {renderPillContent(pillId)}
          </DraggablePillSlot>
        ))}
      </div>
    );
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
            onSetFreePosition={setFreePosition}
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
      case 'quickLinks': {
        const visibleParts = settings.layout.linksClusterOrder.filter((part) =>
          part === 'quickLinks'
            ? settings.visibility.quickLinks
            : settings.visibility.topSites
        );
        return (
          <div className="links-cluster">
            {visibleParts.map((partId) => (
              <div
                key={partId}
                className={`cluster-part-slot ${
                  dragOverClusterPart === partId ? 'is-drag-over' : ''
                } ${draggedClusterPart === partId ? 'is-dragging' : ''}`}
                data-drag-slot=""
                draggable={
                  editMode &&
                  visibleParts.length > 1 &&
                  armedClusterPart === partId
                }
                onPointerDownCapture={(e) => {
                  const grip = (e.target as Element).closest?.(
                    '[data-reorder-grip]'
                  );
                  if (!grip || grip.closest('[data-drag-slot]') !== e.currentTarget) {
                    return;
                  }
                  setArmedClusterPart(partId);
                  const reset = () => {
                    setArmedClusterPart(null);
                    window.removeEventListener('pointerup', reset);
                    window.removeEventListener('dragend', reset, true);
                  };
                  window.addEventListener('pointerup', reset);
                  window.addEventListener('dragend', reset, true);
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData(CLUSTER_PART_MIME, partId);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedClusterPart(partId);
                }}
                onDragOver={(e) => {
                  if (
                    !draggedClusterPart &&
                    !e.dataTransfer.types.includes(CLUSTER_PART_MIME)
                  ) {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragOverClusterPart !== partId) {
                    setDragOverClusterPart(partId);
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dragOverClusterPart === partId) {
                    setDragOverClusterPart(null);
                  }
                }}
                onDrop={(e) => {
                  if (
                    !draggedClusterPart &&
                    !e.dataTransfer.types.includes(CLUSTER_PART_MIME)
                  ) {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedClusterPart) {
                    swapClusterParts(draggedClusterPart, partId);
                  }
                  setDraggedClusterPart(null);
                  setDragOverClusterPart(null);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggedClusterPart(null);
                  setDragOverClusterPart(null);
                }}
              >
                {partId === 'quickLinks' ? (
                  <QuickLinks
                    links={settings.quickLinks}
                    layout={settings.layout}
                    openInNewTab={settings.behavior.openLinksInNewTab}
                    editMode={editMode}
                    onToggleEditMode={() => setEditMode((prev) => !prev)}
                    onChange={(quickLinks) =>
                      updateSettings((prev) => ({ ...prev, quickLinks }))
                    }
                    onSetFreePosition={setFreePosition}
                  />
                ) : (
                  <TopSitesBar
                    openInNewTab={settings.behavior.openLinksInNewTab}
                    editMode={editMode}
                    layout={settings.layout}
                    onSetFreePosition={setFreePosition}
                  />
                )}
              </div>
            ))}
          </div>
        );
      }
      case 'widgets':
        return (
          <WidgetsPanel
            showTodo={settings.visibility.todo}
            showNotes={settings.visibility.notes}
            widgetOrder={settings.layout.widgetOrder}
            layout={settings.layout}
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
            onSetFreePosition={setFreePosition}
          />
        );
    }
  };

  const visibleSections = settings.layout.sectionOrder.filter(isSectionVisible);
  const freeCount = Object.keys(settings.layout.freePositions).length;

  return (
    <div
      className={`app-shell ${loaded ? 'is-ready' : ''} ${
        editMode ? 'is-edit-mode' : ''
      } ${editMode && settings.layout.snapToGrid ? 'show-snap-grid' : ''}`}
    >
      <BackgroundLayer appearance={settings.appearance} />

      <header className="topbar">
        {renderCornerZone('top-left')}
        {saveError && (
          <span className="save-error-pill" role="alert">
            {saveError}
          </span>
        )}
        {renderCornerZone('top-right')}
      </header>

      {editMode && (
        <div
          className="edit-mode-banner surface-popover"
          role="region"
          aria-label="Edit mode controls"
        >
          <div className="edit-banner-info">
            <span className="edit-banner-dot" aria-hidden="true" />
            <span>
              <strong>Edit Mode:</strong> Grab anything and drag it where you
              want it. Drag a grip icon to swap slots instead.
            </span>
          </div>
          <div className="edit-banner-actions">
            <button
              type="button"
              className={`mini-chip-btn ${
                settings.layout.snapToGrid ? 'is-chip-active' : ''
              }`}
              onClick={toggleSnapToGrid}
              aria-pressed={settings.layout.snapToGrid}
              title="Snap free-placed items to a 2% alignment grid (hold Alt while dragging to bypass)"
            >
              <GridIcon size={12} />
              <span>
                Grid Snap: {settings.layout.snapToGrid ? 'On' : 'Off'}
              </span>
            </button>
            {freeCount > 0 && (
              <button
                type="button"
                className="mini-chip-btn"
                onClick={resetAllFreePositions}
                title="Dock all free-floating items back into their structured slots"
              >
                <PinIcon size={12} />
                <span>Dock All ({freeCount})</span>
              </button>
            )}
            <button
              type="button"
              className="mini-chip-btn is-chip-primary"
              onClick={() => setEditMode(false)}
            >
              <CheckIcon size={12} />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <div className="dashboard-stack">
          {visibleSections.map((id, idx) => (
            <DashboardSectionWrapper
              key={id}
              id={id}
              idx={idx}
              totalVisible={visibleSections.length}
              editMode={editMode}
              layout={settings.layout}
              draggedSection={draggedSection}
              dragOverSection={dragOverSection}
              onDragStart={(secId) => setDraggedSection(secId)}
              onDragOver={(secId) => {
                if (dragOverSection !== secId) setDragOverSection(secId);
              }}
              onDragLeave={(secId) => {
                if (dragOverSection === secId) setDragOverSection(null);
              }}
              onDrop={(targetId) => {
                if (draggedSection) {
                  reorderSection(draggedSection, targetId);
                }
                setDraggedSection(null);
                setDragOverSection(null);
              }}
              onDragEnd={() => {
                setDraggedSection(null);
                setDragOverSection(null);
              }}
              onMoveBy={moveSectionBy}
              onHide={hideSection}
              onSetFreePosition={setFreePosition}
            >
              {renderSectionContent(id)}
            </DashboardSectionWrapper>
          ))}
        </div>
      </main>

      {loaded && settings.visibility.musicPlayer && (
        <MusicPlayer
          editMode={editMode}
          layout={settings.layout}
          onSetPosition={setFreePosition}
          onClose={() => updateSettings((prev) => ({
            ...prev,
            visibility: { ...prev.visibility, musicPlayer: false },
          }))}
        />
      )}

      {(editMode ||
        settings.layout.topbarCorners['bottom-left'].some(isPillVisible) ||
        settings.layout.topbarCorners['bottom-right'].some(isPillVisible)) && (
        <footer className="bottombar">
          {renderCornerZone('bottom-left')}
          {renderCornerZone('bottom-right')}
        </footer>
      )}

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
