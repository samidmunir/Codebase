import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { auth, useAuth } from '../auth/auth-store';
import { useCommunityUnread } from './community-unread';
import { FeedbackDialog } from './FeedbackDialog';
import { SiteBanner } from './SiteBanner';
import { useSiteStatus } from './site-status';
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
  const { beta, registrationMode, version } = useSiteStatus();

  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="site-header__brand" aria-label="Vector home">
          <span className="site-header__mark" aria-hidden="true" />
          Vector
          {beta && (
            <span className="beta-badge" title="Vector is in beta: thanks for flying it early">
              Beta
            </span>
          )}
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          <MainLinks signedIn={Boolean(signedIn)} communityUnread={communityUnread} />
        </nav>
        <div className="site-header__account">
          <SiteMenu signedIn={Boolean(signedIn)} communityUnread={communityUnread} />
          {session.status === 'loading' ? null : signedIn ? (
            <AccountMenu
              handle={signedIn.handle}
              displayName={signedIn.displayName}
              staff={signedIn.role === 'player' ? undefined : signedIn.role}
            />
          ) : (
            <>
              <Link to="/login" className="site-header__link">
                Sign in
              </Link>
              {registrationMode !== 'closed' && (
                <Link to="/register" className="site-button site-button--primary">
                  {registrationMode === 'invite' ? 'Join the beta' : 'Create account'}
                </Link>
              )}
            </>
          )}
        </div>
      </header>

      <main className="site__main" ref={main}>
        <SiteBanner />
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
            Vector
            {version && (
              <>
                {' '}
                <Link to="/roadmap" className="site-footer__version" title="What’s in each version">
                  v{version}
                </Link>
              </>
            )}{' '}
            · approach and departure control, on real FAA data · not for navigation
          </span>
          <nav className="site-footer__links" aria-label="Site">
            <Link to="/news">News</Link>
            <Link to="/roadmap">Roadmap</Link>
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

/** The site's main links: in the header on wide screens, in the Menu panel on phones. */
function MainLinks({ signedIn, communityUnread }: { signedIn: boolean; communityUnread: number }) {
  return (
    <>
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
    </>
  );
}

/** On phones: a Menu button opening the main links (and Sign in, when signed out). */
function SiteMenu({ signedIn, communityUnread }: { signedIn: boolean; communityUnread: number }) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

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

  return (
    <div className="site-menu" ref={menu}>
      <button
        type="button"
        className="site-menu__button"
        aria-expanded={open}
        aria-controls="site-menu-panel"
        onClick={() => setOpen(!open)}
      >
        <span className="site-menu__icon" aria-hidden="true" data-open={open} />
        Menu
        {communityUnread > 0 && !open && <span className="site-menu__dot" aria-hidden="true" />}
      </button>
      {open && (
        <nav
          id="site-menu-panel"
          className="site-menu__panel"
          aria-label="Main"
          // Following a link closes the menu.
          onClick={(event) => (event.target as HTMLElement).closest('a') && setOpen(false)}
        >
          <MainLinks signedIn={signedIn} communityUnread={communityUnread} />
          {!signedIn && (
            <Link to="/login" className="site-header__link site-menu__sign-in">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** The signed-in pilot's menu: their pages, settings, admin, and sign out. */
function AccountMenu({
  handle,
  displayName,
  staff,
}: {
  handle: string;
  displayName: string;
  /** Their staff role, if they have one (the menu links to the admin pages). */
  staff: 'moderator' | 'admin' | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              setFeedback(true);
            }}
          >
            Send feedback
          </button>
          {staff && (
            <Link role="menuitem" to="/admin">
              {staff === 'admin' ? 'Admin' : 'Moderation'}
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
      {feedback && <FeedbackDialog page={location.pathname} onClose={() => setFeedback(false)} />}
    </div>
  );
}
