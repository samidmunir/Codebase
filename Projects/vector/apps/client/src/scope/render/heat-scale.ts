// The heat map color scale for aircraft trails: cool blue through cyan,
// green and yellow to hot red.

export type HeatMode = 'age' | 'altitude' | 'speed';

const STOPS: [number, [number, number, number]][] = [
  [0, [59, 76, 192]],
  [0.25, [63, 167, 214]],
  [0.5, [89, 217, 142]],
  [0.75, [246, 215, 67]],
  [1, [255, 77, 61]],
];

/** In age mode, trails this old are drawn fully cool (unless a trail length sets the range). */
export const HEAT_AGE_RANGE_SEC = 20 * 60;
/** The oldest part of a limited trail fades out over this share of its length. */
export const HEAT_FADE_SHARE = 0.35;

/**
 * Opacity factor for a trail point of an age, for a trail length (0 = whole
 * path, no fade): 1 for recent points, easing to 0 at the end of the trail.
 */
export function heatFade(ageSec: number, lengthSec: number): number {
  if (lengthSec <= 0) return 1;
  const fadeStart = lengthSec * (1 - HEAT_FADE_SHARE);
  if (ageSec <= fadeStart) return 1;
  return Math.max(0, 1 - (ageSec - fadeStart) / (lengthSec - fadeStart));
}
/** Altitude and speed ranges mapped onto the scale. */
const ALTITUDE_RANGE_FT: [number, number] = [0, 40_000];
const SPEED_RANGE_KTS: [number, number] = [150, 500];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** How hot a trail point is, 0 (cool) to 1 (hot). */
export function heatValue(
  mode: HeatMode,
  point: { ageSec: number; altitudeFt: number; groundSpeedKts: number },
  ageRangeSec = HEAT_AGE_RANGE_SEC,
): number {
  switch (mode) {
    case 'age':
      return 1 - clamp01(point.ageSec / ageRangeSec);
    case 'altitude':
      return (
        1 -
        clamp01(
          (point.altitudeFt - ALTITUDE_RANGE_FT[0]) / (ALTITUDE_RANGE_FT[1] - ALTITUDE_RANGE_FT[0]),
        )
      );
    case 'speed':
      return clamp01(
        (point.groundSpeedKts - SPEED_RANGE_KTS[0]) / (SPEED_RANGE_KTS[1] - SPEED_RANGE_KTS[0]),
      );
  }
}

/** The scale's color at a value from 0 to 1, as 'rgb(r, g, b)'. */
export function heatColor(value: number): string {
  const v = clamp01(value);
  const upper = STOPS.findIndex(([at]) => at >= v);
  if (upper <= 0) return rgb(STOPS[0]![1]);
  const [a, from] = STOPS[upper - 1]!;
  const [b, to] = STOPS[upper]!;
  const t = (v - a) / (b - a);
  return rgb([0, 1, 2].map((i) => from[i]! + (to[i]! - from[i]!) * t) as [number, number, number]);
}

const rgb = ([r, g, b]: [number, number, number]) =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/** The scale as CSS gradient stops, for legends. */
export const HEAT_GRADIENT_CSS = `linear-gradient(90deg, ${STOPS.map(
  ([at, color]) => `${rgb(color)} ${at * 100}%`,
).join(', ')})`;

/** Legend labels for each mode: [cool end, hot end]. */
export const HEAT_LEGEND: Record<HeatMode, [string, string]> = {
  age: ['Oldest', 'Now'],
  altitude: ['FL400', 'Surface'],
  speed: ['150 kt', '500 kt'],
};
