import type { FlightKind, SessionReport } from '@vector/sim-core';
import { RpChart } from './RpChart';
import { formatRp, SCORE_KIND_LABELS, SCORE_KIND_ORDER } from './score-format';
import { TimingTable } from './TimingTable';
import '../scope-screen.css';

const FLIGHT_KIND: Record<FlightKind, string> = {
  arrival: 'Arrival',
  departure: 'Departure',
  transit: 'Overflight',
};
/** Flights listed as best and as worst, and losses of separation. */
const NOTABLE_FLIGHTS = 3;
const LOSSES_LISTED = 5;

/**
 * How a session went: its numbers, RP over time and its breakdown, timing per
 * kind of flight, the best and worst flights, and separation. The debrief and a
 * session's overview page both show it.
 */
export function SessionReportView({
  report,
  flightsListed = NOTABLE_FLIGHTS,
  lossesListed = LOSSES_LISTED,
}: {
  report: SessionReport;
  flightsListed?: number;
  lossesListed?: number;
}) {
  const { stats, tickSeconds } = report;
  const durationSec = report.finalTick * tickSeconds;
  const points = report.rpHistory.map(([tick, rp]) => [tick * tickSeconds, rp] as const);
  const onTimeRate = stats.timed > 0 ? Math.round((stats.onTime / stats.timed) * 100) : undefined;
  const utcAt = (tick: number) =>
    new Date(Date.parse(report.startTimeUtc) + tick * tickSeconds * 1000);
  const losses = report.losses.slice(0, lossesListed);

  return (
    <>
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
            <p className="scope-panel__note">No RP earned or lost.</p>
          )}
        </section>

        <section className="debrief__section">
          <h3>How it was earned</h3>
          <dl className="score-panel__tally">
            {SCORE_KIND_ORDER.filter((kind) => report.tally[kind]).map((kind) => (
              <div key={kind}>
                <dt>
                  {SCORE_KIND_LABELS[kind]} <span>×{report.tally[kind]!.count}</span>
                </dt>
                <dd data-sign={report.tally[kind]!.rp < 0 ? 'minus' : 'plus'}>
                  {formatRp(report.tally[kind]!.rp, true)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="debrief__section">
          <h3>Timing</h3>
          <TimingTable stats={report.timing} />
        </section>

        <section className="debrief__section">
          <h3>Best flights</h3>
          <FlightList flights={report.best.slice(0, flightsListed)} empty="No flights earned RP." />
        </section>

        <section className="debrief__section">
          <h3>Worst flights</h3>
          <FlightList
            flights={report.worst.slice(0, flightsListed)}
            empty="No flight lost RP."
            showWorst
          />
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
                    {loss.wake ? 'Wake spacing' : 'Separation'}: {loss.closestLateralNm.toFixed(1)}{' '}
                    of {loss.requiredLateralNm} NM, {Math.round(loss.closestVerticalFt / 100) * 100}{' '}
                    ft
                  </span>
                  <span className="debrief__when">
                    {utcAt(loss.startTick).toISOString().slice(11, 16)}Z
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function FlightList({
  flights,
  empty,
  showWorst = false,
}: {
  flights: SessionReport['best'];
  empty: string;
  /** Explain each flight by its costliest event rather than its last one. */
  showWorst?: boolean;
}) {
  if (flights.length === 0) return <p className="scope-panel__note">{empty}</p>;
  return (
    <ol className="debrief__flights">
      {flights.map((flight) => {
        const detail = showWorst ? (flight.worstDetail ?? flight.lastDetail) : flight.lastDetail;
        return (
          <li key={flight.callsign}>
            <b>{flight.callsign}</b>
            <span className="debrief__kind">{flight.kind ? FLIGHT_KIND[flight.kind] : ''}</span>
            <span className="debrief__rp" data-sign={flight.rp < 0 ? 'minus' : 'plus'}>
              {formatRp(flight.rp, true)}
            </span>
            {detail && <span className="debrief__detail">{detail}</span>}
          </li>
        );
      })}
    </ol>
  );
}
