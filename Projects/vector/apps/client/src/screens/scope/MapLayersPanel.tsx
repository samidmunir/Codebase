import { USER_SETTINGS, type UserSettings } from '@vector/shared';
import { userSettings } from '../../settings/user-settings-store';

type BooleanKey = {
  [K in keyof UserSettings]: UserSettings[K] extends boolean ? K : never;
}[keyof UserSettings];

const MAP_LAYERS: BooleanKey[] = [
  'map.geography',
  'map.runways',
  'map.airportLabels',
  'map.finalApproachCourses',
  'map.fixes',
  'map.classB',
  'map.sectorBoundary',
  'map.minimumVectoringAltitudes',
];

const DISPLAY_OPTIONS: BooleanKey[] = ['display.rangeRings', 'display.sweepEffect'];

interface MapLayersPanelProps {
  settings: UserSettings;
  onClose: () => void;
}

function Toggle({ settingKey, settings }: { settingKey: BooleanKey; settings: UserSettings }) {
  const definition = USER_SETTINGS[settingKey];
  const checked = settings[settingKey];
  return (
    <label className="layer-toggle" title={definition.description}>
      <span>{definition.label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={() => userSettings.update({ [settingKey]: !checked })}
      />
      <span className="layer-toggle__switch" aria-hidden="true" />
    </label>
  );
}

export function MapLayersPanel({ settings, onClose }: MapLayersPanelProps) {
  const opacity = USER_SETTINGS['map.basemapOpacity'];
  return (
    <aside className="scope-panel" aria-label="Map layers">
      <div className="scope-panel__header">
        <h2>Map layers</h2>
        <button
          type="button"
          className="scope-panel__close"
          onClick={onClose}
          aria-label="Close map layers"
        >
          ×
        </button>
      </div>

      <section className="scope-panel__section">
        {MAP_LAYERS.map((key) => (
          <Toggle key={key} settingKey={key} settings={settings} />
        ))}
      </section>

      <section className="scope-panel__section">
        <h3>Display</h3>
        <div className="layer-select">
          <span>{USER_SETTINGS['display.dataBlockStyle'].label}</span>
          <div className="segmented-control" role="radiogroup" aria-label="Data block style">
            {USER_SETTINGS['display.dataBlockStyle'].options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings['display.dataBlockStyle'] === option.value}
                title={USER_SETTINGS['display.dataBlockStyle'].description}
                onClick={() => userSettings.update({ 'display.dataBlockStyle': option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {DISPLAY_OPTIONS.map((key) => (
          <Toggle key={key} settingKey={key} settings={settings} />
        ))}
      </section>

      <section className="scope-panel__section">
        <h3>Real-world map</h3>
        <Toggle settingKey="map.basemap" settings={settings} />
        <label className="layer-slider">
          <span>
            Opacity <output>{settings['map.basemapOpacity']}%</output>
          </span>
          <input
            type="range"
            min={opacity.min}
            max={opacity.max}
            step={opacity.step}
            value={settings['map.basemapOpacity']}
            disabled={!settings['map.basemap']}
            onChange={(event) =>
              userSettings.update({ 'map.basemapOpacity': Number(event.target.value) })
            }
          />
        </label>
      </section>
    </aside>
  );
}
