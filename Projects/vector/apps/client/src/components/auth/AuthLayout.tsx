import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { findAirspace } from '../../airspaces/registry';
import { LiveScope, type DemoTraffic } from '../../demo/LiveScope';
import type { ScopeSession } from '../../sim/scope-session';
import './auth-layout.css';

/** A steady, busy session behind the sign-in pages. */
const TRAFFIC: DemoTraffic = { arrivalsPerHour: 12, departuresPerHour: 14, transitsPerHour: 10 };
const WARM_UP_MIN = 15;
/** How many radio calls the feed shows, and how often it reads them (real ms). */
const FEED_LENGTH = 6;
const FEED_MS = 1_000;

interface FeedLine {
  id: string;
  who: string;
  text: string;
  controller: boolean;
}

/** The latest calls on frequency in the session, as the scope's radio log has them. */
function RadioFeed({ session, facility }: { session: ScopeSession | undefined; facility: string }) {
  const [lines, setLines] = useState<FeedLine[]>([]);
  useEffect(() => {
    if (!session) return;
    const read = () =>
      setLines(
        session.engine.comms.slice(-FEED_LENGTH).map((entry) => ({
          id: entry.id,
          who:
            entry.facility ?? (entry.speaker === 'controller' ? facility : (entry.callsign ?? '')),
          text: entry.text,
          controller: entry.speaker === 'controller' && !entry.facility,
        })),
      );
    read();
    const timer = setInterval(read, FEED_MS);
    return () => clearInterval(timer);
  }, [session, facility]);

  return (
    // Decorative: it changes every second, which a screen reader shouldn't read out.
    <ol className="auth-feed" aria-hidden="true">
      {lines.map((line) => (
        <li key={line.id} data-controller={line.controller || undefined}>
          <span className="auth-feed__who">{line.who}</span>
          <span className="auth-feed__text">{line.text}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The sign-in pages' layout: a live session on one side, with its radio calls,
 * and the form on the other. On a phone the session is a band across the top.
 */
export function AuthLayout({
  airspaceId = 'new-york',
  children,
}: {
  airspaceId?: string;
  children: ReactNode;
}) {
  const airspace = findAirspace(airspaceId);
  const [session, setSession] = useState<ScopeSession | undefined>(undefined);
  const onSession = useCallback((running: ScopeSession) => setSession(running), []);

  return (
    <div className="auth-layout">
      <section className="auth-layout__live">
        <LiveScope
          airspaceId={airspaceId}
          label={`A live Vector session in ${airspace?.name ?? 'New York'}`}
          traffic={TRAFFIC}
          warmUpMinutes={WARM_UP_MIN}
          onSession={onSession}
        />
        <div className="auth-layout__shade" aria-hidden="true" />
        <Link to="/" className="auth-layout__brand" aria-label="Vector home">
          <span className="auth-layout__mark" aria-hidden="true" />
          Vector
        </Link>
        <div className="auth-layout__caption">
          <p className="auth-layout__facility">
            <span className="auth-layout__dot" aria-hidden="true" />
            Live · {airspace?.facility} {airspace?.name}
          </p>
          <p className="auth-layout__tagline">The frequency is yours.</p>
          <RadioFeed session={session} facility={`${airspace?.facility ?? 'N90'} APP`} />
        </div>
      </section>

      <main className="auth-layout__panel">
        <div className="auth-layout__form">{children}</div>
        <p className="auth-layout__legal">
          <Link to="/about">About</Link> · <Link to="/terms">Terms</Link> ·{' '}
          <Link to="/privacy">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
