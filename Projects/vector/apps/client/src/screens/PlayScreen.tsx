import { Link } from 'react-router';
import { useAirspaceStatus } from '../airspaces/airspace-status';
import { AIRSPACES } from '../airspaces/registry';
import { useAuth } from '../auth/auth-store';
import { ApiStatus } from '../components/ApiStatus';
import { shortAirport } from '../scope/data-block';
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
    <div className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>

      <section className="hero">
        <p className="hero__eyebrow">Approach &amp; departure control</p>
        <h1 className="hero__title">Vector</h1>
        <p className="hero__subtitle">
          {session.status === 'signedIn'
            ? `Welcome back, ${session.user.displayName}. Pick an airspace to work.`
            : 'A realistic air traffic control simulator built on real FAA data.'}
        </p>

        <div className="hero__airspaces">
          {AIRSPACES.map((airspace) => {
            const details = (
              <>
                <span className="airspace-card__facility">{airspace.facility}</span>
                <span className="airspace-card__name">{airspace.name}</span>
                <span className="airspace-card__airports">
                  {airspace.airports.map(shortAirport).join(' · ')}
                </span>
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

        {session.status === 'signedIn' && <SavedSessions />}

        <div className="play-news">
          <LatestNews count={1} title="Latest news" />
        </div>

        <ApiStatus />
      </section>
    </div>
  );
}
