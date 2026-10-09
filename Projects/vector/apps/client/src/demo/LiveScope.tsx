import { useEffect, useRef, useState } from 'react';
import { defaultSettings } from '@vector/shared';
import { findAirspace } from '../airspaces/registry';
import { RadarScope } from '../scope/RadarScope';
import { useUserSettings } from '../settings/user-settings-store';
import { ScopeSession } from '../sim/scope-session';
import { runDemoController } from './demo-controller';
import './live-scope.css';

/** How fast the demo runs, and how often its controller looks at the traffic (real ms). */
const DEMO_SPEED = 2;
const CONTROLLER_MS = 1_500;
/** While warming up, the controller looks at the traffic this often (sim seconds). */
const WARM_UP_CONTROLLER_SEC = 10;
/** Ticks run between yields to the page while warming up. */
const WARM_UP_CHUNK = 60;

/** A visitor working the scope (the landing page's try-it): their selection, and their aircraft. */
export interface LiveScopeVisitor {
  selectedId: string | undefined;
  onSelect: (aircraftId: string | undefined) => void;
  /** Aircraft the stand-in controller should leave to the visitor for now. */
  leaveAlone: (aircraftId: string) => boolean;
}

export interface DemoTraffic {
  arrivalsPerHour: number;
  departuresPerHour: number;
  transitsPerHour: number;
}

const DEFAULT_TRAFFIC: DemoTraffic = {
  arrivalsPerHour: 14,
  departuresPerHour: 10,
  transitsPerHour: 6,
};

/**
 * Runs the session forward this far before showing it, with the controller
 * working, so the scope opens on traffic already in the air. Yields to the page
 * between chunks so it never freezes.
 */
async function warmUp(session: ScopeSession, minutes: number, cancelled: () => boolean) {
  const tickSec = session.engine.config.tickSeconds;
  const ticks = Math.round((minutes * 60) / tickSec);
  const controllerEvery = Math.max(1, Math.round(WARM_UP_CONTROLLER_SEC / tickSec));
  for (let done = 0; done < ticks && !cancelled();) {
    const end = Math.min(ticks, done + WARM_UP_CHUNK);
    for (; done < end; done += 1) {
      session.engine.step();
      if (done % controllerEvery === 0) runDemoController(session);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  session.frame(0);
}
/** Wait this long after the page appears before loading the airspace. */
const LOAD_DELAY_MS = 250;

const noop = () => undefined;
/** Numbers each demo session, to give each its own scope. */
let sessionCount = 0;
const NO_LEADERS = new Map();

/**
 * A real Vector session running in the page, for show: traffic flies, a stand-in
 * controller works it, and nothing responds to the mouse. It loads after the page
 * appears, and pauses when it's scrolled out of view or the tab is hidden.
 */
export function LiveScope({
  airspaceId = 'new-york',
  label,
  traffic = DEFAULT_TRAFFIC,
  warmUpMinutes = 0,
  onSession,
  visitor,
}: {
  airspaceId?: string;
  label: string;
  traffic?: DemoTraffic;
  /** Start this far into the session, so it opens busy. */
  warmUpMinutes?: number;
  /** Called once the session is running (for a live readout of it). */
  onSession?: (session: ScopeSession) => void;
  /** Clicks select aircraft for a visitor to work (the scope otherwise ignores the mouse). */
  visitor?: LiveScopeVisitor;
}) {
  const { arrivalsPerHour, departuresPerHour, transitsPerHour } = traffic;
  const settings = useUserSettings();
  // The session, and the airspace it's for: when the airspace changes (the same
  // LiveScope moving from one page to the next), the old one stops showing at once.
  const [running, setRunning] = useState<
    { airspaceId: string; session: ScopeSession; key: number } | undefined
  >(undefined);
  const session = running?.airspaceId === airspaceId ? running.session : undefined;
  const container = useRef<HTMLDivElement>(null);
  // The latest visitor, for the controller's timer.
  const visitorRef = useRef(visitor);
  useEffect(() => {
    visitorRef.current = visitor;
  });

  useEffect(() => {
    const entry = findAirspace(airspaceId);
    if (!entry?.load) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      entry.load!()
        .then(async (pack) => {
          if (cancelled) return;
          const demo = new ScopeSession(pack, {
            kind: 'new',
            settings: {
              ...defaultSettings('session'),
              'weather.windMode': 'random',
              'traffic.arrivalRatePerHour': arrivalsPerHour,
              'traffic.departureRatePerHour': departuresPerHour,
              'traffic.transitRatePerHour': transitsPerHour,
              'traffic.maxDepartureQueue': 20,
              'scoring.timing': false,
            },
          });
          if (warmUpMinutes > 0) await warmUp(demo, warmUpMinutes, () => cancelled);
          if (cancelled) return;
          demo.setSpeed(DEMO_SPEED);
          sessionCount += 1;
          setRunning({ airspaceId, session: demo, key: sessionCount });
        })
        .catch(noop);
    }, LOAD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [airspaceId, arrivalsPerHour, departuresPerHour, transitsPerHour, warmUpMinutes]);

  useEffect(() => {
    if (session) onSession?.(session);
  }, [session, onSession]);

  // The stand-in controller, and pausing while nobody can see it.
  useEffect(() => {
    if (!session) return;
    let visible = true;
    const sync = () => {
      const show = visible && document.visibilityState === 'visible';
      if (show === session.engine.paused) session.togglePause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      sync();
    });
    if (container.current) observer.observe(container.current);
    document.addEventListener('visibilitychange', sync);
    const timer = setInterval(() => {
      if (!session.engine.paused)
        runDemoController(session, (id) => visitorRef.current?.leaveAlone(id) ?? false);
    }, CONTROLLER_MS);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      clearInterval(timer);
    };
  }, [session]);

  return (
    <div
      className={`live-scope${visitor ? ' live-scope--interactive' : ''}`}
      ref={container}
      role="img"
      aria-label={label}
    >
      {session && (
        // A new session gets a new scope, so its map and camera fit its airspace.
        <RadarScope
          key={running?.key}
          session={session}
          settings={settings}
          selectedId={visitor?.selectedId}
          onSelect={visitor?.onSelect ?? noop}
          selectOnly
          leaderDirections={NO_LEADERS}
          preview={undefined}
        />
      )}
    </div>
  );
}
