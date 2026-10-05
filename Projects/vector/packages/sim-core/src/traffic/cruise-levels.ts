import type { SeededRandom } from '../random/seeded-random';
import { normalizeHeading } from '../math/angles';

// Requested cruising altitudes. Flights file for a level that suits the trip
// length, following the hemispheric rule: magnetic courses 000–179 fly odd
// thousands (FL230, FL350), 180–359 even thousands (FL240, FL360). Above
// FL410 the rule changes, so levels stay at or below FL410.

interface Band {
  maxTripNm: number;
  lowFt: number;
  highFt: number;
}

/** Cruise bands by trip length: short hops stay low, long hauls go high. */
const BANDS: Band[] = [
  // Short hops still file at or above the Center handoff floors (17,000 east, FL180 west).
  { maxTripNm: 150, lowFt: 17_000, highFt: 23_000 },
  { maxTripNm: 350, lowFt: 23_000, highFt: 32_000 },
  { maxTripNm: 1_000, lowFt: 30_000, highFt: 38_000 },
  { maxTripNm: Infinity, lowFt: 34_000, highFt: 41_000 },
];

/** Highest level the hemispheric rule is applied to here. */
const MAX_CRUISE_FT = 41_000;
/** Aircraft file at least this far below their certified ceiling. */
const CEILING_MARGIN_FT = 2_000;

/** Whether an altitude suits a magnetic course under the hemispheric rule. */
export function isHemisphericLevel(altitudeFt: number, magneticCourseDeg: number): boolean {
  const thousands = Math.round(altitudeFt / 1000);
  const eastbound = normalizeHeading(magneticCourseDeg) < 180;
  return thousands % 2 === (eastbound ? 1 : 0);
}

/** A realistic requested cruising altitude for a trip. */
export function requestedCruiseAltitude(
  random: SeededRandom,
  tripNm: number,
  magneticCourseDeg: number,
  ceilingFt: number,
): number {
  const band = BANDS.find((b) => tripNm <= b.maxTripNm)!;
  const top = Math.min(band.highFt, MAX_CRUISE_FT, ceilingFt - CEILING_MARGIN_FT);
  const levels: number[] = [];
  for (let altitude = band.lowFt; altitude <= top; altitude += 1_000) {
    if (isHemisphericLevel(altitude, magneticCourseDeg)) levels.push(altitude);
  }
  if (levels.length > 0) return random.pick(levels);
  // A low ceiling: the highest suitable level below it.
  let altitude = Math.floor(top / 1000) * 1000;
  while (altitude > 2_000 && !isHemisphericLevel(altitude, magneticCourseDeg)) altitude -= 1_000;
  return altitude;
}
