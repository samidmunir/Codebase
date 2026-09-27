import { z } from 'zod';
import type { RunwayConfig } from '../airspace/schema';
import { headingDifference, toRadians } from '../math/angles';
import type { SeededRandom } from '../random/seeded-random';

export const windSchema = z.object({
  /** Direction the wind blows from, magnetic, in tens of degrees (10-360); 0 when calm. */
  directionDeg: z.number().min(0).max(360),
  speedKts: z.number().min(0),
});

export type Wind = z.infer<typeof windSchema>;

/** Winds below this are calm: runways are chosen by preference, not wind. */
export const CALM_WIND_KTS = 4;

/**
 * Typical New York surface winds: southwest flow (most common in summer),
 * northwest flow (winter), and less often northeast or southeast.
 * Weights are fractions of time; directions are magnetic.
 */
const WIND_REGIMES = [
  { weight: 0.3, fromDeg: 190, toDeg: 240 }, // southwest
  { weight: 0.28, fromDeg: 280, toDeg: 330 }, // northwest
  { weight: 0.14, fromDeg: 20, toDeg: 70 }, // northeast
  { weight: 0.1, fromDeg: 250, toDeg: 280 }, // west
  { weight: 0.1, fromDeg: 110, toDeg: 170 }, // southeast
  { weight: 0.08, fromDeg: 0, toDeg: 360 }, // anything else
];
const CALM_CHANCE = 0.05;

const roundDirection = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 10) * 10 || 360;

/** A realistic random wind for the region. */
function randomRegionalWind(random: SeededRandom): Wind {
  if (random.chance(CALM_CHANCE)) return { directionDeg: 0, speedKts: random.int(0, 3) };
  let pick = random.next();
  const regime = WIND_REGIMES.find((r) => (pick -= r.weight) < 0) ?? WIND_REGIMES[0]!;
  const gusty = random.chance(0.2) ? random.range(0, 8) : 0;
  return {
    directionDeg: roundDirection(random.range(regime.fromDeg, regime.toDeg)),
    speedKts: Math.round(4 + random.range(0, 12) + gusty),
  };
}

/**
 * Winds for each airport: one regional wind with small local differences,
 * since the airports are only a few miles apart.
 */
export function generateWinds(
  random: SeededRandom,
  airports: readonly string[],
): Record<string, Wind> {
  const regional = randomRegionalWind(random);
  const winds: Record<string, Wind> = {};
  for (const airport of airports) {
    if (regional.speedKts <= CALM_WIND_KTS) {
      winds[airport] = { ...regional };
      continue;
    }
    winds[airport] = {
      directionDeg: roundDirection(regional.directionDeg + random.int(-1, 1) * 10),
      speedKts: Math.max(0, regional.speedKts + random.int(-3, 3)),
    };
  }
  return winds;
}

/** The same manual wind at every airport. */
export function manualWinds(airports: readonly string[], wind: Wind): Record<string, Wind> {
  return Object.fromEntries(airports.map((airport) => [airport, { ...wind }]));
}

export interface WindComponents {
  /** Positive is a headwind, negative a tailwind. */
  headwindKts: number;
  crosswindKts: number;
}

export function windComponents(wind: Wind, runwayHeadingDeg: number): WindComponents {
  const angle = toRadians(headingDifference(runwayHeadingDeg, wind.directionDeg));
  return {
    headwindKts: wind.speedKts * Math.cos(angle),
    crosswindKts: Math.abs(wind.speedKts * Math.sin(angle)),
  };
}

export interface RunwayLimits {
  maxTailwindKts: number;
  maxCrosswindKts: number;
}

/**
 * The runway configuration to use for a wind: of the configurations whose
 * runways are all within the tailwind and crosswind limits, the one with the
 * most headwind. In calm wind (or a tie) the earlier, preferred configuration
 * wins. If no configuration is within limits, the one without a tailwind and
 * with the least crosswind.
 */
export function selectRunwayConfig(
  configs: readonly RunwayConfig[],
  runwayHeading: (runway: string) => number,
  wind: Wind,
  limits: RunwayLimits,
): RunwayConfig {
  const scored = configs.map((config, order) => {
    const components = [...config.arrivals, ...config.departures].map((runway) =>
      windComponents(wind, runwayHeading(runway)),
    );
    return {
      config,
      order,
      withinLimits: components.every(
        (c) => -c.headwindKts <= limits.maxTailwindKts && c.crosswindKts <= limits.maxCrosswindKts,
      ),
      // Configurations are compared by their primary arrival and departure runways; extra
      // runways in a dual configuration only need to be within limits.
      headwind: Math.min(
        windComponents(wind, runwayHeading(config.arrivals[0]!)).headwindKts,
        windComponents(wind, runwayHeading(config.departures[0]!)).headwindKts,
      ),
      crosswind: Math.max(...components.map((c) => c.crosswindKts)),
      tailwindOverLimit: components.some((c) => -c.headwindKts > limits.maxTailwindKts),
    };
  });

  const usable = scored.filter((s) => s.withinLimits);
  if (usable.length > 0) {
    if (wind.speedKts <= CALM_WIND_KTS) return usable[0]!.config;
    // Prefer more headwind; within 3 kt, prefer the earlier configuration.
    const best = Math.max(...usable.map((s) => s.headwind));
    return usable.find((s) => s.headwind >= best - 3)!.config;
  }
  // Nothing within limits: avoid tailwinds first, then take the least crosswind.
  return [...scored].sort(
    (a, b) =>
      Number(a.tailwindOverLimit) - Number(b.tailwindOverLimit) ||
      a.crosswind - b.crosswind ||
      a.order - b.order,
  )[0]!.config;
}

// ---- Wind changing over time ----------------------------------------------------

export interface WindVariation {
  /** Largest swing either side of the session's wind. */
  directionDeg: number;
  speedKts: number;
  /** About how long one swing takes, in seconds. */
  periodSec: number;
}

/** Wind variation amounts by setting. */
export const WIND_VARIATIONS = {
  off: { directionDeg: 0, speedKts: 0 },
  slight: { directionDeg: 20, speedKts: 4 },
  moderate: { directionDeg: 40, speedKts: 8 },
} as const;

/** Airports share most of the change (one weather system); this much is local. */
const LOCAL_SHARE = 0.25;

/**
 * A repeatable value in [-1, 1] for a seed, a channel and a lattice point.
 * Zero at the start, so the wind begins at its session value.
 */
function latticeValue(seed: number, channel: string, index: number): number {
  if (index === 0) return 0;
  let h = (seed ^ Math.imul(index, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < channel.length; i++) h = Math.imul(h ^ channel.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (((h ^ (h >>> 16)) >>> 0) / 4_294_967_295) * 2 - 1;
}

/** Smooth noise in [-1, 1] over time: two layers of eased value noise. */
function smoothNoise(seed: number, channel: string, t: number): number {
  const layer = (x: number, salt: string) => {
    const i = Math.floor(x);
    const eased = (1 - Math.cos(Math.PI * (x - i))) / 2;
    const a = latticeValue(seed, channel + salt, i);
    return a + (latticeValue(seed, channel + salt, i + 1) - a) * eased;
  };
  return (layer(t, 'a') + 0.5 * layer(t * 3, 'b')) / 1.5;
}

/**
 * The wind at an airport some time into the session: its starting wind,
 * drifting smoothly within the variation. Directions are reported to the
 * nearest 10° and speeds to the knot, so the reported wind changes in steps.
 * A calm wind stays calm, with a few knots of drift.
 */
export function variedWind(
  base: Wind,
  airport: string,
  seed: number,
  timeSec: number,
  variation: WindVariation,
): Wind {
  if (variation.directionDeg <= 0 && variation.speedKts <= 0) return { ...base };
  const t = timeSec / Math.max(1, variation.periodSec);
  const drift = (channel: string) =>
    (1 - LOCAL_SHARE) * smoothNoise(seed, `region:${channel}`, t) +
    LOCAL_SHARE * smoothNoise(seed, `${airport}:${channel}`, t);
  const speedKts = Math.round(base.speedKts + drift('speed') * variation.speedKts);
  if (base.directionDeg === 0)
    return { directionDeg: 0, speedKts: Math.min(3, Math.max(0, speedKts)) };
  return {
    directionDeg: roundDirection(base.directionDeg + drift('direction') * variation.directionDeg),
    speedKts: Math.max(0, speedKts),
  };
}

/** One wind for the region: the vector average of the airports' winds. */
export function regionalWind(winds: Readonly<Record<string, Wind>>): Wind | undefined {
  const list = Object.values(winds);
  if (list.length === 0) return undefined;
  let x = 0;
  let y = 0;
  for (const wind of list) {
    if (wind.directionDeg === 0) continue;
    x += wind.speedKts * Math.sin(toRadians(wind.directionDeg));
    y += wind.speedKts * Math.cos(toRadians(wind.directionDeg));
  }
  const speedKts = Math.round(Math.hypot(x, y) / list.length);
  if (speedKts <= 0 || (x === 0 && y === 0)) return { directionDeg: 0, speedKts: 0 };
  return { directionDeg: roundDirection((Math.atan2(x, y) * 180) / Math.PI), speedKts };
}
