import { Link } from 'react-router';
import { AIRSPACES } from '../../airspaces/registry';
import { useAuth } from '../../auth/auth-store';
import { LiveScope } from '../../demo/LiveScope';
import { shortAirport } from '../../scope/data-block';
import { usePublicPageMeta } from '../../site/page-meta';
import { LatestNews } from '../news/LatestNews';
import '../home-screen.css';
import './landing.css';

const FEATURES = [
  {
    title: 'Real airspace',
    text: 'Every STAR, SID, ILS approach, fix, holding pattern and minimum vectoring altitude comes from the FAA’s own published data, rebuilt every 28-day cycle.',
  },
  {
    title: 'Your frequency',
    text: 'Vector, climb, descend, slow and clear aircraft from the scope, and hear every instruction read back. No typed commands: it plays like a real radar position.',
  },
  {
    title: 'Weather that matters',
    text: 'Live METARs pick the runways, the wind shifts through a session, and when it swings far enough the airport changes runways under you.',
  },
  {
    title: 'A score that counts',
    text: 'Release points reward clean handoffs and on-time flights and take away for losses of separation and go-arounds, with a full debrief after every session.',
  },
];

/** The public front page: what Vector is, and a way in. */
export function LandingScreen() {
  usePublicPageMeta('/');
  const session = useAuth();
  const signedIn = session.status === 'signedIn';

  return (
    <div className="landing">
      <section className="landing-hero">
        <LiveScope label="A live Vector session over New York: traffic arriving, departing and crossing the airspace" />
        <div className="landing-hero__shade" aria-hidden="true" />
        <p className="hero__eyebrow">Approach &amp; departure control</p>
        <h1 className="landing-hero__title">Work real airspace.</h1>
        <p className="landing-hero__lede">
          Vector is an air traffic control simulator for the radar room: New York, Chicago and
          Dallas–Fort Worth, built from real FAA data, with live weather and realistic pilots.
        </p>
        <div className="landing-hero__actions">
          {signedIn ? (
            <Link to="/play" className="site-button site-button--primary site-button--large">
              Play
            </Link>
          ) : (
            <>
              <Link to="/register" className="site-button site-button--primary site-button--large">
                Start controlling, free
              </Link>
              <Link to="/login" className="site-button site-button--large">
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="features-title">
        <h2 id="features-title" className="landing-section__title">
          Built like the real thing
        </h2>
        <div className="landing-features">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="airspaces-title">
        <h2 id="airspaces-title" className="landing-section__title">
          Three TRACONs to work
        </h2>
        <div className="landing-airspaces">
          {AIRSPACES.map((airspace) => (
            <Link key={airspace.id} to={`/airspaces/${airspace.id}`} className="landing-airspace">
              <span className="airspace-card__facility">{airspace.facility}</span>
              <div>
                <h3>{airspace.name}</h3>
                <p>{airspace.airports.map(shortAirport).join(' · ')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="landing-section">
        <LatestNews />
      </div>

      {!signedIn && (
        <section className="landing-cta">
          <h2>Your scope is ready.</h2>
          <Link to="/register" className="site-button site-button--primary site-button--large">
            Create a free account
          </Link>
        </section>
      )}
    </div>
  );
}
