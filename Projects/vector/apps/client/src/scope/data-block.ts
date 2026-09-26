// STARS-style full data block formatting.
//   Line 1: callsign
//   Line 2: altitude (hundreds of ft; flight levels read the same, 350 = FL350)
//           + trend + ground speed (tens of kts), time-shared with aircraft
//           type + destination.

/** Vertical speeds below this are shown as level. */
const LEVEL_THRESHOLD_FPM = 300;
/** The assigned altitude shows when the aircraft is at least this far from it. */
const ASSIGNED_ALTITUDE_SHOWN_FT = 300;

export function formatAltitude(altitudeFt: number): string {
  return String(Math.max(0, Math.round(altitudeFt / 100))).padStart(3, '0');
}

export function formatGroundSpeed(groundSpeedKts: number): string {
  return String(Math.min(99, Math.max(0, Math.round(groundSpeedKts / 10)))).padStart(2, '0');
}

export function trendIndicator(verticalSpeedFpm: number): string {
  if (verticalSpeedFpm >= LEVEL_THRESHOLD_FPM) return '↑';
  if (verticalSpeedFpm <= -LEVEL_THRESHOLD_FPM) return '↓';
  return ' ';
}

/** 'KJFK' -> 'JFK' for US airports. */
export function shortAirport(icao: string): string {
  return icao.length === 4 && icao.startsWith('K') ? icao.slice(1) : icao;
}

export interface DataBlockTarget {
  callsign: string;
  aircraftType: string;
  destination: string;
  altitudeFt: number;
  groundSpeedKts: number;
  verticalSpeedFpm: number;
  /** Cleared altitude; shown after the altitude while climbing or descending to it. */
  assignedAltitudeFt?: number | undefined;
  /** Fix or approach being flown to (not shown on a plain heading). */
  navigatingTo?: string | undefined;
}

/** Ground speed in knots, three digits: 210 -> '210', 95 -> '095'. */
export function formatGroundSpeedKnots(groundSpeedKts: number): string {
  return String(Math.min(999, Math.max(0, Math.round(groundSpeedKts)))).padStart(3, '0');
}

export type DataBlockStyle = 'expanded' | 'stars';

/** '→CAMRN' for a fix; approaches ('ILS22L') as they are. */
export function navigationLabel(navigatingTo: string | undefined): string | undefined {
  if (!navigatingTo) return undefined;
  return navigatingTo.startsWith('ILS') ? navigatingTo : `→${navigatingTo}`;
}

/**
 * The lines of a data block.
 * - 'expanded': callsign / altitude + trend + full ground speed / type + destination (+ where it's navigating to).
 * - 'stars': callsign / altitude + trend + ground speed in tens, time-shared with where it's
 *   navigating to (like the STARS scratchpad), or type + destination.
 */
export function dataBlockLines(
  target: DataBlockTarget,
  timeShare: 0 | 1,
  style: DataBlockStyle = 'stars',
): string[] {
  const altitude = `${formatAltitude(target.altitudeFt)}${trendIndicator(target.verticalSpeedFpm)}`;
  const typeAndDestination = `${target.aircraftType.padEnd(4)} ${shortAirport(target.destination)}`;
  const route = navigationLabel(target.navigatingTo);
  if (style === 'expanded') {
    // Like an ERAM data block: '180↑240' while climbing from 18,000 to FL240.
    const assigned =
      target.assignedAltitudeFt !== undefined &&
      Math.abs(target.assignedAltitudeFt - target.altitudeFt) >= ASSIGNED_ALTITUDE_SHOWN_FT
        ? formatAltitude(target.assignedAltitudeFt)
        : '';
    return [
      target.callsign,
      `${altitude}${assigned} ${formatGroundSpeedKnots(target.groundSpeedKts)}`,
      route ? `${typeAndDestination} ${route}` : typeAndDestination,
    ];
  }
  const line2 =
    timeShare === 0
      ? `${altitude}${formatGroundSpeed(target.groundSpeedKts)}`
      : (route ?? typeAndDestination);
  return [target.callsign, line2];
}
