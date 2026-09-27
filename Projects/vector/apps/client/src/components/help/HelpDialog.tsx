import { USER_SETTINGS, type UserSettings } from '@vector/shared';
import { bindingKeys } from '../../settings/key-labels';
import { useUserSettings } from '../../settings/user-settings-store';
import './help-dialog.css';

const KEY_ORDER: (keyof UserSettings)[] = [
  'controls.keys.togglePause',
  'controls.keys.simSpeedUp',
  'controls.keys.simSpeedDown',
  'controls.keys.zoomIn',
  'controls.keys.zoomOut',
  'controls.keys.centerScope',
  'controls.keys.toggleCommsLog',
  'controls.keys.toggleDepartureQueue',
  'controls.keys.toggleTraffic',
  'controls.keys.toggleScore',
  'controls.keys.toggleMapLayers',
  'controls.keys.saveSession',
  'controls.keys.openSettings',
  'controls.keys.openHelp',
  'controls.keys.closeMenu',
];

/** A quick reference: symbols, colors, controls, and how to work each kind of flight. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const settings = useUserSettings();
  const color = (key: keyof UserSettings) => settings[key] as string;

  return (
    <div className="help-backdrop" onMouseDown={onClose}>
      <div
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="help-dialog__header">
          <h2 id="help-title">Quick reference</h2>
          <button type="button" className="help-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="help-dialog__grid">
          <section>
            <h3>Your traffic</h3>
            <ul className="help-list">
              <li>
                <i style={{ background: color('display.color.arrivals') }} /> <b>Arrivals</b> —
                descend from cruise, sequence, clear the ILS. Tower takes them once established.
              </li>
              <li>
                <i style={{ background: color('display.color.departures') }} /> <b>Departures</b> —
                release from the queue, climb to their requested level, hand to Center.
              </li>
              <li>
                <i style={{ background: color('display.color.transits') }} /> <b>Overflights</b> —
                keep them clear of your flows and hand them to Center before they leave.
              </li>
              <li>
                <i style={{ background: '#6f8f83' }} /> <b>Grey</b> — someone else’s: Tower, or
                Center after a handoff.
              </li>
            </ul>
          </section>

          <section>
            <h3>Reading a data block</h3>
            <pre className="help-block" style={{ color: color('display.color.departures') }}>
              {'DAL1601\n116↑360 334\nE175 ORD →MERIT'}
            </pre>
            <ul className="help-list help-list--plain">
              <li>
                <code>116</code> altitude in hundreds (11,600 ft; <code>350</code> is FL350)
              </li>
              <li>
                <code>↑360</code> climbing to FL360 (<code>↓</code> descending)
              </li>
              <li>
                <code>334</code> ground speed · <code>→MERIT</code> flying to MERIT
              </li>
            </ul>
          </section>

          <section>
            <h3>Symbols</h3>
            <ul className="help-list help-list--plain">
              <li>
                <code className="caution">CA</code> conflict predicted within 40 s
              </li>
              <li>
                <code className="alert">CA</code> flashing: separation lost (5 NM or less costs RP)
              </li>
              <li>
                <code>#</code> and <code>CST</code> coasting: no radar covers it right now
              </li>
              <li>Heat trail: the path since it became yours (hot = recent)</li>
              <li>Dots behind a target: its last few radar returns</li>
            </ul>
          </section>

          <section>
            <h3>Mouse</h3>
            <ul className="help-list help-list--plain">
              <li>Click an aircraft (or a callsign in the radio log) to instruct it</li>
              <li>Drag to pan · scroll or pinch to zoom · double-click to zoom in</li>
              <li>Right-drag to measure bearing and distance</li>
              <li>Hover a fix in the Direct list to find it on the scope</li>
            </ul>
          </section>

          <section className="help-dialog__keys">
            <h3>Keyboard</h3>
            <dl>
              {KEY_ORDER.map((key) => {
                const keys = bindingKeys(settings[key] as string);
                return (
                  <div key={key}>
                    <dt>{USER_SETTINGS[key].label}</dt>
                    <dd>
                      {keys.length === 0 ? (
                        <span className="help-unbound">Not set</span>
                      ) : (
                        keys.map((k, i) => <kbd key={i}>{k}</kbd>)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
