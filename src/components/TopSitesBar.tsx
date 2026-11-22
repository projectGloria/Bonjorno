import { useEffect, useRef, useState } from 'react';
import {
  getTopSites,
  hasOptionalPermission,
  isExtensionContext,
  requestOptionalPermission,
  type TopSiteEntry,
} from '../services/chromeApi';
import type { FreePosition, LayoutSettings } from '../types/settings';
import { extractDomainLabel } from '../utils/url';
import { FaviconBadge } from './FaviconBadge';
import { FreeMoveBadge, useFreeDrag } from './FreeMoveSlot';
import { GripIcon, ShieldIcon } from './Icons';

interface TopSitesBarProps {
  openInNewTab: boolean;
  editMode?: boolean;
  layout?: LayoutSettings;
  onSetFreePosition?: (itemId: string, pos: FreePosition | null) => void;
}

export function TopSitesBar({
  openInNewTab,
  editMode = false,
  layout,
  onSetFreePosition,
}: TopSitesBarProps) {
  const [sites, setSites] = useState<TopSiteEntry[]>([]);
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  const {
    isFree,
    isFreeDragging,
    activePos,
    freeStyle,
    startPointerDrag,
    bodyPointerDown,
    dockItem,
  } = useFreeDrag({
    itemId: 'cluster:topSites',
    targetRef: permitted === null ? undefined : ref,
    freePositions: layout?.freePositions ?? {},
    snapToGrid: layout?.snapToGrid ?? true,
    onSetPosition: onSetFreePosition ?? (() => {}),
  });

  const load = async () => {
    const ok = await hasOptionalPermission('topSites');
    setPermitted(ok);
    if (ok) {
      const list = await getTopSites();
      setSites(list.slice(0, 8));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRequest = async () => {
    setDeniedMsg(null);
    const granted = await requestOptionalPermission('topSites');
    if (granted) {
      await load();
    } else {
      setDeniedMsg(
        isExtensionContext()
          ? 'Permission was not granted. You can enable it anytime in Settings → Permissions.'
          : 'Top Sites requires running as an installed Brave extension.'
      );
    }
  };

  if (permitted === null) return null;

  const bodyDown = editMode
    ? (e: React.PointerEvent) => bodyPointerDown(e, ref.current)
    : undefined;

  const sectionClass = `topsites-section ${
    editMode ? 'is-editable-part' : ''
  } ${isFreeDragging ? 'is-dragging' : ''} ${isFree ? 'is-free-placed' : ''}`;

  const editHeader = editMode ? (
    <div className="part-mini-toolbar">
      <span data-reorder-grip className="part-mini-grip" title="Drag to swap with Quick Links">
        <GripIcon size={11} />
        <span>Most Visited</span>
      </span>
      <FreeMoveBadge
        label="Most Visited Sites"
        isFree={isFree}
        activePos={activePos}
        onStartFreeDrag={(e) => startPointerDrag(e, ref.current)}
        onDock={dockItem}
        compact
      />
    </div>
  ) : null;

  if (!permitted) {
    return (
      <section
        ref={ref}
        style={freeStyle}
        className={sectionClass}
        onPointerDown={bodyDown}
        aria-label="Frequently visited sites"
      >
        {editHeader}
        <div className="permission-banner surface-card">
          <div className="permission-banner-copy">
            <ShieldIcon size={16} />
            <span>
              Allow local access to Brave&apos;s frequently visited sites? Data stays on your device.
            </span>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={handleRequest}>
            Enable Top Sites
          </button>
        </div>
        {deniedMsg && <p className="subtle-notice">{deniedMsg}</p>}
      </section>
    );
  }

  if (sites.length === 0) {
    return (
      <section
        ref={ref}
        style={freeStyle}
        className={sectionClass}
        onPointerDown={bodyDown}
        aria-label="Frequently visited sites"
      >
        {editHeader}
        <p className="subtle-notice">No frequently visited sites recorded yet.</p>
      </section>
    );
  }

  const linkTargetProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <section
      ref={ref}
      style={freeStyle}
      className={sectionClass}
      onPointerDown={bodyDown}
      aria-label="Frequently visited sites"
    >
      {editHeader}
      <div className="section-mini-header">
        <span className="section-mini-label">Most Visited</span>
      </div>
      <div className="topsites-row">
        {sites.map((site) => (
          <a
            key={site.url}
            href={site.url}
            className="topsite-chip surface-card"
            title={`${site.title} — ${extractDomainLabel(site.url)}`}
            {...linkTargetProps}
          >
            <FaviconBadge url={site.url} title={site.title} size={18} />
            <span className="topsite-title">{site.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
