import { useState } from 'react';
import type { DepartureEntry } from '@vector/sim-core';
import { shortAirport } from '../../scope/data-block';
import type { ScopeSession } from '../../sim/scope-session';

interface DeparturesPanelProps {
  session: ScopeSession;
  /** Changes when the queue changes, so the panel re-renders. */
  queueVersion: number;
  onClose: () => void;
}

const formatWind = (direction: number, speed: number) =>
  speed <= 2 ? 'Calm' : `${String(direction).padStart(3, '0')}° ${speed} kt`;

function countdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function DeparturesPanel({ session, onClose }: DeparturesPanelProps) {
  const { engine, pack } = session;
  const [expanded, setExpanded] = useState<string | undefined>(undefined);
  const [error, setError] = useState<{ entryId: string; reason: string } | undefined>(undefined);
  const maxQueue = engine.settings['traffic.maxDepartureQueue'];

  const release = (entry: Readonly<DepartureEntry>, runway: string) => {
    const result = session.releaseDeparture(entry.id, runway);
    if (result.ok) {
      setExpanded(undefined);
      setError(undefined);
    } else {
      setError({ entryId: entry.id, reason: result.reason });
    }
  };

  return (
    <aside className="departures-panel" aria-label="Departures">
      <header className="departures-panel__header">
        <h2>Departures</h2>
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Hide departures"
        >
          ×
        </button>
      </header>

      <div className="departures-panel__airports">
        {pack.airspace.airports.map((icao) => {
          const runways = engine.activeRunways[icao];
          const wind = engine.winds[icao];
          const entries = engine.departureQueue.filter((entry) => entry.airport === icao);
          const held = engine.gateHolds(icao);

          return (
            <section
              key={icao}
              className="departure-airport"
              aria-label={`${shortAirport(icao)} departures`}
            >
              <div className="departure-airport__header">
                <span className="departure-airport__code">{shortAirport(icao)}</span>
                {wind && (
                  <span className="departure-airport__wind">
                    {formatWind(wind.directionDeg, wind.speedKts)}
                  </span>
                )}
                <span className="departure-airport__count">
                  {entries.length}/{maxQueue}
                  {held > 0 && <span className="departure-airport__held"> · {held} at gate</span>}
                </span>
              </div>
              {runways && (
                <div className="departure-airport__runways">
                  <span>
                    <abbr title="Arrival runways">ARR</abbr> {runways.arrivals.join(' ')}
                  </span>
                  <span>
                    <abbr title="Departure runways">DEP</abbr> {runways.departures.join(' ')}
                  </span>
                </div>
              )}

              {entries.length === 0 ? (
                <p className="departure-airport__empty">No departures waiting.</p>
              ) : (
                <ol className="departure-list">
                  {entries.map((entry) => {
                    const open = expanded === entry.id && entry.status === 'waiting';
                    const secondsToTakeoff =
                      entry.takeoffAtTick !== undefined
                        ? (entry.takeoffAtTick - engine.tick) * engine.config.tickSeconds
                        : undefined;
                    return (
                      <li key={entry.id} className={`departure departure--${entry.status}`}>
                        <button
                          type="button"
                          className="departure__summary"
                          aria-expanded={open}
                          disabled={entry.status !== 'waiting'}
                          onClick={() => setExpanded(open ? undefined : entry.id)}
                        >
                          <span className="departure__callsign">{entry.callsign}</span>
                          <span className="departure__type">{entry.aircraftType}</span>
                          <span className="departure__route">
                            {shortAirport(entry.destination)} · {entry.gateFix}
                          </span>
                          <span className="departure__status">
                            {entry.status === 'waiting'
                              ? 'Ready'
                              : `${entry.runway} · ${secondsToTakeoff !== undefined && secondsToTakeoff > 0 ? countdown(secondsToTakeoff) : 'Rolling'}`}
                          </span>
                        </button>
                        {open && runways && (
                          <div className="departure__release">
                            <span className="departure__release-label">Cleared for takeoff</span>
                            {runways.departures.map((runway) => (
                              <button
                                key={runway}
                                type="button"
                                className="departure__runway"
                                onClick={() => release(entry, runway)}
                              >
                                Runway {runway}
                              </button>
                            ))}
                          </div>
                        )}
                        {error?.entryId === entry.id && (
                          <p className="departure__error">{error.reason}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
