import { useState } from 'react';
import { useSiteStatus } from './site-status';

const DISMISSED_KEY = 'vector.dismissedBanner';

/** A short fingerprint of a message, so a new message shows again after an old one was dismissed. */
function fingerprint(text: string): string {
  let hash = 0;
  for (const char of text) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return String(hash);
}

function dismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/** The admins' message across the top of every page, until the reader dismisses it. */
export function SiteBanner({ floating = false }: { floating?: boolean }) {
  const { banner } = useSiteStatus();
  const [hidden, setHidden] = useState(dismissed);
  if (!banner) return null;
  const id = fingerprint(`${banner.tone}:${banner.message}`);
  if (hidden === id) return null;
  return (
    <div
      className={floating ? 'site-notice site-notice--floating' : 'site-notice'}
      data-tone={banner.tone}
      role="status"
    >
      <span className="site-notice__icon" aria-hidden="true">
        {banner.tone === 'warning' ? '!' : 'i'}
      </span>
      <span className="site-notice__text">{banner.message}</span>
      <button
        type="button"
        className="site-notice__close"
        aria-label="Dismiss this message"
        onClick={() => {
          try {
            localStorage.setItem(DISMISSED_KEY, id);
          } catch {
            // Private browsing: it hides for this visit only.
          }
          setHidden(id);
        }}
      >
        ×
      </button>
    </div>
  );
}
