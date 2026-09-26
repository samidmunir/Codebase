import { Link } from 'react-router';
import { AIRSPACES } from '../airspaces/registry';
import { ApiStatus } from '../components/ApiStatus';
import { shortAirport } from '../scope/data-block';
import './home-screen.css';

export function HomeScreen() {
  return (
    <main className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>

      <section className="hero">
        <p className="hero__eyebrow">Approach &amp; departure control</p>
        <h1 className="hero__title">Vector</h1>
        <p className="hero__subtitle">
          A realistic air traffic control simulator built on real FAA data.
        </p>

        <div className="hero__airspaces">
          {AIRSPACES.map((airspace) => (
            <Link key={airspace.id} to={`/scope/${airspace.id}`} className="airspace-card">
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
