import { Link } from 'react-router';
import { useAuth } from '../auth/auth-store';
import { useSiteStatus } from './site-status';

/**
 * For visitors who arrive from a shared link (a result, a profile): what Vector
 * is, and the way in that registration allows right now.
 */
export function JoinBanner() {
  const auth = useAuth();
  const { registrationMode } = useSiteStatus();
  if (auth.status !== 'signedOut') return null;

  return (
    <aside className="join-banner" aria-label="About Vector">
      <span className="join-banner__mark" aria-hidden="true" />
      <div className="join-banner__text">
        <strong>This is Vector, an air traffic control simulator on real airspace.</strong>
        <span>
          {registrationMode === 'invite'
            ? 'Work New York, Chicago and Dallas–Fort Worth on real FAA procedures. It’s in a private beta: join the waitlist, or bring your invite.'
            : registrationMode === 'closed'
              ? 'Work New York, Chicago and Dallas–Fort Worth on real FAA procedures, with live weather and realistic pilots.'
              : 'Work New York, Chicago and Dallas–Fort Worth on real FAA procedures. It’s free: create an account and take the frequency.'}
        </span>
      </div>
      <div className="join-banner__actions">
        {registrationMode === 'invite' ? (
          <>
            <Link to="/register?waitlist=1" className="site-button site-button--primary">
              Join the waitlist
            </Link>
            <Link to="/register" className="site-button">
              Have an invite?
            </Link>
          </>
        ) : registrationMode === 'closed' ? (
          <Link to="/" className="site-button site-button--primary">
            See Vector
          </Link>
        ) : (
          <>
            <Link to="/register" className="site-button site-button--primary">
              Create a free account
            </Link>
            <Link to="/" className="site-button">
              See Vector
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
