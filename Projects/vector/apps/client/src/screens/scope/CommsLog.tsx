import { useEffect, useRef, useState } from 'react';
import type { ScopeSession } from '../../sim/scope-session';
import { formatUtc } from './format';

interface CommsLogProps {
  session: ScopeSession;
  /** Changes when a transmission is added, so the log re-renders. */
  lastMessageId: string | undefined;
  /** Change when conflicts or violations change, so the Alerts tab re-renders. */
  conflictsKey: string;
  violationCount: number;
  selectedId: string | undefined;
  onSelect: (aircraftId: string) => void;
  onClose: () => void;
}

/** Entries shown; older ones remain in the session. */
const VISIBLE_ENTRIES = 80;

export function CommsLog({
  session,
  lastMessageId,
  conflictsKey,
  violationCount,
  selectedId,
  onSelect,
  onClose,
}: CommsLogProps) {
  const [tab, setTab] = useState<'radio' | 'alerts'>('radio');
  const listRef = useRef<HTMLOListElement>(null);
  const entries = session.engine.comms.slice(-VISIBLE_ENTRIES);

  // Follow new transmissions, unless the player has scrolled up to read.
  const followRef = useRef(true);
  useEffect(() => {
    const list = listRef.current;
    if (list && followRef.current) list.scrollTop = list.scrollHeight;
  }, [lastMessageId, tab]);

  const losing = session.engine.conflicts.some((conflict) => conflict.kind === 'loss');

  return (
    <section className="comms-log" aria-label="Radio log">
      <header className="comms-log__header">
        <div className="comms-log__tabs" role="tablist" aria-label="Radio and alerts">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'radio'}
            onClick={() => setTab('radio')}
          >
            Radio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'alerts'}
            onClick={() => setTab('alerts')}
          >
            Alerts
            {(violationCount > 0 || conflictsKey !== '') && (
              <span className={losing ? 'alert-badge alert-badge--loss' : 'alert-badge'}>
                {violationCount}
              </span>
            )}
          </button>
        </div>
        {tab === 'radio' && (
          <span className="comms-log__frequency">
            {session.pack.airspace.controllers.approach.approachCallsign}
          </span>
        )}
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Hide radio log"
        >
          ×
        </button>
      </header>
      {tab === 'alerts' ? (
        <AlertsList session={session} onSelect={onSelect} />
      ) : (
        <ol
          ref={listRef}
          className="comms-log__list"
          aria-live="polite"
          onScroll={(event) => {
            const list = event.currentTarget;
            followRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
          }}
        >
          {entries.length === 0 && <li className="comms-log__empty">No transmissions yet.</li>}
          {entries.map((entry) => {
            // Tower transmissions come before the aircraft is airborne; match those by callsign.
            const aircraftId =
              entry.aircraftId ??
              session.engine.listAircraft().find((a) => a.callsign === entry.callsign)?.id;
            const onScope =
              aircraftId !== undefined && session.engine.getAircraft(aircraftId) !== undefined;
            const selected = aircraftId !== undefined && aircraftId === selectedId;
            return (
              <li
                key={entry.id}
                className={[
                  'comms-log__entry',
                  `comms-log__entry--${entry.speaker}`,
                  selected ? 'comms-log__entry--selected' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  disabled={!onScope}
                  onClick={() => aircraftId && onSelect(aircraftId)}
                  title={onScope ? `Select ${entry.callsign}` : undefined}
                >
                  <span className="comms-log__time">
                    {formatUtc(session.utcAtTick(entry.tick)).slice(0, 5)}
                  </span>
                  <span className="comms-log__speaker">
                    {entry.speaker === 'controller'
                      ? (entry.facility ?? session.pack.airspace.facility)
                      : entry.callsign}
                  </span>
                  <span className="comms-log__text">{entry.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function AlertsList({
  session,
  onSelect,
}: {
  session: ScopeSession;
  onSelect: (aircraftId: string) => void;
}) {
  const { engine } = session;
  const callsign = (id: string) => engine.getAircraft(id)?.callsign ?? id;
  const select = (ids: readonly string[]) => {
    const onScope = ids.find((id) => engine.getAircraft(id));
    if (onScope) onSelect(onScope);
  };
  const violations = [...engine.violations].reverse();

  return (
    <div className="alerts-list">
      {engine.conflicts.length > 0 && (
        <ol className="alerts-list__section" aria-label="Active conflicts">
          {engine.conflicts.map((conflict) => (
            <li key={conflict.id}>
              <button
                type="button"
                className={`alert-row alert-row--${conflict.kind}`}
                onClick={() => select(conflict.aircraftIds)}
              >
                <span className="alert-row__kind">{conflict.kind === 'loss' ? 'LOSS' : 'CA'}</span>
                <span className="alert-row__pair">
                  {callsign(conflict.aircraftIds[0])} · {callsign(conflict.aircraftIds[1])}
                </span>
                <span className="alert-row__detail">
                  {conflict.lateralNm.toFixed(1)} NM · {Math.round(conflict.verticalFt / 100) * 100}{' '}
                  ft
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <h3 className="alerts-list__title">Separation losses</h3>
      {violations.length === 0 ? (
        <p className="comms-log__empty">No losses of separation this session.</p>
      ) : (
        <ol className="alerts-list__section" aria-label="Separation losses">
          {violations.map((violation) => {
            const seconds =
              ((violation.endTick ?? engine.tick) - violation.startTick) *
              engine.config.tickSeconds;
            return (
              <li key={violation.id}>
                <button
                  type="button"
                  className="alert-row"
                  onClick={() => select(violation.aircraftIds)}
                >
                  <span className="alert-row__time">
                    {formatUtc(session.utcAtTick(violation.startTick)).slice(0, 5)}
                  </span>
                  <span className="alert-row__pair">
                    {violation.callsigns[0]} · {violation.callsigns[1]}
                  </span>
                  <span className="alert-row__detail">
                    {violation.closestLateralNm.toFixed(1)}/{violation.requiredLateralNm} NM ·{' '}
                    {Math.round(violation.closestVerticalFt / 100) * 100} ft ·{' '}
                    {violation.endTick === undefined ? 'ongoing' : `${Math.round(seconds)} s`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
