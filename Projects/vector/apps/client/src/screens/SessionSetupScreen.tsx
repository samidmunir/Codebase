import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  applyDifficulty,
  detectDifficulty,
  DIFFICULTY_LEVELS,
  IN_SESSION_TRAFFIC_KEYS,
  SESSION_SETTINGS,
  type SessionSettings,
} from '@vector/shared';
import { withGust, type AirspacePack } from '@vector/sim-core';
import { useAirspaceStatus } from '../airspaces/airspace-status';
import { findAirspace } from '../airspaces/registry';
import { SettingRow } from '../components/settings/SettingControl';
import { useGameControls } from '../controls/use-game-controls';
import { shortAirport } from '../scope/data-block';
import { formatWind } from './scope/format';
import { fetchMetars } from '../api/weather-api';
import { DIFFICULTY_LABELS } from '../settings/difficulty';
import {
  defaultSetupSettings,
  loadSetupSettings,
  newSeed,
  previewSetup,
  saveSetupSettings,
  type SessionSetup,
} from '../sim/session-setup';
import './session-setup.css';

type SessionKey = keyof SessionSettings;

const keysIn = (prefix: string) =>
  (Object.keys(SESSION_SETTINGS) as SessionKey[]).filter((key) => key.startsWith(prefix));

const TRAFFIC_KEYS: SessionKey[] = [...IN_SESSION_TRAFFIC_KEYS, 'traffic.fleetMix'];
const WIND_LIMIT_KEYS: SessionKey[] = [
  'weather.maxTailwindKts',
  'weather.maxCrosswindKts',
  'weather.windVariation',
  'weather.windVariationPeriodMin',
  'weather.runwayChanges',
  'weather.runwayChangeNoticeMin',
];

/** Rules and realism, collapsed by default: most players keep the defaults. */
const ADVANCED_GROUPS: { label: string; keys: SessionKey[] }[] = [
  { label: 'Separation', keys: keysIn('separation.') },
  { label: 'Approaches', keys: keysIn('approaches.') },
  { label: 'Departures', keys: keysIn('departures.') },
  { label: 'Center', keys: keysIn('center.') },
  { label: 'RP scoring', keys: keysIn('scoring.') },
  { label: 'Pilots', keys: keysIn('pilots.') },
  { label: 'Radar', keys: keysIn('radar.') },
  { label: 'Simulation', keys: keysIn('sim.') },
];

/** Choose difficulty, traffic, wind, runways and rules, then start the session. */
export function SessionSetupScreen() {
  const { airspaceId = '' } = useParams();
  const entry = findAirspace(airspaceId);
  const { isOpen } = useAirspaceStatus();
  const navigate = useNavigate();
  const [pack, setPack] = useState<{ id: string; pack: AirspacePack } | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [setup, setSetup] = useState<SessionSetup>(() => ({
    settings: loadSetupSettings(),
    seed: newSeed(),
    runwayConfigs: {},
  }));

  useGameControls({ closeMenu: () => void navigate('/play') });

  useEffect(() => {
    if (!entry?.load) return;
    let cancelled = false;
    entry
      .load()
      .then((loaded) => !cancelled && setPack({ id: entry.id, pack: loaded }))
      .catch((caught: unknown) => !cancelled && setError(String(caught)));
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const loadedPack = pack?.id === entry?.id ? pack?.pack : undefined;

  // Live wind: fetch the current reports so the preview (and the session) start from them.
  const live = setup.settings['weather.windMode'] === 'live';
  const [liveFetch, setLiveFetch] = useState<
    { state: 'loading' } | { state: 'ok'; at: Date } | { state: 'failed'; message: string }
  >({ state: 'loading' });
  const [liveRequest, setLiveRequest] = useState(0);
  const stations = loadedPack?.airspace.airports;
  useEffect(() => {
    if (!live || !stations) return;
    let cancelled = false;
    fetchMetars(stations)
      .then(({ observations }) => {
        if (cancelled) return;
        setSetup((current) => ({ ...current, liveWeather: observations, runwayConfigs: {} }));
        setLiveFetch({ state: 'ok', at: new Date() });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLiveFetch({
          state: 'failed',
          message: caught instanceof Error ? caught.message : String(caught),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [live, stations, liveRequest]);
  const preview = useMemo(
    () => (loadedPack ? previewSetup(loadedPack, setup) : undefined),
    [loadedPack, setup],
  );

  if (!entry?.available || !isOpen(entry.id)) {
    return (
      <main className="setup-screen setup-screen--message">
        <p>
          {entry?.available
            ? `${entry.name} is closed right now. Try another airspace.`
            : `Airspace “${airspaceId}” is not available.`}
        </p>
        <Link to="/play">Back to start</Link>
      </main>
    );
  }

  const { settings } = setup;
  const difficulty = detectDifficulty(settings);
  const update = (patch: Partial<SessionSettings>) =>
    setSetup((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  const row = (key: SessionKey, disabled = false) => (
    <SettingRow
      key={key}
      settingKey={key}
      definition={SESSION_SETTINGS[key]}
      value={settings[key]}
      disabled={disabled}
      onChange={(value) => update({ [key]: value } as Partial<SessionSettings>)}
    />
  );
  const manualWind = settings['weather.windMode'] === 'manual';

  const start = () => {
    saveSetupSettings(settings);
    void navigate(`/scope/${entry.id}`, { state: { setup } });
  };

  return (
    <main className="setup-screen">
      <header className="setup-screen__bar">
        <Link to="/play" className="setup-screen__back">
          ← Back
        </Link>
        <div>
          <p className="setup-screen__eyebrow">New session</p>
          <h1>
            <span className="setup-screen__facility">{entry.facility}</span> {entry.name}
            <span className="setup-screen__airports">
              {entry.airports.map(shortAirport).join(' · ')}
            </span>
          </h1>
        </div>
      </header>

      <div className="setup-screen__layout">
        <div className="setup-screen__main">
          <section className="setup-card" aria-labelledby="setup-traffic">
            <header className="setup-card__header">
              <h2 id="setup-traffic">Traffic</h2>
              <p>You can fine-tune traffic at any time during the session.</p>
            </header>
            <div className="setup-presets" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === level}
                  onClick={() => update(applyDifficulty(settings, level))}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
              <span className="setup-presets__custom" data-active={difficulty === 'custom'}>
                Custom
              </span>
            </div>
            <div className="setup-card__rows">{TRAFFIC_KEYS.map((key) => row(key))}</div>
          </section>

          <section className="setup-card" aria-labelledby="setup-wind">
            <header className="setup-card__header">
              <h2 id="setup-wind">Wind &amp; runways</h2>
              <p>The wind picks the runways in use, as it does in real life.</p>
            </header>
            <div className="setup-card__rows">
              {row('weather.windMode')}
              {live ? (
                <div className="setting-row">
                  <div className="setting-row__text">
                    <span className="setting-row__label">Live weather</span>
                    <p className="setting-row__description" role="status">
                      {liveFetch.state === 'loading'
                        ? 'Getting the latest reports…'
                        : liveFetch.state === 'ok'
                          ? `Latest reports as of ${liveFetch.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Checked every ${settings['weather.livePollMin']} min during the session.`
                          : `Couldn’t get live weather (${liveFetch.message}). The session starts with a realistic wind and keeps trying.`}
                    </p>
                  </div>
                  <div className="setting-row__control">
                    <button
                      type="button"
                      className="setup-button"
                      disabled={liveFetch.state === 'loading'}
                      onClick={() => {
                        setLiveFetch({ state: 'loading' });
                        setLiveRequest((n) => n + 1);
                      }}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>
              ) : manualWind ? (
                <>
                  {row('weather.manualWindDirectionDeg')}
                  {row('weather.manualWindSpeedKts')}
                  {row('weather.manualWindGustKts')}
                </>
              ) : (
                <div className="setting-row">
                  <div className="setting-row__text">
                    <span className="setting-row__label">Today’s wind</span>
                    <p className="setting-row__description">
                      A realistic random wind for the region. Roll again for a different day.
                    </p>
                  </div>
                  <div className="setting-row__control">
                    <button
                      type="button"
                      className="setup-button"
                      onClick={() =>
                        setSetup((current) => ({ ...current, seed: newSeed(), runwayConfigs: {} }))
                      }
                    >
                      ↻ New wind
                    </button>
                  </div>
                </div>
              )}
              {live && row('weather.livePollMin')}
              {WIND_LIMIT_KEYS.filter(
                (key) => !live || !key.startsWith('weather.windVariation'),
              ).map((key) => row(key))}
            </div>

            {preview && (
              <div className="setup-airports">
                {preview.map((airport) => {
                  const chosen = setup.runwayConfigs[airport.icao];
                  const suitability = airport.configs.find(
                    (c) => c.config.id === airport.runways.configId,
                  );
                  return (
                    <div key={airport.icao} className="setup-airport">
                      <div className="setup-airport__name">
                        <strong>{shortAirport(airport.icao)}</strong>
                        <span>{formatWind(airport.wind)}</span>
                      </div>
                      {live &&
                        (() => {
                          const report = setup.liveWeather?.find((r) => r.icao === airport.icao);
                          return report ? (
                            <p className="setup-airport__metar" title={report.raw}>
                              {report.raw.replace(/^(METAR|SPECI) /, '')}
                            </p>
                          ) : null;
                        })()}
                      <div className="setup-airport__runways">
                        <span>
                          ARR <b>{airport.runways.arrivals.join(' ')}</b>
                        </span>
                        <span>
                          DEP <b>{airport.runways.departures.join(' ')}</b>
                        </span>
                      </div>
                      <select
                        aria-label={`${shortAirport(airport.icao)} runway configuration`}
                        value={chosen ?? ''}
                        onChange={(event) =>
                          setSetup((current) => {
                            const runwayConfigs = { ...current.runwayConfigs };
                            if (event.target.value)
                              runwayConfigs[airport.icao] = event.target.value;
                            else delete runwayConfigs[airport.icao];
                            return { ...current, runwayConfigs };
                          })
                        }
                      >
                        <option value="">Automatic (wind)</option>
                        {airport.configs.map(
                          ({ config, tailwindKts, crosswindKts, withinLimits }) => (
                            <option key={config.id} value={config.id}>
                              {`Land ${config.arrivals.join('/')} · depart ${config.departures.join('/')}`}
                              {withinLimits
                                ? ''
                                : tailwindKts > settings['weather.maxTailwindKts']
                                  ? ` — ${Math.round(tailwindKts)} kt tailwind`
                                  : ` — ${Math.round(crosswindKts)} kt crosswind`}
                            </option>
                          ),
                        )}
                      </select>
                      {suitability && !suitability.withinLimits && (
                        <p className="setup-airport__warning">
                          {suitability.tailwindKts > settings['weather.maxTailwindKts']
                            ? `${Math.round(suitability.tailwindKts)} kt tailwind`
                            : `${Math.round(suitability.crosswindKts)} kt crosswind`}{' '}
                          on these runways, beyond your limits.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <details className="setup-card setup-advanced">
            <summary>
              <span>
                <h2>Rules &amp; realism</h2>
                <p>Separation minima, approach criteria, pilot behavior and radar.</p>
              </span>
            </summary>
            {ADVANCED_GROUPS.map((group) => (
              <div key={group.label} className="setup-advanced__group">
                <h3>{group.label}</h3>
                <div className="setup-card__rows">{group.keys.map((key) => row(key))}</div>
              </div>
            ))}
          </details>
        </div>

        <aside className="setup-summary" aria-label="Session summary">
          <h2>Summary</h2>
          <dl>
            <div>
              <dt>Traffic</dt>
              <dd>{difficulty === 'custom' ? 'Custom' : DIFFICULTY_LABELS[difficulty]}</dd>
            </div>
            <div>
              <dt>Arrivals</dt>
              <dd>
                {settings['traffic.arrivalRatePerHour'] * entry.airports.length}
                <small>/hr</small>
              </dd>
            </div>
            <div>
              <dt>Departures</dt>
              <dd>
                {settings['traffic.departureRatePerHour'] * entry.airports.length}
                <small>/hr</small>
              </dd>
            </div>
            <div>
              <dt>Transits</dt>
              <dd>
                {settings['traffic.transitRatePerHour']}
                <small>/hr</small>
              </dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>
                {manualWind
                  ? formatWind(
                      withGust(
                        {
                          directionDeg: settings['weather.manualWindDirectionDeg'],
                          speedKts: settings['weather.manualWindSpeedKts'],
                        },
                        settings['weather.manualWindGustKts'] || undefined,
                      ),
                    )
                  : live
                    ? 'Live'
                    : 'Random'}
              </dd>
            </div>
          </dl>
          {error && (
            <p className="setup-summary__error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="setup-summary__start"
            onClick={start}
            disabled={!preview || (live && liveFetch.state === 'loading')}
          >
            {!preview
              ? 'Loading airspace…'
              : live && liveFetch.state === 'loading'
                ? 'Getting live weather…'
                : 'Start session'}
          </button>
          <button
            type="button"
            className="setup-summary__reset"
            onClick={() =>
              setSetup((current) => ({
                ...current,
                settings: defaultSetupSettings(),
                runwayConfigs: {},
              }))
            }
          >
            Reset to defaults
          </button>
        </aside>
      </div>
    </main>
  );
}
