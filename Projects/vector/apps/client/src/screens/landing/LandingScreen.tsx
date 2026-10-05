import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AIRSPACES } from '../../airspaces/registry';
import { useAuth } from '../../auth/auth-store';
import { LiveScope, type DemoTraffic } from '../../demo/LiveScope';
import { shortAirport } from '../../scope/data-block';
import type { ScopeSession } from '../../sim/scope-session';
import { usePublicPageMeta } from '../../site/page-meta';
import { useSiteStatus } from '../../site/site-status';
import { LatestNews } from '../news/LatestNews';
import { AIRSPACE_PITCH } from '../airspaces/airspace-pitch';
import { useParallax, useReveal } from './landing-motion';
import { LiveReadout } from './LiveReadout';
import '../home-screen.css';
import './landing.css';

/**
 * N90 at a busy hour: per airport for arrivals and departures, across it for overflights.
 * Arrivals are about as many as the demo's controller lands, so the scope stays full
 * without jamming.
 */
const HERO_TRAFFIC: DemoTraffic = {
  arrivalsPerHour: 16,
  departuresPerHour: 20,
  transitsPerHour: 16,
};
/** The hero opens this far into its session, with the sky already full. */
const HERO_WARM_UP_MIN = 25;

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

const AIRPORT_COUNT = AIRSPACES.reduce((n, airspace) => n + airspace.airports.length, 0);

/** Plain facts about Vector, for the band under the hero. */
const FACTS = [
  { value: String(AIRSPACES.length), label: 'TRACONs to work' },
  { value: String(AIRPORT_COUNT), label: 'airports, each with its tower' },
  { value: '28', label: 'days between FAA data cycles' },
  { value: 'Live', label: 'METAR weather and runway changes' },
];

/** The public front page: a live N90 session behind it, what Vector is, and a way in. */
export function LandingScreen() {
  usePublicPageMeta('/');
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  const { registrationOpen } = useSiteStatus();
  const hero = useRef<HTMLElement>(null);
  const page = useReveal<HTMLDivElement>();
  const [session, setSession] = useState<ScopeSession | undefined>(undefined);
  const onSession = useCallback((running: ScopeSession) => setSession(running), []);
  useParallax(hero);

  return (
    <div className="landing" ref={page}>
      <section className="landing-hero" ref={hero}>
        <div className="landing-hero__scope">
          <LiveScope
            label="A live Vector session over New York: traffic arriving, departing and crossing the airspace"
            traffic={HERO_TRAFFIC}
            warmUpMinutes={HERO_WARM_UP_MIN}
            onSession={onSession}
          />
        </div>
        <div className="landing-hero__shade" aria-hidden="true" />
        <div className="landing-hero__grid" aria-hidden="true" />

        <div className="landing-hero__inner">
          <div className="landing-hero__content">
            <p className="hero__eyebrow landing-hero__eyebrow">
              <span className="landing-hero__pulse" aria-hidden="true" />
              New York TRACON · running live behind this page
            </p>
            <h1 className="landing-hero__title">
              Work real <span className="landing-hero__accent">airspace.</span>
            </h1>
            <p className="landing-hero__lede">
              Vector is an air traffic control simulator for the radar room: New York, Chicago and
              Dallas–Fort Worth, built from real FAA data, with live weather and realistic pilots.
            </p>
            <div className="landing-hero__actions">
              {signedIn ? (
                <Link to="/play" className="site-button site-button--primary site-button--large">
                  Play
                </Link>
              ) : !registrationOpen ? (
                <Link to="/login" className="site-button site-button--primary site-button--large">
                  Sign in
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="site-button site-button--primary site-button--large"
                  >
                    Start controlling, free
                  </Link>
                  <Link to="/login" className="site-button site-button--large landing-hero__ghost">
                    Sign in
                  </Link>
                </>
              )}
              <Link to="/airspaces/new-york" className="landing-hero__link">
                Explore N90 →
              </Link>
            </div>
          </div>
          <div className="landing-hero__readout">
            <LiveReadout session={session} />
          </div>
        </div>
        <span className="landing-hero__cue" aria-hidden="true">
          Scroll
        </span>
      </section>

      <section className="landing-facts" aria-label="Vector in numbers">
        {FACTS.map((fact) => (
          <div key={fact.label} className="landing-fact" data-reveal>
            <span className="landing-fact__value">{fact.value}</span>
            <span className="landing-fact__label">{fact.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-section" aria-labelledby="features-title">
        <p className="hero__eyebrow" data-reveal>
          The position
        </p>
        <h2 id="features-title" className="landing-section__title" data-reveal>
          Built like the real thing
        </h2>
        <div className="landing-features">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-feature"
              data-reveal
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <span className="landing-feature__number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="airspaces-title">
        <p className="hero__eyebrow" data-reveal>
          Your sectors
        </p>
        <h2 id="airspaces-title" className="landing-section__title" data-reveal>
          Three TRACONs to work
        </h2>
        <div className="landing-airspaces">
          {AIRSPACES.map((airspace, index) => (
            <Link
              key={airspace.id}
              to={`/airspaces/${airspace.id}`}
              className="landing-airspace"
              data-reveal
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <span className="landing-airspace__facility">{airspace.facility}</span>
              <h3>{airspace.name}</h3>
              <p className="landing-airspace__airports">
                {airspace.airports.map(shortAirport).join(' · ')}
              </p>
              <p>{AIRSPACE_PITCH[airspace.id]}</p>
              <span className="landing-airspace__more">See the airspace →</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="landing-section" data-reveal>
        <LatestNews />
      </div>

      {!signedIn && registrationOpen && (
        <section className="landing-cta" data-reveal>
          <h2>Your scope is ready.</h2>
          <p>Create an account, pick an airspace, and take the frequency.</p>
          <Link to="/register" className="site-button site-button--primary site-button--large">
            Create a free account
          </Link>
        </section>
      )}
    </div>
  );
}
