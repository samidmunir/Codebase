import { useState } from 'react';
import { Link } from 'react-router';
import { useAirspaceStatus } from '../airspaces/airspace-status';
import { AIRSPACES } from '../airspaces/registry';
import { auth, useAuth } from '../auth/auth-store';
import { ApiStatus } from '../components/ApiStatus';
import { HelpDialog } from '../components/help/HelpDialog';
import { shortAirport } from '../scope/data-block';
import { SavedSessions } from './SavedSessions';
import './auth-screen.css';
import './home-screen.css';

export function HomeScreen() {
  const session = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const { isOpen } = useAirspaceStatus();

  return (
    <main className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>

      {session.status === 'signedIn' && (
        <div className="home-account">
          <span>
            Signed in as <strong>{session.user.displayName}</strong>
          </span>
          <button type="button" onClick={() => setHelpOpen(true)}>
            How to play
          </button>
          {session.user.role === 'admin' && <Link to="/admin">Admin</Link>}
          <Link to="/settings">Settings</Link>
          <button type="button" onClick={() => void auth.logout()}>
            Sign out
          </button>
        </div>
      )}

      <section className="hero">
        <p className="hero__eyebrow">Approach &amp; departure control</p>
        <h1 className="hero__title">Vector</h1>
        <p className="hero__subtitle">
          A realistic air traffic control simulator built on real FAA data.
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

        <ApiStatus />
      </section>

      <footer className="shell__footer">Preview build · v0.0.0</footer>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </main>
  );
}
