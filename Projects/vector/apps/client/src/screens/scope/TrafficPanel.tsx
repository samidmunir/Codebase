import { IN_SESSION_TRAFFIC_KEYS, SESSION_SETTINGS } from '@vector/shared';
import type { ScopeSession } from '../../sim/scope-session';
import { DIFFICULTY_LABELS } from '../../settings/difficulty';

interface TrafficPanelProps {
  session: ScopeSession;
  /** Changes when the traffic settings change, so the panel re-renders. */
  trafficKey: string;
  onClose: () => void;
}

/**
 * The session's traffic: chosen in setup and fixed for the session, so every
 * pilot's session on the records is judged the same way.
 */
export function TrafficPanel({ session, onClose }: TrafficPanelProps) {
  const values = session.trafficSettings;
  const difficulty = session.difficulty;

  return (
    <aside className="scope-panel" aria-label="Traffic">
      <div className="scope-panel__header">
        <h2>Traffic</h2>
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Close traffic"
        >
          ×
        </button>
      </div>

      <section className="scope-panel__section">
        <h3>Difficulty</h3>
        <p className="traffic-difficulty">
          {difficulty === 'custom'
            ? 'Custom (practice, not ranked)'
            : DIFFICULTY_LABELS[difficulty]}
        </p>
        <dl className="traffic-rates">
          {IN_SESSION_TRAFFIC_KEYS.map((key) => {
            const definition = SESSION_SETTINGS[key];
            return (
              <div key={key} title={definition.description}>
                <dt>{definition.label}</dt>
                <dd>
                  {values[key]}
                  {'unit' in definition && definition.unit ? ` ${definition.unit}` : ''}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="scope-panel__note">
          Traffic is set when the session starts and stays the same throughout, so sessions on the
          records are comparable. Start a new session to change it.
        </p>
      </section>
    </aside>
  );
}
