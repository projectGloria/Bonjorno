import { useEffect, useState } from 'react';
import { getLocalFaviconUrl } from '../services/chromeApi';
import { getMonogram, getMonogramColor } from '../utils/url';

interface FaviconBadgeProps {
  url: string;
  title: string;
  size?: number;
}

export function FaviconBadge({ url, title, size = 32 }: FaviconBadgeProps) {
  const faviconSrc = getLocalFaviconUrl(url, size * 2);
  const [failed, setFailed] = useState(!faviconSrc);

  useEffect(() => {
    setFailed(!faviconSrc);
  }, [faviconSrc]);

  if (!failed && faviconSrc) {
    return (
      <span
        className="favicon-shell"
        style={{ width: size, height: size }}
      >
        <img
          src={faviconSrc}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  const monogram = getMonogram(title, url);
  const bg = getMonogramColor(url || title);

  return (
    <span
      className="favicon-monogram"
      style={{
        width: size,
        height: size,
        backgroundColor: `${bg}24`,
        color: bg,
        borderColor: `${bg}40`,
      }}
      aria-hidden="true"
    >
      {monogram}
    </span>
  );
}
