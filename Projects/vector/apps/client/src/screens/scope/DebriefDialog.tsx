import { formatDuration, scoreStats, type FlightKind } from '@vector/sim-core';
import type { ScopeSession } from '../../sim/scope-session';
import { RpChart } from './RpChart';
import { formatRp, SCORE_KIND_LABELS, SCORE_KIND_ORDER } from './score-format';
import { TimingTable } from './TimingTable';

const FLIGHT_KIND: Record<FlightKind, string> = {
  arrival: 'Arrival',
  departure: 'Departure',
  transit: 'Overflight',
};
/** Flights listed as best and as worst. */
const NOTABLE_FLIGHTS = 3;
/** Losses of separation listed. */
const LOSSES_LISTED = 5;

export type DebriefReason = { kind: 'saved'; name: string } | { kind: 'leaving' };

/**
 * How the session went: RP over time and its breakdown, timing per kind of
 * flight, separation, and the best and worst flights. Shown after a save
 * and before leaving the scope.
 */
export function DebriefDialog({
  session,
  reason,
  onKeepWorking,
  onSave,
  onLeave,
}: {
  session: ScopeSession;
  reason: DebriefReason;
  onKeepWorking: () => void;
  onSave: () => void;
  onLeave: () => void;
}) {
  const { engine } = session;
  const score = engine.score;
  const stats = scoreStats(score);
  const tickSeconds = engine.config.tickSeconds;
  const durationSec = engine.tick * tickSeconds;
  const points = score.rpHistory.map(([tick, rp]) => [tick * tickSeconds, rp] as const);
  const flights = Object.entries(score.flights).map(([callsign, flight]) => ({
    callsign,
    ...flight,
  }));
  const best = flights
    .filter((f) => f.rp > 0)
    .sort((a, b) => b.rp - a.rp)
    .slice(0, NOTABLE_FLIGHTS);
  const worst = flights
    .filter((f) => f.rp < 0)
    .sort((a, b) => a.rp - b.rp)
    .slice(0, NOTABLE_FLIGHTS);
  const losses = [...engine.violations]
    .sort(
      (a, b) => a.closestLateralNm / a.requiredLateralNm - b.closestLateralNm / b.requiredLateralNm,
    )
    .slice(0, LOSSES_LISTED);
  const onTimeRate = stats.timed > 0 ? Math.round((stats.onTime / stats.timed) * 100) : undefined;
  const leaving = reason.kind === 'leaving';

  return (
    <div className="scope-dialog-backdrop" onMouseDown={onKeepWorking}>
      <section
        className="scope-dialog scope-dialog--debrief"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="debrief__header">
          <div>
            <p className="debrief__eyebrow">
              {reason.kind === 'saved'
                ? `Saved “${reason.name}”`
                : session.saved
                  ? session.saved.name
                  : 'This session'}
            </p>
            <h2 id="debrief-title">Session debrief</h2>
            <p className="scope-dialog__detail">
              {formatDuration(durationSec)} of sim time · {session.pack.airspace.facility}{' '}
              {session.pack.airspace.name}
            </p>
          </div>
          <p className="debrief__total" data-sign={score.total < 0 ? 'minus' : 'plus'}>
            {formatRp(score.total)}
          </p>
        </header>

        <dl className="debrief__stats">
          <div>
            <dt>Landed</dt>
            <dd>{stats.arrivals}</dd>
          </div>
          <div>
            <dt>Departures handed off</dt>
            <dd>{stats.departures}</dd>
          </div>
          <div>
            <dt>Overflights handed off</dt>
            <dd>{stats.overflights}</dd>
          </div>
          <div>
            <dt>On time</dt>
            <dd>{onTimeRate === undefined ? '–' : `${onTimeRate}%`}</dd>
          </div>
          <div>
            <dt>Losses of separation</dt>
            <dd data-sign={stats.separationLosses + stats.nearMidAirs > 0 ? 'minus' : undefined}>
              {stats.separationLosses + stats.nearMidAirs}
            </dd>
          </div>
          <div>
            <dt>Wake spacing lost</dt>
            <dd data-sign={stats.wakeLosses > 0 ? 'minus' : undefined}>{stats.wakeLosses}</dd>
          </div>
        </dl>

        <div className="debrief__body">
          <section className="debrief__section debrief__section--wide">
            <h3>RP over the session</h3>
            {points.length > 0 ? (
              <RpChart points={points} durationSec={durationSec} />
            ) : (
              <p className="scope-panel__note">No RP earned or lost yet.</p>
            )}
          </section>

          <section className="debrief__section">
            <h3>How it was earned</h3>
            <dl className="score-panel__tally">
              {SCORE_KIND_ORDER.filter((kind) => score.tally[kind]).map((kind) => (
                <div key={kind}>
                  <dt>
                    {SCORE_KIND_LABELS[kind]} <span>×{score.tally[kind]!.count}</span>
                  </dt>
                  <dd data-sign={score.tally[kind]!.rp < 0 ? 'minus' : 'plus'}>
                    {formatRp(score.tally[kind]!.rp, true)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="debrief__section">
            <h3>Timing</h3>
            <TimingTable stats={engine.timingStats} />
          </section>

          <section className="debrief__section">
            <h3>Best flights</h3>
            <FlightList flights={best} empty="No flights have earned RP yet." />
          </section>

          <section className="debrief__section">
            <h3>Worst flights</h3>
            <FlightList flights={worst} empty="No flight has lost RP." showWorst />
          </section>

          <section className="debrief__section debrief__section--wide">
            <h3>Separation</h3>
            {losses.length === 0 ? (
              <p className="scope-panel__note">Separation was never lost.</p>
            ) : (
              <ol className="debrief__losses">
                {losses.map((loss) => (
                  <li key={loss.id}>
                    <b>
                      {loss.callsigns[0]} · {loss.callsigns[1]}
                    </b>
                    <span>
                      {loss.wake ? 'Wake spacing' : 'Separation'}:{' '}
                      {loss.closestLateralNm.toFixed(1)} of {loss.requiredLateralNm} NM,{' '}
                      {Math.round(loss.closestVerticalFt / 100) * 100} ft
                    </span>
                    <span className="debrief__when">
                      {session.utcAtTick(loss.startTick).toISOString().slice(11, 16)}Z
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="scope-dialog__actions">
          {leaving && (
            <button type="button" className="scope-button" onClick={onLeave}>
              Leave{session.saved ? '' : ' without saving'}
            </button>
          )}
          {leaving && (
            <button type="button" className="scope-button" onClick={onSave}>
              Save first
            </button>
          )}
          {!leaving && (
            <button type="button" className="scope-button" onClick={onLeave}>
              Back to start
            </button>
          )}
          <button
            type="button"
            className="scope-button scope-button--primary"
            onClick={onKeepWorking}
          >
            Keep working
          </button>
        </div>
      </section>
    </div>
  );
}

function FlightList({
  flights,
  empty,
  showWorst = false,
}: {
  flights: {
    callsign: string;
    kind?: FlightKind | undefined;
    rp: number;
    lastDetail?: string | undefined;
    worstDetail?: string | undefined;
  }[];
  empty: string;
  /** Explain each flight by its costliest event rather than its last one. */
  showWorst?: boolean;
}) {
  if (flights.length === 0) return <p className="scope-panel__note">{empty}</p>;
  return (
    <ol className="debrief__flights">
      {flights.map((flight) => (
        <li key={flight.callsign}>
          <b>{flight.callsign}</b>
          <span className="debrief__kind">{flight.kind ? FLIGHT_KIND[flight.kind] : ''}</span>
          <span className="debrief__rp" data-sign={flight.rp < 0 ? 'minus' : 'plus'}>
            {formatRp(flight.rp, true)}
          </span>
          {(showWorst ? (flight.worstDetail ?? flight.lastDetail) : flight.lastDetail) && (
            <span className="debrief__detail">
              {showWorst ? (flight.worstDetail ?? flight.lastDetail) : flight.lastDetail}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
