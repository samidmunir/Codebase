import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './auth-store';

function Splash() {
  return (
    <div className="auth-splash" role="status">
      <span className="scope-loading__ring" aria-hidden="true" />
      Connecting
    </div>
  );
}

/** Shows its children only when signed in; otherwise sends the player to sign in and back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const state = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <Splash />;
  if (state.status === 'signedOut') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

/** For the sign-in pages: signed-in players go straight on. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const state = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <Splash />;
  if (state.status === 'signedIn') {
    const next = new URLSearchParams(location.search).get('next');
    return (
      <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />
    );
  }
  return children;
}
