import {
  applyDifficulty,
  defaultSettings,
  resolveSettings,
  type SessionSettings,
} from '@vector/shared';
import {
  SimEngine,
  windComponents,
  type ActiveRunways,
  type AirspacePack,
  type RunwayConfig,
  type Wind,
} from '@vector/sim-core';
import { airlines, performanceCatalog } from '../airspaces/registry';
import { DEFAULT_DIFFICULTY } from '../settings/difficulty';

// The choices made on the session setup screen, handed to the scope when the
// session starts. The last setup is remembered in this browser as a convenience.

export interface SessionSetup {
  settings: SessionSettings;
  /** Seeds the random wind and traffic, so the wind previewed is the wind flown. */
  seed: number;
  /** Runway configuration chosen per airport; airports left out use the wind's choice. */
  runwayConfigs: Record<string, string>;
}

const STORAGE_KEY = 'vector.sessionSetup';

export const newSeed = () => Math.floor(Math.random() * 2 ** 32);

export function defaultSetupSettings(): SessionSettings {
  return applyDifficulty(defaultSettings('session'), DEFAULT_DIFFICULTY);
}

export function loadSetupSettings(): SessionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSetupSettings();
    return resolveSettings('session', JSON.parse(stored) as unknown).values;
  } catch {
    return defaultSetupSettings();
  }
}

export function saveSetupSettings(settings: SessionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the setup still applies to this session.
  }
}

/** Reads a setup passed through navigation state; anything invalid is dropped. */
export function parseSetup(state: unknown): SessionSetup | undefined {
  if (typeof state !== 'object' || state === null || !('setup' in state)) return undefined;
  const setup = (state as { setup: unknown }).setup;
  if (typeof setup !== 'object' || setup === null) return undefined;
  const { settings, seed, runwayConfigs } = setup as Record<string, unknown>;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0) return undefined;
  const configs =
    typeof runwayConfigs === 'object' && runwayConfigs !== null
      ? Object.fromEntries(
          Object.entries(runwayConfigs).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {};
  return { settings: resolveSettings('session', settings).values, seed, runwayConfigs: configs };
}

export interface AirportPreview {
  icao: string;
  wind: Wind;
  runways: ActiveRunways;
  /** Every configuration with how it suits the wind, for the runway picker. */
  configs: ConfigSuitability[];
}

export interface ConfigSuitability {
  config: RunwayConfig;
  /** Largest tailwind (kts, 0 if none) and crosswind on any runway in the configuration. */
  tailwindKts: number;
  crosswindKts: number;
  withinLimits: boolean;
}

/** The wind and runways a setup will start with, computed by the engine itself. */
export function previewSetup(pack: AirspacePack, setup: SessionSetup): AirportPreview[] {
  const engine = SimEngine.create({
    performance: performanceCatalog,
    world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
    seed: setup.seed,
    startTimeUtc: new Date(0).toISOString(),
    settings: setup.settings,
    airspace: pack,
    airlines,
    runwayConfigs: setup.runwayConfigs,
  });
  const limits = {
    tailwind: setup.settings['weather.maxTailwindKts'],
    crosswind: setup.settings['weather.maxCrosswindKts'],
  };
  return pack.airspace.airports.map((icao) => {
    const wind = engine.winds[icao]!;
    const configs = pack.traffic.airports[icao]!.runwayConfigs.map((config) => {
      const components = [...config.arrivals, ...config.departures].map((runway) =>
        windComponents(wind, pack.runway(icao, runway).magneticHeadingDeg),
      );
      const tailwindKts = Math.max(0, ...components.map((c) => -c.headwindKts));
      const crosswindKts = Math.max(...components.map((c) => c.crosswindKts));
      return {
        config,
        tailwindKts,
        crosswindKts,
        withinLimits: tailwindKts <= limits.tailwind && crosswindKts <= limits.crosswind,
      };
    });
    return { icao, wind, runways: engine.activeRunways[icao]!, configs };
  });
}
