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
/** Wait this long after the page appears before loading the airspace. */
const LOAD_DELAY_MS = 250;

const noop = () => undefined;
const NO_LEADERS = new Map();

/**
 * A real Vector session running in the page, for show: traffic flies, a stand-in
 * controller works it, and nothing responds to the mouse. It loads after the page
 * appears, and pauses when it's scrolled out of view or the tab is hidden.
 */
export function LiveScope({
  airspaceId = 'new-york',
  label,
}: {
  airspaceId?: string;
  label: string;
}) {
  const settings = useUserSettings();
  const [session, setSession] = useState<ScopeSession | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const entry = findAirspace(airspaceId);
    if (!entry?.load) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      entry.load!()
        .then((pack) => {
          if (cancelled) return;
          const demo = new ScopeSession(pack, {
            kind: 'new',
            settings: {
              ...defaultSettings('session'),
              'weather.windMode': 'random',
              'traffic.arrivalRatePerHour': 14,
              'traffic.departureRatePerHour': 10,
              'traffic.transitRatePerHour': 6,
              'scoring.timing': false,
            },
          });
          demo.setSpeed(DEMO_SPEED);
          setSession(demo);
        })
        .catch(noop);
    }, LOAD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [airspaceId]);

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
      if (!session.engine.paused) runDemoController(session);
    }, CONTROLLER_MS);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      clearInterval(timer);
    };
  }, [session]);

  return (
    <div className="live-scope" ref={container} role="img" aria-label={label}>
      {session && (
        <RadarScope
          session={session}
          settings={settings}
          selectedId={undefined}
          onSelect={noop}
          leaderDirections={NO_LEADERS}
          preview={undefined}
        />
      )}
    </div>
  );
}
