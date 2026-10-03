import { z } from 'zod';
import { iasToTas, machToIas } from '../atmosphere/isa';
import { rateAtAltitude, type AircraftPerformance } from '../performance/performance';

// Flight timing: every flight the player works has a target time to land (or
// be handed off) by, from an unimpeded flight-time estimate for its route
// plus an allowance for sequencing, like the arrival times metering assigns.
// Finishing on time earns RP, finishing late costs RP, and the average
// handling time per kind of flight is kept for the RP breakdown.

export const flightKindSchema = z.enum(['arrival', 'departure', 'transit']);
export type FlightKind = z.infer<typeof flightKindSchema>;

export const flightTimerSchema = z.object({
  kind: flightKindSchema,
  /** When the flight became the player's. */
  startTick: z.number().int().min(0),
  /** When it should land (arrivals) or be handed to Center (departures, overflights). */
  targetTick: z.number().int().min(0),
});
export type FlightTimer = z.infer<typeof flightTimerSchema>;

export const timingStatsSchema = z.object({
  /** Flights finished (landed or handed off). */
  count: z.number().int().min(0),
  onTime: z.number().int().min(0),
  /** Total time taken, and total target time given, in seconds. */
  totalSec: z.number().min(0),
  totalTargetSec: z.number().min(0),
});
export type TimingStats = z.infer<typeof timingStatsSchema>;

export const emptyTimingStats = (): TimingStats => ({
  count: 0,
  onTime: 0,
  totalSec: 0,
  totalTargetSec: 0,
});

/** Flight time over a profile: `altitudeAt(nm)` gives the altitude at each distance along it. */
function profileTimeSec(
  distanceNm: number,
  altitudeAt: (nm: number) => number,
  iasAt: (altitudeFt: number, nm: number) => number,
): number {
  const STEP_NM = 0.5;
  let seconds = 0;
  for (let nm = 0; nm < distanceNm; nm += STEP_NM) {
    const step = Math.min(STEP_NM, distanceNm - nm);
    const altitude = altitudeAt(nm + step / 2);
    const tas = iasToTas(iasAt(altitude, nm + step / 2), altitude);
    seconds += (step / Math.max(100, tas)) * 3600;
  }
  return seconds;
}

/** Below this altitude aircraft are limited to 250 kt (14 CFR 91.117). */
const SPEED_LIMIT_BELOW_FT = 10_000;
/** Normal descent planning: feet lost per mile (3:1). */
const DESCENT_FT_PER_NM = 333;
/** The last miles to the runway are flown at approach speeds. */
const APPROACH_NM = 12;

/**
 * Unimpeded time for an arrival to fly `distanceNm` (route and approach) to
 * the runway from `altitudeFt`: level until a 3:1 descent, at its descent
 * speed (Mach-limited high up), 250 kt below 10,000 ft, then slowing through
 * approach speeds on the last miles.
 */
export function arrivalFlightTimeSec(
  distanceNm: number,
  altitudeFt: number,
  fieldElevationFt: number,
  performance: AircraftPerformance,
): number {
  return profileTimeSec(
    distanceNm,
    (nm) => Math.min(altitudeFt, fieldElevationFt + (distanceNm - nm) * DESCENT_FT_PER_NM),
    (altitude, nm) => {
      const toGo = distanceNm - nm;
      if (toGo < APPROACH_NM) {
        const f = toGo / APPROACH_NM;
        return (
          performance.speeds.final + f * (performance.speeds.approach - performance.speeds.final)
        );
      }
      if (altitude < SPEED_LIMIT_BELOW_FT) return Math.min(250, performance.speeds.descent);
      return Math.min(performance.speeds.descent, machToIas(performance.cruiseMach, altitude));
    },
  );
}

/**
 * Unimpeded time for a climbing flight to cover `distanceNm` from
 * `fromAltitudeFt`, climbing at its type's rate toward `cruiseFt`: the longer
 * of the time to fly the distance and the time to climb to `mustReachFt`.
 */
export function climbingFlightTimeSec(
  distanceNm: number,
  fromAltitudeFt: number,
  cruiseFt: number,
  mustReachFt: number,
  performance: AircraftPerformance,
): number {
  // Altitude reached after each mile, climbing at the type's rate at its climb speed.
  const altitudes = [fromAltitudeFt];
  const climbIas = (altitude: number) =>
    altitude < SPEED_LIMIT_BELOW_FT
      ? 250
      : Math.min(performance.speeds.climb, machToIas(performance.cruiseMach, altitude));
  let climbSec = 0;
  for (let nm = 1; nm <= Math.ceil(distanceNm) + 200; nm++) {
    const previous = altitudes[nm - 1]!;
    const secondsPerNm = 3600 / iasToTas(climbIas(previous), previous);
    const next = Math.min(
      cruiseFt,
      previous + (rateAtAltitude(performance.climbRate, previous) * secondsPerNm) / 60,
    );
    altitudes.push(next);
    if (previous < mustReachFt) climbSec += secondsPerNm;
    if (nm > distanceNm && next >= mustReachFt) break;
  }
  const flySec = profileTimeSec(
    distanceNm,
    (nm) => altitudes[Math.min(altitudes.length - 1, Math.floor(nm))]!,
    climbIas,
  );
  return Math.max(flySec, mustReachFt > fromAltitudeFt ? climbSec : 0);
}

/** Level flight at an indicated airspeed (overflights crossing at their cruise level). */
export function levelFlightTimeSec(distanceNm: number, altitudeFt: number, iasKts: number): number {
  return (distanceNm / Math.max(100, iasToTas(iasKts, altitudeFt))) * 3600;
}

export interface TimingScoreSettings {
  onTimeRp: number;
  lateRpPerMin: number;
  lateMaxRp: number;
}

/** RP for finishing a flight: the on-time bonus, or a penalty for each minute late (capped). */
export function timingRp(elapsedSec: number, targetSec: number, settings: TimingScoreSettings) {
  const lateSec = Math.max(0, elapsedSec - targetSec);
  if (lateSec === 0) return { onTime: true, lateSec, rp: settings.onTimeRp };
  return {
    onTime: false,
    lateSec,
    rp: -Math.min(settings.lateMaxRp, Math.ceil(lateSec / 60) * settings.lateRpPerMin),
  };
}

/** '4:05' for a duration in seconds. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
