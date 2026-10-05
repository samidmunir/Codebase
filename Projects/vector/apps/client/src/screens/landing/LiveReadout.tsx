import { useEffect, useState, type CSSProperties } from 'react';
import { useUserSettings } from '../../settings/user-settings-store';
import type { ScopeSession } from '../../sim/scope-session';
import { shortAirport } from '../../scope/data-block';

/** How often the readout reads the session (real ms). */
const READ_MS = 1_000;

interface Readout {
  utc: string;
  total: number;
  arrivals: number;
  departures: number;
  transits: number;
  waiting: number;
  runways: { airport: string; arrivals: string; departures: string }[];
}

/** What's in the air right now, by kind: arrivals land here, departures leave from here. */
function read(session: ScopeSession): Readout {
  const { engine, pack } = session;
  const ours = new Set(pack.airspace.airports);
  let arrivals = 0;
  let departures = 0;
  let transits = 0;
  for (const aircraft of engine.listAircraft()) {
    const { origin, destination } = aircraft.flightPlan;
    if (ours.has(destination)) arrivals += 1;
    else if (ours.has(origin)) departures += 1;
    else transits += 1;
  }
  return {
    utc: engine.utcTime.toISOString().slice(11, 16),
    total: arrivals + departures + transits,
    arrivals,
    departures,
    transits,
    waiting: engine.departureQueue.filter((entry) => entry.status === 'waiting').length,
    runways: pack.airspace.airports.map((icao) => ({
      airport: shortAirport(icao),
      arrivals: engine.activeRunways[icao]?.arrivals.join(' ') ?? '–',
      departures: engine.activeRunways[icao]?.departures.join(' ') ?? '–',
    })),
  };
}

/** A live panel over the front page's scope: the session's clock and traffic, as it runs. */
export function LiveReadout({ session }: { session: ScopeSession | undefined }) {
  const [readout, setReadout] = useState<Readout | undefined>(undefined);
  const settings = useUserSettings();
  // The same colors the scope draws each kind of traffic in.
  const kind = (key: 'arrivals' | 'departures' | 'transits') =>
    ({ '--kind-color': settings[`display.color.${key}`] }) as CSSProperties;

  useEffect(() => {
    if (!session) return;
    const update = () => setReadout(read(session));
    const timer = setInterval(update, READ_MS);
    const first = setTimeout(update, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [session]);

  return (
    <aside
      className="live-readout"
      aria-label="Live traffic in this session"
      data-ready={readout ? 'true' : undefined}
    >
      <header className="live-readout__header">
        <span className="live-readout__live">
          <span className="live-readout__dot" aria-hidden="true" />
          Live · N90
        </span>
        <span className="live-readout__clock">{readout ? `${readout.utc}Z` : '--:--Z'}</span>
      </header>
      <p className="live-readout__total">
        <span>{readout?.total ?? '–'}</span> aircraft on the scope
      </p>
      <dl className="live-readout__kinds">
        <div style={kind('arrivals')}>
          <dt>Arrivals</dt>
          <dd>{readout?.arrivals ?? '–'}</dd>
        </div>
        <div style={kind('departures')}>
          <dt>Departures</dt>
          <dd>{readout?.departures ?? '–'}</dd>
        </div>
        <div style={kind('transits')}>
          <dt>Overflights</dt>
          <dd>{readout?.transits ?? '–'}</dd>
        </div>
      </dl>
      {readout && (
        <table className="live-readout__runways">
          <caption>
            Runways in use{readout.waiting > 0 && ` · ${readout.waiting} waiting to depart`}
          </caption>
          <thead>
            <tr>
              <th scope="col">Airport</th>
              <th scope="col">Landing</th>
              <th scope="col">Departing</th>
            </tr>
          </thead>
          <tbody>
            {readout.runways.map((row) => (
              <tr key={row.airport}>
                <th scope="row">{row.airport}</th>
                <td>{row.arrivals}</td>
                <td>{row.departures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
