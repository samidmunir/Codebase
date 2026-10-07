import { useEffect, useRef, useState } from 'react';
import './share.css';

/** What to share: the page, a line about it, and (for a result) its card image. */
export interface Shareable {
  /** An absolute URL. */
  url: string;
  /** One line, e.g. "I worked N90 New York on Vector: +1,240 RP". */
  text: string;
  /** The card image's path (it's also the link's preview), if it has one. */
  image?: string;
}

/** Phones and tablets have a share sheet; elsewhere, a menu. */
const nativeShare = () =>
  typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Share: the system share sheet on phones; on desktop a menu with the card's
 * preview, Copy link, X, Reddit and Download image.
 */
export function ShareButton({
  share,
  label = 'Share',
  className = 'site-button',
  opens = 'down',
}: {
  share: Shareable;
  label?: string;
  className?: string;
  /** Which way the menu opens (up from a bar at the bottom of a dialog). */
  opens?: 'up' | 'down';
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
        // Escape closes the menu only, not the dialog it's in (the scope's keys listen on window).
        event.stopPropagation();
        setOpen(false);
      } else if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const onClick = () => {
    if (nativeShare()) {
      // Dismissing the sheet rejects; nothing to do then.
      navigator.share({ text: share.text, url: share.url }).catch(() => undefined);
      return;
    }
    setCopied(false);
    setOpen(!open);
  };

  const copy = () => {
    navigator.clipboard
      .writeText(share.url)
      .then(() => setCopied(true))
      .catch(() => window.prompt('Copy this link:', share.url));
  };

  const encoded = { url: encodeURIComponent(share.url), text: encodeURIComponent(share.text) };

  return (
    <div className="share-menu" data-opens={opens} ref={menu}>
      <button
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onClick}
      >
        <span className="share-menu__icon" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <div className="share-menu__panel" role="menu" aria-label="Share">
          {share.image && (
            <img
              className="share-menu__preview"
              src={share.image}
              alt="How the link looks when it’s shared"
              width={1200}
              height={630}
            />
          )}
          <button type="button" role="menuitem" onClick={copy}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
          <a
            role="menuitem"
            href={`https://x.com/intent/post?text=${encoded.text}&url=${encoded.url}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Post on X
          </a>
          <a
            role="menuitem"
            href={`https://www.reddit.com/submit?url=${encoded.url}&title=${encoded.text}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Post on Reddit
          </a>
          {share.image && (
            <a
              role="menuitem"
              href={`${share.image}${share.image.includes('?') ? '&' : '?'}download=1`}
              download="vector-session.png"
              onClick={() => setOpen(false)}
            >
              Download image
            </a>
          )}
        </div>
      )}
    </div>
  );
}
