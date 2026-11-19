import { useEffect, useMemo, useState } from 'react';
import {
  getBookmarkTree,
  hasOptionalPermission,
  isExtensionContext,
  requestOptionalPermission,
  type BookmarkEntry,
} from '../services/chromeApi';
import { extractDomainLabel } from '../utils/url';
import { FaviconBadge } from './FaviconBadge';
import {
  BookmarkIcon,
  ChevronRightIcon,
  CloseIcon,
  FolderIcon,
  SearchIcon,
  ShieldIcon,
} from './Icons';

interface BookmarksDrawerProps {
  open: boolean;
  openInNewTab: boolean;
  onClose: () => void;
}

function flattenBookmarks(nodes: BookmarkEntry[]): BookmarkEntry[] {
  const out: BookmarkEntry[] = [];
  for (const node of nodes) {
    if (node.url) out.push(node);
    if (node.children) out.push(...flattenBookmarks(node.children));
  }
  return out;
}

export function BookmarksDrawer({
  open,
  openInNewTab,
  onClose,
}: BookmarksDrawerProps) {
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [roots, setRoots] = useState<BookmarkEntry[]>([]);
  const [pathStack, setPathStack] = useState<BookmarkEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadBookmarks = async () => {
    const ok = await hasOptionalPermission('bookmarks');
    setPermitted(ok);
    if (ok) {
      const tree = await getBookmarkTree();
      setRoots(tree);
      setPathStack([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    setStatusMessage(null);
    void loadBookmarks();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleGrant = async () => {
    setStatusMessage(null);
    const granted = await requestOptionalPermission('bookmarks');
    if (granted) {
      await loadBookmarks();
    } else {
      setStatusMessage(
        isExtensionContext()
          ? 'Bookmark permission was declined. Bonjorno will not access your bookmarks.'
          : 'Bookmarks API is only available when loaded as a Brave extension.'
      );
    }
  };

  const allFlat = useMemo(() => flattenBookmarks(roots), [roots]);

  const currentItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return allFlat.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.url && b.url.toLowerCase().includes(q))
      );
    }
    if (pathStack.length === 0) {
      return roots;
    }
    return pathStack[pathStack.length - 1].children ?? [];
  }, [allFlat, pathStack, roots, search]);

  if (!open) return null;

  const linkTargetProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Brave Bookmarks"
      onClick={onClose}
    >
      <aside
        className="drawer-panel drawer-left surface-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-title-row">
            <BookmarkIcon size={18} />
            <h2>Bookmarks</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close bookmarks"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {permitted === false && (
          <div className="drawer-empty-state">
            <div className="empty-icon-circle">
              <ShieldIcon size={22} />
            </div>
            <h3>Bookmarks Access Needed</h3>
            <p>
              Bonjorno requests the optional <code>bookmarks</code> permission only
              when you choose to browse your Brave bookmarks here. Your bookmarks
              never leave your browser.
            </p>
            <button type="button" className="btn-primary" onClick={handleGrant}>
              Grant Bookmarks Permission
            </button>
            {statusMessage && <p className="field-error">{statusMessage}</p>}
          </div>
        )}

        {permitted === true && (
          <>
            <div className="bookmarks-search-wrap">
              <SearchIcon size={15} />
              <input
                type="text"
                className="bookmarks-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter bookmarks..."
                aria-label="Filter bookmarks"
              />
              {search && (
                <button
                  type="button"
                  className="icon-btn-tiny"
                  onClick={() => setSearch('')}
                  aria-label="Clear filter"
                >
                  <CloseIcon size={13} />
                </button>
              )}
            </div>

            {!search.trim() && (
              <nav className="bookmarks-breadcrumbs" aria-label="Bookmark path">
                <button
                  type="button"
                  className={`crumb-btn ${pathStack.length === 0 ? 'is-current' : ''}`}
                  onClick={() => setPathStack([])}
                >
                  All Folders
                </button>
                {pathStack.map((folder, idx) => (
                  <span key={folder.id} className="crumb-segment">
                    <ChevronRightIcon size={12} />
                    <button
                      type="button"
                      className={`crumb-btn ${
                        idx === pathStack.length - 1 ? 'is-current' : ''
                      }`}
                      onClick={() => setPathStack(pathStack.slice(0, idx + 1))}
                    >
                      {folder.title}
                    </button>
                  </span>
                ))}
              </nav>
            )}

            <div className="drawer-body bookmarks-list">
              {currentItems.length === 0 ? (
                <div className="drawer-empty-compact">
                  {search.trim()
                    ? 'No bookmarks match your filter.'
                    : 'This folder is empty.'}
                </div>
              ) : (
                currentItems.map((item) =>
                  item.url ? (
                    <a
                      key={item.id}
                      href={item.url}
                      className="bookmark-row"
                      title={item.url}
                      {...linkTargetProps}
                    >
                      <FaviconBadge url={item.url} title={item.title} size={20} />
                      <span className="bookmark-row-text">
                        <span className="bookmark-row-title">{item.title}</span>
                        <span className="bookmark-row-host">
                          {extractDomainLabel(item.url)}
                        </span>
                      </span>
                    </a>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      className="bookmark-row bookmark-folder-row"
                      onClick={() => setPathStack((prev) => [...prev, item])}
                    >
                      <span className="bookmark-folder-icon">
                        <FolderIcon size={16} />
                      </span>
                      <span className="bookmark-row-text">
                        <span className="bookmark-row-title">{item.title}</span>
                        <span className="bookmark-row-host">
                          {(item.children?.length ?? 0)} items
                        </span>
                      </span>
                      <ChevronRightIcon size={14} />
                    </button>
                  )
                )
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
