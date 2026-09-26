import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  IN_SESSION_TRAFFIC_KEYS,
  SESSION_SETTINGS,
} from '@vector/shared';
import type { ScopeSession } from '../../sim/scope-session';
import { DIFFICULTY_LABELS } from '../../settings/difficulty';

interface TrafficPanelProps {
  session: ScopeSession;
  /** Changes when the traffic settings change, so the panel re-renders. */
  trafficKey: string;
  onClose: () => void;
}

/** Tunes traffic while the session runs; the values are saved with the session. */
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
        <h3>Preset</h3>
        <div className="segmented-control traffic-presets" role="radiogroup" aria-label="Preset">
          {DIFFICULTY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={difficulty === level}
              onClick={() => session.updateTraffic(DIFFICULTY_PRESETS[level])}
            >
              {DIFFICULTY_LABELS[level]}
            </button>
          ))}
        </div>
        {difficulty === 'custom' && <p className="scope-panel__note">Custom traffic</p>}
      </section>

      <section className="scope-panel__section">
        <h3>Rates</h3>
        {IN_SESSION_TRAFFIC_KEYS.map((key) => {
          const definition = SESSION_SETTINGS[key];
          return (
            <label key={key} className="layer-slider" title={definition.description}>
              <span>
                {definition.label}
                <output>
                  {values[key]}
                  {'unit' in definition && definition.unit ? ` ${definition.unit}` : ''}
                </output>
              </span>
              <input
                type="range"
                min={definition.min}
                max={definition.max}
                step={definition.step}
                value={values[key]}
                onChange={(event) => session.updateTraffic({ [key]: Number(event.target.value) })}
              />
            </label>
          );
        })}
        <p className="scope-panel__note">
          Changes apply now and are kept when you save the session.
        </p>
      </section>
    </aside>
  );
}
