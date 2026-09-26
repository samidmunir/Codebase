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
function regionalWind(random: SeededRandom): Wind {
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
  const regional = regionalWind(random);
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
      headwind: Math.min(...components.map((c) => c.headwindKts)),
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
