export type OptionalPermission = 'bookmarks' | 'topSites';

export interface BookmarkEntry {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkEntry[];
}

export interface TopSiteEntry {
  title: string;
  url: string;
}

export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.id === 'string' &&
    chrome.runtime.id.length > 0
  );
}

export async function storageGet<T>(key: string): Promise<T | null> {
  if (isExtensionContext() && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T | undefined) ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<boolean> {
  if (isExtensionContext() && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch {
      return false;
    }
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function subscribeStorageChanges(
  key: string,
  onChange: (newValue: unknown) => void
): () => void {
  if (isExtensionContext() && chrome.storage?.onChanged) {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key] && changes[key].newValue !== undefined) {
        onChange(changes[key].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      try {
        onChange(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed cross-tab value
      }
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export async function hasOptionalPermission(
  permission: OptionalPermission
): Promise<boolean> {
  if (!isExtensionContext() || !chrome.permissions) {
    return false;
  }
  try {
    return await chrome.permissions.contains({ permissions: [permission] });
  } catch {
    return false;
  }
}

export async function requestOptionalPermission(
  permission: OptionalPermission
): Promise<boolean> {
  if (!isExtensionContext() || !chrome.permissions) {
    return false;
  }
  try {
    return await chrome.permissions.request({ permissions: [permission] });
  } catch {
    return false;
  }
}

export async function revokeOptionalPermission(
  permission: OptionalPermission
): Promise<boolean> {
  if (!isExtensionContext() || !chrome.permissions) {
    return false;
  }
  try {
    return await chrome.permissions.remove({ permissions: [permission] });
  } catch {
    return false;
  }
}

function mapBookmarkNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkEntry {
  return {
    id: node.id,
    title: node.title || (node.url ? node.url : 'Folder'),
    url: node.url,
    children: node.children ? node.children.map(mapBookmarkNode) : undefined,
  };
}

export async function getBookmarkTree(): Promise<BookmarkEntry[]> {
  if (!isExtensionContext() || !chrome.bookmarks) {
    return [];
  }
  try {
    const tree = await chrome.bookmarks.getTree();
    if (!tree.length) return [];
    const rootChildren = tree[0].children ?? [];
    return rootChildren.map(mapBookmarkNode);
  } catch {
    return [];
  }
}

export async function getTopSites(): Promise<TopSiteEntry[]> {
  if (!isExtensionContext() || !chrome.topSites) {
    return [];
  }
  try {
    const sites = await chrome.topSites.get();
    return sites
      .filter((s) => Boolean(s.url))
      .map((s) => ({
        title: s.title || s.url,
        url: s.url,
      }));
  } catch {
    return [];
  }
}

/**
 * Uses Chromium/Brave MV3 local favicon cache API (`chrome-extension://<id>/_favicon/`).
 * Makes zero external network requests. Returns null outside extension context.
 */
export function getLocalFaviconUrl(pageUrl: string, size = 32): string | null {
  if (!isExtensionContext()) {
    return null;
  }
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', String(size));
    return url.toString();
  } catch {
    return null;
  }
}
