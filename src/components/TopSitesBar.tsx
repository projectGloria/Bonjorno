import { useEffect, useState } from 'react';
import {
  getTopSites,
  hasOptionalPermission,
  isExtensionContext,
  requestOptionalPermission,
  type TopSiteEntry,
} from '../services/chromeApi';
import { extractDomainLabel } from '../utils/url';
import { FaviconBadge } from './FaviconBadge';
import { ShieldIcon } from './Icons';

interface TopSitesBarProps {
  openInNewTab: boolean;
}

export function TopSitesBar({ openInNewTab }: TopSitesBarProps) {
  const [sites, setSites] = useState<TopSiteEntry[]>([]);
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);

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

  if (!permitted) {
    return (
      <section className="topsites-section" aria-label="Frequently visited sites">
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
      <section className="topsites-section" aria-label="Frequently visited sites">
        <p className="subtle-notice">No frequently visited sites recorded yet.</p>
      </section>
    );
  }

  const linkTargetProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <section className="topsites-section" aria-label="Frequently visited sites">
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
