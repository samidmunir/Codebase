// STARS-style full data block formatting.
//   Line 1: callsign
//   Line 2: altitude (hundreds of ft) + trend + ground speed (tens of kts),
//           time-shared with aircraft type + destination.

/** Vertical speeds below this are shown as level. */
const LEVEL_THRESHOLD_FPM = 300;

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
}

/** The two lines of a data block. `timeShare` alternates line 2 between its two forms. */
export function dataBlockLines(target: DataBlockTarget, timeShare: 0 | 1): [string, string] {
  const line2 =
    timeShare === 0
      ? `${formatAltitude(target.altitudeFt)}${trendIndicator(target.verticalSpeedFpm)}${formatGroundSpeed(target.groundSpeedKts)}`
      : `${target.aircraftType.padEnd(4)} ${shortAirport(target.destination)}`;
  return [target.callsign, line2];
}
