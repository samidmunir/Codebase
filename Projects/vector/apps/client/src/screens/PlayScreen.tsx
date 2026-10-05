import { Link } from 'react-router';
import { useAirspaceStatus } from '../airspaces/airspace-status';
import { AIRSPACES } from '../airspaces/registry';
import { useAuth } from '../auth/auth-store';
import { ApiStatus } from '../components/ApiStatus';
import { shortAirport } from '../scope/data-block';
import { AIRSPACE_PITCH } from './airspaces/airspace-pitch';
import { SavedSessions } from './SavedSessions';
import { LatestNews } from './news/LatestNews';
import { usePageMeta } from '../site/page-meta';
import './auth-screen.css';
import './home-screen.css';

/** The signed-in hub: choose an airspace, or resume a saved session. */
export function PlayScreen() {
  usePageMeta({ title: 'Play' });
  const session = useAuth();
  const { isOpen } = useAirspaceStatus();

  return (
    <div className="site-page play-page">
      <div className="play-page__glow" aria-hidden="true" />
      <header className="play-page__header">
        <div>
          <p className="hero__eyebrow">Approach &amp; departure control</p>
          <h1>
            {session.status === 'signedIn'
              ? `Welcome back, ${session.user.displayName}.`
              : 'Pick an airspace.'}
          </h1>
          <p className="site-page__lede">
            Pick an airspace to work, or pick up where you left off.
          </p>
        </div>
        <ApiStatus />
      </header>

      <div className="play-airspaces">
        {AIRSPACES.map((airspace) => {
          const details = (
            <>
              <span className="airspace-card__facility">{airspace.facility}</span>
              <span className="airspace-card__name">{airspace.name}</span>
              <span className="airspace-card__airports">
                {airspace.airports.map(shortAirport).join(' · ')}
              </span>
              <span className="airspace-card__pitch">{AIRSPACE_PITCH[airspace.id]}</span>
            </>
          );
          return isOpen(airspace.id) ? (
            <Link key={airspace.id} to={`/setup/${airspace.id}`} className="airspace-card">
              {details}
              <span className="airspace-card__action">New session →</span>
            </Link>
          ) : (
            <div key={airspace.id} className="airspace-card airspace-card--closed">
              {details}
              <span className="airspace-card__action">Closed</span>
            </div>
          );
        })}
      </div>

      <div className="play-page__columns">
        {session.status === 'signedIn' && <SavedSessions />}
        <div className="play-news">
          <LatestNews count={2} title="Latest news" />
        </div>
      </div>
    </div>
  );
}
