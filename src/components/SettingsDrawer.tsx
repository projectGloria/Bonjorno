import { useEffect, useRef, useState } from 'react';
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  SEARCH_ENGINES,
  SOLID_PRESETS,
} from '../constants/defaults';
import { GRADIENT_PRESETS, SCENE_PRESETS } from '../constants/wallpapers';
import type { RootSyncActions } from '../hooks/useSettings';
import { ROOT_CONFIG_FILENAME } from '../services/localConfigSync';
import {
  hasOptionalPermission,
  isExtensionContext,
  requestOptionalPermission,
  revokeOptionalPermission,
  type OptionalPermission,
} from '../services/chromeApi';
import {
  clearAllBackgroundBlobs,
  deleteBackgroundBlob,
  optimizeUploadedImage,
  saveBackgroundBlob,
} from '../services/imageStore';
import {
  createExportPayload,
  parseImportJson,
} from '../services/settingsStorage';
import type {
  BackgroundFit,
  BackgroundMode,
  BackgroundPosition,
  BuiltinSearchEngineId,
  ClockStyle,
  DashboardSectionId,
  DateFormat,
  DensityMode,
  ExtensionSettings,
  GreetingStyle,
  QuickLinkLayout,
  ThemeMode,
} from '../types/settings';
import { ConfirmDialog } from './ConfirmDialog';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  DownloadIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';

type SettingsTab = 'appearance' | 'layout' | 'behavior' | 'data';

const SECTION_LABELS: Record<DashboardSectionId, string> = {
  hero: 'Clock, Date & Greeting',
  search: 'Search Bar',
  quickLinks: 'Quick Links',
  widgets: 'Tasks & Notes Widgets',
};

interface SettingsDrawerProps {
  open: boolean;
  settings: ExtensionSettings;
  rootSync: RootSyncActions;
  onUpdate: (updater: (prev: ExtensionSettings) => ExtensionSettings) => void;
  onReplace: (next: ExtensionSettings) => void;
  onClose: () => void;
}

export function SettingsDrawer({
  open,
  settings,
  rootSync,
  onUpdate,
  onReplace,
  onClose,
}: SettingsDrawerProps) {
  const [tab, setTab] = useState<SettingsTab>('appearance');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [syncMessage, setSyncMessage] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [permState, setPermState] = useState<Record<OptionalPermission, boolean>>({
    bookmarks: false,
    topSites: false,
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmReset) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, confirmReset, onClose]);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      hasOptionalPermission('bookmarks'),
      hasOptionalPermission('topSites'),
    ]).then(([bookmarks, topSites]) => {
      setPermState({ bookmarks, topSites });
    });
  }, [open, tab]);

  if (!open) return null;

  const { appearance, layout, behavior, visibility, weather } = settings;

  const setAppearance = (patch: Partial<ExtensionSettings['appearance']>) =>
    onUpdate((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...patch },
    }));

  const setLayout = (patch: Partial<ExtensionSettings['layout']>) =>
    onUpdate((prev) => ({
      ...prev,
      layout: { ...prev.layout, ...patch },
    }));

  const setBehavior = (patch: Partial<ExtensionSettings['behavior']>) =>
    onUpdate((prev) => ({
      ...prev,
      behavior: { ...prev.behavior, ...patch },
    }));

  const setVisibility = (patch: Partial<ExtensionSettings['visibility']>) =>
    onUpdate((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, ...patch },
    }));

  const moveSection = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= layout.sectionOrder.length) return;
    const next = [...layout.sectionOrder];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setLayout({ sectionOrder: next });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const optimized = await optimizeUploadedImage(file);
      const id = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await saveBackgroundBlob(id, optimized);
      const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Custom image';
      onUpdate((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          backgroundMode: 'custom',
          customImageId: id,
          customImages: [
            { id, name: cleanName, addedAt: Date.now() },
            ...prev.appearance.customImages,
          ].slice(0, 20),
        },
      }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to save background image.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustomImage = async (id: string) => {
    await deleteBackgroundBlob(id);
    onUpdate((prev) => {
      const remaining = prev.appearance.customImages.filter((i) => i.id !== id);
      const nextId =
        prev.appearance.customImageId === id
          ? remaining[0]?.id ?? null
          : prev.appearance.customImageId;
      return {
        ...prev,
        appearance: {
          ...prev.appearance,
          customImages: remaining,
          customImageId: nextId,
          backgroundMode:
            prev.appearance.backgroundMode === 'custom' && !nextId
              ? 'gradient'
              : prev.appearance.backgroundMode,
        },
      };
    });
  };

  const handleExport = () => {
    const payload = createExportPayload(settings);
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ROOT_CONFIG_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus({
      kind: 'ok',
      text: `Exported ${ROOT_CONFIG_FILENAME}. Place it in the repo root folder to keep it with your project.`,
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseImportJson(text);
      if (!result.ok) {
        setImportStatus({ kind: 'err', text: result.error });
        return;
      }
      onReplace(result.settings);
      setImportStatus({
        kind: 'ok',
        text: 'Configuration imported and applied.',
      });
    } catch {
      setImportStatus({
        kind: 'err',
        text: 'Could not read the selected file.',
      });
    }
  };

  const handleResetConfirmed = async () => {
    await clearAllBackgroundBlobs();
    onReplace(structuredClone(DEFAULT_SETTINGS));
    setConfirmReset(false);
    setImportStatus({ kind: 'ok', text: 'All settings restored to defaults.' });
  };

  const togglePermission = async (perm: OptionalPermission) => {
    if (permState[perm]) {
      const removed = await revokeOptionalPermission(perm);
      if (removed) {
        setPermState((p) => ({ ...p, [perm]: false }));
      }
    } else {
      const granted = await requestOptionalPermission(perm);
      setPermState((p) => ({ ...p, [perm]: granted }));
    }
  };

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bonjorno Settings"
      onClick={onClose}
    >
      <aside
        className="drawer-panel drawer-right surface-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <h2>Settings</h2>
            <p className="drawer-subtitle">Changes save automatically</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="settings-tabs" role="tablist" aria-label="Settings sections">
          {(
            [
              ['appearance', 'Appearance'],
              ['layout', 'Layout'],
              ['behavior', 'Behavior'],
              ['data', 'Privacy & Data'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`settings-tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="drawer-body settings-body">
          {tab === 'appearance' && (
            <>
              <div className="settings-group">
                <h3>Theme</h3>
                <div className="segmented-control">
                  {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`segment-btn ${
                        appearance.theme === mode ? 'is-active' : ''
                      }`}
                      onClick={() => setAppearance({ theme: mode })}
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>Accent Color</h3>
                <div className="swatch-row">
                  {ACCENT_PRESETS.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      className={`color-swatch ${
                        appearance.accentColor.toLowerCase() ===
                        swatch.hex.toLowerCase()
                          ? 'is-active'
                          : ''
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => setAppearance({ accentColor: swatch.hex })}
                      title={swatch.name}
                      aria-label={`Accent ${swatch.name}`}
                    />
                  ))}
                  <label className="color-picker-chip" title="Custom accent color">
                    <input
                      type="color"
                      value={appearance.accentColor}
                      onChange={(e) =>
                        setAppearance({ accentColor: e.target.value })
                      }
                      aria-label="Pick custom accent color"
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>Background</h3>
                <div className="segmented-control">
                  {(
                    [
                      ['solid', 'Solid'],
                      ['gradient', 'Gradient'],
                      ['scene', 'Scenes'],
                      ['custom', 'Image'],
                    ] as [BackgroundMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`segment-btn ${
                        appearance.backgroundMode === mode ? 'is-active' : ''
                      }`}
                      onClick={() => setAppearance({ backgroundMode: mode })}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {appearance.backgroundMode === 'solid' && (
                  <div className="swatch-row mt-sm">
                    {SOLID_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        className={`color-swatch ${
                          appearance.solidColor.toLowerCase() ===
                          preset.hex.toLowerCase()
                            ? 'is-active'
                            : ''
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => setAppearance({ solidColor: preset.hex })}
                        title={preset.name}
                        aria-label={`Solid background ${preset.name}`}
                      />
                    ))}
                    <label className="color-picker-chip" title="Custom background color">
                      <input
                        type="color"
                        value={appearance.solidColor}
                        onChange={(e) =>
                          setAppearance({ solidColor: e.target.value })
                        }
                        aria-label="Pick custom background color"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                )}

                {appearance.backgroundMode === 'gradient' && (
                  <div className="preset-grid mt-sm">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`preset-tile ${
                          appearance.gradientId === preset.id ? 'is-active' : ''
                        }`}
                        onClick={() => setAppearance({ gradientId: preset.id })}
                      >
                        <span
                          className="preset-preview"
                          style={{ background: preset.preview }}
                        />
                        <span className="preset-name">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {appearance.backgroundMode === 'scene' && (
                  <div className="preset-grid mt-sm">
                    {SCENE_PRESETS.map((scene) => (
                      <button
                        key={scene.id}
                        type="button"
                        className={`preset-tile ${
                          appearance.sceneId === scene.id ? 'is-active' : ''
                        }`}
                        onClick={() => setAppearance({ sceneId: scene.id })}
                      >
                        <span
                          className="preset-preview"
                          style={{ background: scene.preview }}
                        />
                        <span className="preset-name">{scene.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {appearance.backgroundMode === 'custom' && (
                  <div className="custom-bg-panel mt-sm">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                      className="sr-only"
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      className="btn-secondary btn-full"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <UploadIcon size={15} />
                      {uploading ? 'Optimizing image...' : 'Upload Background Image'}
                    </button>
                    {uploadError && <p className="field-error">{uploadError}</p>}

                    {appearance.customImages.length > 0 && (
                      <div className="custom-image-list">
                        {appearance.customImages.map((img) => (
                          <div
                            key={img.id}
                            className={`custom-image-row ${
                              appearance.customImageId === img.id ? 'is-active' : ''
                            }`}
                          >
                            <button
                              type="button"
                              className="custom-image-select"
                              onClick={() =>
                                setAppearance({ customImageId: img.id })
                              }
                            >
                              {img.name}
                            </button>
                            <button
                              type="button"
                              className="icon-btn-tiny danger"
                              onClick={() => handleRemoveCustomImage(img.id)}
                              aria-label={`Remove ${img.name}`}
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="settings-inline-row">
                      <label className="field-group">
                        <span className="field-label">Scaling</span>
                        <select
                          className="select-input"
                          value={appearance.backgroundFit}
                          onChange={(e) =>
                            setAppearance({
                              backgroundFit: e.target.value as BackgroundFit,
                            })
                          }
                        >
                          <option value="cover">Cover (Fill)</option>
                          <option value="contain">Contain (Fit)</option>
                          <option value="center">Original Size</option>
                        </select>
                      </label>

                      <label className="field-group">
                        <span className="field-label">Position</span>
                        <select
                          className="select-input"
                          value={appearance.backgroundPosition}
                          onChange={(e) =>
                            setAppearance({
                              backgroundPosition: e.target
                                .value as BackgroundPosition,
                            })
                          }
                        >
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {(appearance.backgroundMode === 'custom' ||
                  appearance.backgroundMode === 'scene') && (
                  <div className="sliders-stack mt-sm">
                    <label className="slider-row">
                      <div className="slider-label-row">
                        <span>Background Dim</span>
                        <span>{appearance.backgroundDim}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={75}
                        value={appearance.backgroundDim}
                        onChange={(e) =>
                          setAppearance({ backgroundDim: Number(e.target.value) })
                        }
                      />
                    </label>

                    <label className="slider-row">
                      <div className="slider-label-row">
                        <span>Background Blur</span>
                        <span>{appearance.backgroundBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        value={appearance.backgroundBlur}
                        onChange={(e) =>
                          setAppearance({ backgroundBlur: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="settings-group">
                <h3>Surface Transparency</h3>
                <label className="slider-row">
                  <div className="slider-label-row">
                    <span>Card & Bar Opacity</span>
                    <span>{appearance.surfaceOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={98}
                    value={appearance.surfaceOpacity}
                    onChange={(e) =>
                      setAppearance({ surfaceOpacity: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {tab === 'layout' && (
            <>
              <div className="settings-group">
                <h3>Dashboard Components</h3>
                <div className="toggle-list">
                  {(
                    [
                      ['clock', 'Clock'],
                      ['date', 'Date'],
                      ['greeting', 'Greeting'],
                      ['search', 'Search Bar'],
                      ['quickLinks', 'Quick Links'],
                      ['bookmarks', 'Bookmarks Button (Optional Permission)'],
                      ['topSites', 'Most Visited Sites (Optional Permission)'],
                      ['todo', 'Tasks List Widget'],
                      ['notes', 'Notes Scratchpad Widget'],
                    ] as [keyof ExtensionSettings['visibility'], string][]
                  ).map(([key, label]) => (
                    <label key={key} className="toggle-row">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        className="toggle-switch"
                        checked={visibility[key]}
                        onChange={(e) =>
                          setVisibility({ [key]: e.target.checked })
                        }
                      />
                    </label>
                  ))}

                  <label className="toggle-row">
                    <span>Weather Pill (Opt-in Open-Meteo)</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={weather.enabled}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          weather: {
                            ...prev.weather,
                            enabled: e.target.checked,
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>Section Order</h3>
                <div className="order-list">
                  {layout.sectionOrder.map((secId, idx) => (
                    <div key={secId} className="order-row">
                      <span>{SECTION_LABELS[secId]}</span>
                      <div className="order-btns">
                        <button
                          type="button"
                          className="icon-btn-tiny"
                          disabled={idx === 0}
                          onClick={() => moveSection(idx, -1)}
                          aria-label={`Move ${SECTION_LABELS[secId]} up`}
                        >
                          <ArrowUpIcon size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn-tiny"
                          disabled={idx === layout.sectionOrder.length - 1}
                          onClick={() => moveSection(idx, 1)}
                          aria-label={`Move ${SECTION_LABELS[secId]} down`}
                        >
                          <ArrowDownIcon size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>Spacing & Density</h3>
                <div className="segmented-control">
                  {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map(
                    (d) => (
                      <button
                        key={d}
                        type="button"
                        className={`segment-btn ${
                          layout.density === d ? 'is-active' : ''
                        }`}
                        onClick={() => setLayout({ density: d })}
                      >
                        {d[0].toUpperCase() + d.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="settings-group">
                <h3>Clock & Greeting Style</h3>
                <div className="settings-inline-row">
                  <label className="field-group">
                    <span className="field-label">Clock Style</span>
                    <select
                      className="select-input"
                      value={layout.clockStyle}
                      onChange={(e) =>
                        setLayout({ clockStyle: e.target.value as ClockStyle })
                      }
                    >
                      <option value="editorial">Editorial</option>
                      <option value="display">Display Bold</option>
                      <option value="mono">Monospace</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </label>

                  <label className="field-group">
                    <span className="field-label">Greeting Style</span>
                    <select
                      className="select-input"
                      value={layout.greetingStyle}
                      onChange={(e) =>
                        setLayout({
                          greetingStyle: e.target.value as GreetingStyle,
                        })
                      }
                    >
                      <option value="subtle">Subtle Stack</option>
                      <option value="centered">Centered</option>
                      <option value="inline">Inline with Date</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>Quick Links Layout</h3>
                <div className="segmented-control">
                  {(
                    [
                      ['grid', 'Grid'],
                      ['compact', 'Chips'],
                      ['dock', 'Dock'],
                      ['list', 'List'],
                    ] as [QuickLinkLayout, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`segment-btn ${
                        layout.quickLinkLayout === id ? 'is-active' : ''
                      }`}
                      onClick={() => setLayout({ quickLinkLayout: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {layout.quickLinkLayout === 'grid' && (
                  <label className="slider-row mt-sm">
                    <div className="slider-label-row">
                      <span>Grid Columns</span>
                      <span>{layout.quickLinkColumns}</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={8}
                      value={layout.quickLinkColumns}
                      onChange={(e) =>
                        setLayout({ quickLinkColumns: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
              </div>

              <div className="settings-group">
                <h3>Free-Form Canvas &amp; Corners</h3>
                <label className="toggle-row">
                  <span>Snap free-placed items to alignment grid</span>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={layout.snapToGrid}
                    onChange={(e) =>
                      setLayout({ snapToGrid: e.target.checked })
                    }
                  />
                </label>
                <div className="data-actions-row mt-sm">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={Object.keys(layout.freePositions).length === 0}
                    onClick={() => setLayout({ freePositions: {} })}
                  >
                    Dock Free Items ({Object.keys(layout.freePositions).length})
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() =>
                      setLayout({
                        topbarCorners: structuredClone(
                          DEFAULT_SETTINGS.layout.topbarCorners
                        ),
                        heroOrder: [...DEFAULT_SETTINGS.layout.heroOrder],
                        linksClusterOrder: [
                          ...DEFAULT_SETTINGS.layout.linksClusterOrder,
                        ],
                      })
                    }
                  >
                    Reset Slots &amp; Corners
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'behavior' && (
            <>
              <div className="settings-group">
                <h3>Search</h3>
                <label className="field-group">
                  <span className="field-label">Default Search Engine</span>
                  <select
                    className="select-input"
                    value={behavior.searchEngine}
                    onChange={(e) =>
                      setBehavior({
                        searchEngine: e.target.value as BuiltinSearchEngineId,
                      })
                    }
                  >
                    {SEARCH_ENGINES.map((engine) => (
                      <option key={engine.id} value={engine.id}>
                        {engine.name}
                      </option>
                    ))}
                    <option value="custom">Custom Search Engine</option>
                  </select>
                </label>

                {behavior.searchEngine === 'custom' && (
                  <div className="custom-engine-fields mt-sm">
                    <label className="field-group">
                      <span className="field-label">Custom Engine Name</span>
                      <input
                        type="text"
                        className="text-input"
                        value={behavior.customSearchName}
                        onChange={(e) =>
                          setBehavior({ customSearchName: e.target.value })
                        }
                        placeholder="e.g. SearXNG"
                      />
                    </label>
                    <label className="field-group">
                      <span className="field-label">
                        Search URL (use %s for query)
                      </span>
                      <input
                        type="url"
                        className="text-input"
                        value={behavior.customSearchUrl}
                        onChange={(e) =>
                          setBehavior({ customSearchUrl: e.target.value })
                        }
                        placeholder="https://example.com/search?q=%s"
                      />
                    </label>
                  </div>
                )}

                <div className="toggle-list mt-sm">
                  <label className="toggle-row">
                    <span>Focus search bar on new tab</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={behavior.autoFocusSearch}
                      onChange={(e) =>
                        setBehavior({ autoFocusSearch: e.target.checked })
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>Open searches & links in new tab</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={behavior.openLinksInNewTab}
                      onChange={(e) =>
                        setBehavior({ openLinksInNewTab: e.target.checked })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>Clock & Date</h3>
                <div className="toggle-list">
                  <label className="toggle-row">
                    <span>24-hour clock</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={behavior.use24HourClock}
                      onChange={(e) =>
                        setBehavior({ use24HourClock: e.target.checked })
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>Show seconds</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={behavior.showSeconds}
                      onChange={(e) =>
                        setBehavior({ showSeconds: e.target.checked })
                      }
                    />
                  </label>
                </div>

                <label className="field-group mt-sm">
                  <span className="field-label">Date Format</span>
                  <select
                    className="select-input"
                    value={behavior.dateFormat}
                    onChange={(e) =>
                      setBehavior({ dateFormat: e.target.value as DateFormat })
                    }
                  >
                    <option value="long">Long (Thursday, November 19)</option>
                    <option value="short">Short (Thu, Nov 19, 2026)</option>
                    <option value="numeric">Numeric (11/19/2026)</option>
                    <option value="iso">ISO (2026-11-19)</option>
                  </select>
                </label>
              </div>

              <div className="settings-group">
                <h3>Greeting</h3>
                <label className="field-group">
                  <span className="field-label">Your Name (optional)</span>
                  <input
                    type="text"
                    className="text-input"
                    value={behavior.userName}
                    onChange={(e) => setBehavior({ userName: e.target.value })}
                    placeholder="e.g. Alex"
                    maxLength={48}
                  />
                </label>

                <label className="field-group mt-sm">
                  <span className="field-label">
                    Custom Greeting Override (optional)
                  </span>
                  <input
                    type="text"
                    className="text-input"
                    value={behavior.customGreeting}
                    onChange={(e) =>
                      setBehavior({ customGreeting: e.target.value })
                    }
                    placeholder="Leave blank for time-of-day greeting"
                    maxLength={80}
                  />
                </label>
              </div>

              <div className="settings-group">
                <h3>Motion</h3>
                <label className="toggle-row">
                  <span>Smooth transitions & hover motion</span>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={behavior.enableAnimations}
                    onChange={(e) =>
                      setBehavior({ enableAnimations: e.target.checked })
                    }
                  />
                </label>
                <p className="field-hint">
                  Automatically respects your system&apos;s reduced-motion setting.
                </p>
              </div>
            </>
          )}

          {tab === 'data' && (
            <>
              <div className="settings-group">
                <h3>Privacy Guarantee</h3>
                <div className="privacy-card">
                  <ShieldIcon size={18} />
                  <p>
                    All settings, shortcuts, tasks, notes, and custom wallpapers
                    are stored locally in Brave. Bonjorno includes zero analytics,
                    zero telemetry, and zero third-party trackers.
                  </p>
                </div>
              </div>

              <div className="settings-group">
                <h3>Optional Permissions</h3>
                <div className="perm-list">
                  <div className="perm-row">
                    <div>
                      <strong>Bookmarks</strong>
                      <p className="field-hint">
                        Reads your Brave bookmarks locally for the Bookmarks drawer.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={permState.bookmarks ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                      onClick={() => togglePermission('bookmarks')}
                      disabled={!isExtensionContext()}
                    >
                      {permState.bookmarks ? 'Revoke' : 'Grant'}
                    </button>
                  </div>

                  <div className="perm-row">
                    <div>
                      <strong>Most Visited Sites</strong>
                      <p className="field-hint">
                        Displays frequently visited sites locally via Brave&apos;s API.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={permState.topSites ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                      onClick={() => togglePermission('topSites')}
                      disabled={!isExtensionContext()}
                    >
                      {permState.topSites ? 'Revoke' : 'Grant'}
                    </button>
                  </div>
                </div>
                {!isExtensionContext() && (
                  <p className="field-hint mt-sm">
                    Permission toggles become active when installed in Brave.
                  </p>
                )}
              </div>

              <div className="settings-group">
                <h3>Local Repo Sync ({ROOT_CONFIG_FILENAME})</h3>
                <p className="field-hint">
                  Keep your shortcuts and settings in{' '}
                  <code>{ROOT_CONFIG_FILENAME}</code> in the repository root so
                  cloning or downloading the repo on another PC picks up right
                  where you left off.
                </p>

                {rootSync.info.status === 'dev-synced' && (
                  <div className="mt-sm">
                    <p className="field-success">
                      Auto-saving directly to <code>{ROOT_CONFIG_FILENAME}</code>{' '}
                      in the project root.
                    </p>
                    <div className="data-actions-row mt-sm">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const res = await rootSync.saveNow();
                          setSyncMessage({
                            kind: res.ok ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                      >
                        Save Now
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const res = await rootSync.reloadFromFile();
                          setSyncMessage({
                            kind: res.ok ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                      >
                        Reload from File
                      </button>
                    </div>
                  </div>
                )}

                {rootSync.info.status === 'synced' && (
                  <div className="mt-sm">
                    <p className="field-success">
                      Linked to{' '}
                      <code>{rootSync.info.fileName ?? ROOT_CONFIG_FILENAME}</code>
                      . Changes auto-save automatically.
                    </p>
                    <div className="data-actions-row mt-sm">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const res = await rootSync.saveNow();
                          setSyncMessage({
                            kind: res.ok ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                      >
                        Save Now
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const res = await rootSync.reloadFromFile();
                          setSyncMessage({
                            kind: res.ok ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                      >
                        Load from File
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          await rootSync.unlinkFile();
                          setSyncMessage({
                            kind: 'ok',
                            text: 'Unlinked local config file.',
                          });
                        }}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                )}

                {rootSync.info.status === 'needs-permission' && (
                  <div className="mt-sm">
                    <p className="field-hint">
                      Browser restarted — click below to reconnect write access
                      to{' '}
                      <code>{rootSync.info.fileName ?? ROOT_CONFIG_FILENAME}</code>.
                    </p>
                    <div className="data-actions-row mt-sm">
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={async () => {
                          const res = await rootSync.reconnectFile();
                          setSyncMessage({
                            kind: res.ok ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                      >
                        Reconnect &amp; Sync
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          await rootSync.unlinkFile();
                          setSyncMessage({
                            kind: 'ok',
                            text: 'Unlinked local config file.',
                          });
                        }}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                )}

                {(rootSync.info.status === 'unlinked' ||
                  rootSync.info.status === 'error') && (
                  <div className="data-actions-row mt-sm">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={async () => {
                        const res = await rootSync.linkFile();
                        if (res.cancelled) return;
                        setSyncMessage({
                          kind: res.ok ? 'ok' : 'err',
                          text: res.message,
                        });
                      }}
                    >
                      Link {ROOT_CONFIG_FILENAME}
                    </button>
                  </div>
                )}

                {rootSync.info.status === 'unsupported' && (
                  <p className="field-hint mt-sm">
                    Direct file linking is unavailable in this browser. Use
                    Export JSON below and save it as{' '}
                    <code>{ROOT_CONFIG_FILENAME}</code> in the repo root.
                  </p>
                )}

                {syncMessage && (
                  <p
                    className={
                      syncMessage.kind === 'err' ? 'field-error' : 'field-success'
                    }
                    role="status"
                  >
                    {syncMessage.text}
                  </p>
                )}
              </div>

              <div className="settings-group">
                <h3>Backup & Restore</h3>
                <div className="data-actions-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleExport}
                  >
                    <DownloadIcon size={15} />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <UploadIcon size={15} />
                    Import JSON
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={handleImportFile}
                  />
                </div>
                {importStatus && (
                  <p
                    className={
                      importStatus.kind === 'err' ? 'field-error' : 'field-success'
                    }
                    role="status"
                  >
                    {importStatus.text}
                  </p>
                )}
              </div>

              <div className="settings-group danger-zone">
                <h3>Reset</h3>
                <p className="field-hint">
                  Restores all preferences, shortcuts, tasks, notes, and custom
                  backgrounds to their initial state.
                </p>
                <button
                  type="button"
                  className="btn-danger mt-sm"
                  onClick={() => setConfirmReset(true)}
                >
                  Reset to Defaults
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmReset}
        title="Reset Bonjorno to Defaults?"
        message="This will erase your custom shortcuts, tasks, notes, uploaded wallpapers, and preferences. You may want to export a JSON backup first."
        confirmLabel="Reset Everything"
        danger
        onConfirm={handleResetConfirmed}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
