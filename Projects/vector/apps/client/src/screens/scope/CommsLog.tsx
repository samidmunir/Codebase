import { useEffect, useRef } from 'react';
import type { ScopeSession } from '../../sim/scope-session';
import { formatUtc } from './format';

interface CommsLogProps {
  session: ScopeSession;
  /** Changes when a transmission is added, so the log re-renders. */
  lastMessageId: string | undefined;
  selectedId: string | undefined;
  onSelect: (aircraftId: string) => void;
  onClose: () => void;
}

/** Entries shown; older ones remain in the session. */
const VISIBLE_ENTRIES = 80;

export function CommsLog({ session, lastMessageId, selectedId, onSelect, onClose }: CommsLogProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const entries = session.engine.comms.slice(-VISIBLE_ENTRIES);

  // Follow new transmissions, unless the player has scrolled up to read.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (nearBottom) list.scrollTop = list.scrollHeight;
  }, [lastMessageId]);

  return (
    <section className="comms-log" aria-label="Radio log">
      <header className="comms-log__header">
        <h2>Radio</h2>
        <span className="comms-log__frequency">
          {session.pack.airspace.controllers.approach.approachCallsign}
        </span>
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Hide radio log"
        >
          ×
        </button>
      </header>
      <ol ref={listRef} className="comms-log__list" aria-live="polite">
        {entries.length === 0 && <li className="comms-log__empty">No transmissions yet.</li>}
        {entries.map((entry) => {
          const selected = entry.aircraftId !== undefined && entry.aircraftId === selectedId;
          const aircraftId = entry.aircraftId;
          const onScope =
            aircraftId !== undefined && session.engine.getAircraft(aircraftId) !== undefined;
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
                  {entry.speaker === 'controller' ? session.pack.airspace.facility : entry.callsign}
                </span>
                <span className="comms-log__text">{entry.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
