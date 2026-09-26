import { USER_SETTINGS, type UserSettings } from '@vector/shared';
import { HEAT_GRADIENT_CSS, HEAT_LEGEND } from '../../scope/render/heat-scale';
import { userSettings } from '../../settings/user-settings-store';

type BooleanKey = {
  [K in keyof UserSettings]: UserSettings[K] extends boolean ? K : never;
}[keyof UserSettings];

const MAP_LAYERS: BooleanKey[] = [
  'map.geography',
  'map.runways',
  'map.airportLabels',
  'map.otherAirports',
  'map.finalApproachCourses',
  'map.fixes',
  'map.classB',
  'map.classC',
  'map.sectorBoundary',
  'map.artccBoundaries',
  'map.airwaysHigh',
  'map.airwaysLow',
  'map.minimumVectoringAltitudes',
  'map.minimumIfrAltitudes',
];

const TRAFFIC_COLORS = [
  'display.color.arrivals',
  'display.color.departures',
  'display.color.transits',
] as const;

const DISPLAY_OPTIONS: BooleanKey[] = [
  'display.headingVector',
  'display.rangeRings',
  'display.sweepEffect',
];

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
        <h3>Traffic colors</h3>
        {TRAFFIC_COLORS.map((key) => (
          <label key={key} className="traffic-color" title={USER_SETTINGS[key].description}>
            <span className="traffic-color__swatch" style={{ background: settings[key] }} />
            <span>{USER_SETTINGS[key].label.replace(' color', 's')}</span>
            <input
              type="color"
              value={settings[key]}
              onChange={(event) => userSettings.update({ [key]: event.target.value })}
              aria-label={USER_SETTINGS[key].label}
            />
          </label>
        ))}
        <p className="scope-panel__note">Traffic you don’t control is always grey.</p>
      </section>

      <section className="scope-panel__section">
        <h3>Heat trails</h3>
        <Toggle settingKey="display.heatTrail" settings={settings} />
        <div className="layer-select">
          <span>Color by</span>
          <div
            className="segmented-control segmented-control--three"
            role="radiogroup"
            aria-label="Heat trail colors"
          >
            {USER_SETTINGS['display.heatTrailColorBy'].options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings['display.heatTrailColorBy'] === option.value}
                disabled={!settings['display.heatTrail']}
                onClick={() => userSettings.update({ 'display.heatTrailColorBy': option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="heat-legend" aria-hidden="true">
          <span className="heat-legend__bar" style={{ background: HEAT_GRADIENT_CSS }} />
          <span className="heat-legend__labels">
            <span>{HEAT_LEGEND[settings['display.heatTrailColorBy']][0]}</span>
            <span>{HEAT_LEGEND[settings['display.heatTrailColorBy']][1]}</span>
          </span>
        </div>
        <div className="layer-select">
          <span>Show for</span>
          <div className="segmented-control" role="radiogroup" aria-label="Heat trails for">
            {USER_SETTINGS['display.heatTrailAircraft'].options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings['display.heatTrailAircraft'] === option.value}
                disabled={!settings['display.heatTrail']}
                onClick={() => userSettings.update({ 'display.heatTrailAircraft': option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
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
