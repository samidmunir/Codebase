import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { auth, useAuth } from '../auth/auth-store';
import { useCommunityUnread } from './community-unread';
import { VerifyEmailBanner } from './VerifyEmailBanner';
import './site.css';

/**
 * The public site and signed-in pages: a header with navigation and the account
 * menu, the page, and a footer. (Setup and the scope are full screen instead.)
 */
export function SiteLayout() {
  const session = useAuth();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);

  // A new page starts at the top.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const signedIn = session.status === 'signedIn' ? session.user : undefined;
  const communityUnread = useCommunityUnread(location.pathname);

  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="site-header__brand" aria-label="Vector home">
          <span className="site-header__mark" aria-hidden="true" />
          Vector
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          {signedIn && (
            <NavLink to="/play" className="site-header__link">
              Play
            </NavLink>
          )}
          <NavLink to="/airspaces" className="site-header__link">
            Airspaces
          </NavLink>
          <NavLink to="/records" className="site-header__link">
            Records
          </NavLink>
          <NavLink to="/community" className="site-header__link">
            Community
            {communityUnread > 0 && (
              <span
                className="site-header__badge"
                aria-label={`, ${communityUnread} followed thread${communityUnread === 1 ? '' : 's'} with new posts`}
              >
                {communityUnread}
              </span>
            )}
          </NavLink>
          <NavLink to="/guide" className="site-header__link">
            Guide
          </NavLink>
        </nav>
        <div className="site-header__account">
          {session.status === 'loading' ? null : signedIn ? (
            <AccountMenu
              handle={signedIn.handle}
              displayName={signedIn.displayName}
              admin={signedIn.role === 'admin'}
            />
          ) : (
            <>
              <Link to="/login" className="site-header__link">
                Sign in
              </Link>
              <Link to="/register" className="site-button site-button--primary">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="site__main" ref={main}>
        {signedIn?.handleGenerated && location.pathname !== '/account' && (
          <div className="site-banner" role="status">
            Choose your handle: it’s how you’ll appear on records and in the community. For now
            you’re <strong>@{signedIn.handle}</strong>.
            <Link to="/account" className="site-button">
              Choose a handle
            </Link>
          </div>
        )}
        {signedIn && !signedIn.emailVerified && !signedIn.handleGenerated && (
          <VerifyEmailBanner key={signedIn.email} user={signedIn} />
        )}
        <Outlet />
        <footer className="site-footer">
          <span>
            Vector · approach and departure control, on real FAA data · not for navigation
          </span>
          <nav className="site-footer__links" aria-label="Site">
            <Link to="/news">News</Link>
            <Link to="/guide">Guide</Link>
            <Link to="/about">About</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

/** The signed-in pilot's menu: their pages, settings, admin, and sign out. */
function AccountMenu({
  handle,
  displayName,
  admin,
}: {
  handle: string;
  displayName: string;
  admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const initials = displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="account-menu" ref={menu}>
      <button
        type="button"
        className="account-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initials || '?'}
        </span>
        <span className="account-menu__handle">@{handle}</span>
      </button>
      {open && (
        <div
          className="account-menu__list"
          role="menu"
          // Following a link closes the menu.
          onClick={(event) => (event.target as HTMLElement).closest('a') && setOpen(false)}
        >
          <div className="account-menu__who">
            <strong>{displayName}</strong>
            <span>@{handle}</span>
          </div>
          <Link role="menuitem" to="/play">
            Play
          </Link>
          <Link role="menuitem" to={`/pilots/${handle}`}>
            Profile
          </Link>
          <Link role="menuitem" to="/account">
            Account
          </Link>
          <Link role="menuitem" to="/settings">
            Settings
          </Link>
          {admin && (
            <Link role="menuitem" to="/admin">
              Admin
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() =>
              // Then to the front page (after any sign-in redirect from the page you were on).
              void auth.logout().then(() => navigate('/', { replace: true }))
            }
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
