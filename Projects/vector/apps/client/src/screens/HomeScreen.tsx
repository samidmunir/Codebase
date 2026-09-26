import { useState } from 'react';
import { Link } from 'react-router';
import { DIFFICULTY_LEVELS, DIFFICULTY_PRESETS } from '@vector/shared';
import { AIRSPACES } from '../airspaces/registry';
import { auth, useAuth } from '../auth/auth-store';
import { ApiStatus } from '../components/ApiStatus';
import { shortAirport } from '../scope/data-block';
import { DIFFICULTY_LABELS, loadDifficulty, saveDifficulty } from '../settings/difficulty';
import './auth-screen.css';
import './home-screen.css';

export function HomeScreen() {
  const [difficulty, setDifficulty] = useState(loadDifficulty);
  const session = useAuth();
  const preset = DIFFICULTY_PRESETS[difficulty];

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

        <div className="difficulty-picker">
          <div className="difficulty-picker__options" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={difficulty === level}
                onClick={() => {
                  setDifficulty(level);
                  saveDifficulty(level);
                }}
              >
                {DIFFICULTY_LABELS[level]}
              </button>
            ))}
          </div>
          <p className="difficulty-picker__detail">
            {preset['traffic.arrivalRatePerHour']} arrivals and{' '}
            {preset['traffic.departureRatePerHour']} departures per airport per hour · up to{' '}
            {preset['traffic.maxDepartureQueue']} waiting to depart
          </p>
        </div>

        <div className="hero__airspaces">
          {AIRSPACES.map((airspace) => (
            <Link
              key={airspace.id}
              to={`/scope/${airspace.id}?difficulty=${difficulty}`}
              className="airspace-card"
            >
              <span className="airspace-card__facility">{airspace.facility}</span>
              <span className="airspace-card__name">{airspace.name}</span>
              <span className="airspace-card__airports">
                {airspace.airports.map(shortAirport).join(' · ')}
              </span>
              <span className="airspace-card__action">Open scope →</span>
            </Link>
          ))}
        </div>

        <ApiStatus />
      </section>

      <footer className="shell__footer">Preview build · v0.0.0</footer>
    </main>
  );
}
