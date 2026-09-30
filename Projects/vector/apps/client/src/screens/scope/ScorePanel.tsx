import { formatDuration, type FlightKind } from '@vector/sim-core';
import type { ScopeSession } from '../../sim/scope-session';
import { formatUtc } from './format';
import { FLIGHT_KIND_LABELS, flightTiming, formatVsTarget } from './timing-format';
import { formatRp, SCORE_KIND_LABELS, SCORE_KIND_ORDER } from './score-format';

/** Recent RP events listed in the panel. */
const RECENT_EVENTS = 30;
/** Flights listed under "Due next". */
const DUE_NEXT = 6;
const KINDS: FlightKind[] = ['arrival', 'departure', 'transit'];

interface ScorePanelProps {
  session: ScopeSession;
  /** Changes whenever RP changes, so the panel re-renders. */
  scoreEventCount: number;
  onClose: () => void;
}

/** The session's RP: total, how it was earned and lost, and the latest events. */
export function ScorePanel({ session, onClose }: ScorePanelProps) {
  const { engine } = session;
  const { total, tally, events } = engine.score;
  const recent = events.slice(-RECENT_EVENTS).reverse();
  const stats = engine.timingStats;
  const utcAtTick = (tick: number) => session.utcAtTick(tick);
  const due = engine
    .listAircraft()
    .map((aircraft) => ({ aircraft, timing: flightTiming(engine, aircraft.id, utcAtTick) }))
    .filter(
      (d): d is { aircraft: (typeof d)['aircraft']; timing: NonNullable<(typeof d)['timing']> } =>
        d.timing !== undefined,
    )
    .sort((a, b) => a.timing.remainingSec - b.timing.remainingSec)
    .slice(0, DUE_NEXT);

  return (
    <aside className="scope-panel score-panel" aria-label="RP">
      <div className="scope-panel__header">
        <h2>RP</h2>
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Close RP"
        >
          ×
        </button>
      </div>

      <section className="scope-panel__section">
        <p className="score-panel__total" data-sign={total < 0 ? 'minus' : 'plus'}>
          {formatRp(total)}
        </p>
        <dl className="score-panel__tally">
          {SCORE_KIND_ORDER.filter((kind) => tally[kind]).map((kind) => (
            <div key={kind}>
              <dt>
                {SCORE_KIND_LABELS[kind]} <span>×{tally[kind]!.count}</span>
              </dt>
              <dd data-sign={tally[kind]!.rp < 0 ? 'minus' : 'plus'}>
                {formatRp(tally[kind]!.rp, true)}
              </dd>
            </div>
          ))}
        </dl>
        {Object.keys(tally).length === 0 && (
          <p className="scope-panel__note">
            Land arrivals and hand departures and overflights to Center to earn RP.
          </p>
        )}
      </section>

      {engine.settings['scoring.timing'] && (
        <section className="scope-panel__section">
          <h3>Timing</h3>
          <table className="timing-table">
            <thead>
              <tr>
                <th scope="col">Flights</th>
                <th scope="col" title="Landed or handed off">
                  Done
                </th>
                <th scope="col" title="Average time from when it became yours">
                  Avg time
                </th>
                <th scope="col" title="Average against the target time (− is ahead)">
                  vs target
                </th>
                <th scope="col">On time</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => {
                const s = stats[kind];
                return (
                  <tr key={kind}>
                    <th scope="row">{FLIGHT_KIND_LABELS[kind]}</th>
                    <td>{s?.count ?? 0}</td>
                    <td>{s?.count ? formatDuration(s.totalSec / s.count) : '–'}</td>
                    <td
                      data-sign={
                        s?.count ? (s.totalSec > s.totalTargetSec ? 'minus' : 'plus') : undefined
                      }
                    >
                      {s?.count ? formatVsTarget((s.totalSec - s.totalTargetSec) / s.count) : '–'}
                    </td>
                    <td>{s?.count ? `${Math.round((s.onTime / s.count) * 100)}%` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {due.length > 0 && (
            <>
              <h4 className="timing-due__title">Due next</h4>
              <ol className="timing-due">
                {due.map(({ aircraft, timing }) => (
                  <li key={aircraft.id} data-tone={timing.tone}>
                    <b>{aircraft.callsign}</b>
                    <span title={timing.label}>{timing.shortLabel}</span>
                    <span className="timing-due__left">{timing.status}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      {recent.length > 0 && (
        <section className="scope-panel__section">
          <h3>Latest</h3>
          <ol className="score-panel__events">
            {recent.map((event) => (
              <li key={event.id}>
                <span className="score-panel__time">
                  {formatUtc(session.utcAtTick(event.tick)).slice(0, 5)}
                </span>
                <span className="score-panel__what">
                  <b>{event.callsigns.join(' / ')}</b> {event.detail}
                </span>
                <span className="score-panel__rp" data-sign={event.rp < 0 ? 'minus' : 'plus'}>
                  {formatRp(event.rp, true)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
