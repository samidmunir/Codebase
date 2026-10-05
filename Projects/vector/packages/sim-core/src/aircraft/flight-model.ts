import { machToIas } from '../atmosphere/isa';
import { z } from 'zod';
import { clamp, normalizeHeading, toRadians, turnDelta } from '../math/angles';
import { destinationPoint, magneticToTrue } from '../math/geo';
import { rateAtAltitude, type AircraftPerformance } from '../performance/performance';
import { trueAirspeedKts, type AircraftState } from './aircraft';
import * as dmath from '../math/dmath';

export const flightModelConfigSchema = z.object({
  /** Standard-rate turn, degrees per second. */
  standardTurnRateDegPerSec: z.number().positive(),
  /** Maximum bank angle. Limits the turn rate at higher speeds. */
  maxBankDeg: z.number().positive().max(45),
  /** Regulatory speed limit applies below this altitude (14 CFR 91.117). */
  speedLimitBelowFt: z.number().min(0),
  speedLimitKts: z.number().positive(),
  /** Level-off: vertical rate is at most |altitude remaining| x this factor (fpm per ft)... */
  levelOffRateFactor: z.number().positive(),
  /** ...but never below this rate, so the aircraft actually reaches its altitude. */
  levelOffMinRateFpm: z.number().positive(),
});

export type FlightModelConfig = z.infer<typeof flightModelConfigSchema>;

export const DEFAULT_FLIGHT_MODEL_CONFIG: FlightModelConfig = {
  standardTurnRateDegPerSec: 3,
  maxBankDeg: 25,
  speedLimitBelowFt: 10_000,
  speedLimitKts: 250,
  levelOffRateFactor: 2.5,
  levelOffMinRateFpm: 1_000,
};

/** Descending pilots plan to be at the speed limit this far above the limit altitude. */
const SPEED_LIMIT_MARGIN_FT = 500;

/** Converts bank angle and true airspeed (kts) to turn rate in degrees per second. */
const TURN_RATE_CONSTANT = ((9.80665 / 0.514444) * 180) / Math.PI;

export interface FlightStepResult {
  reachedAltitude: boolean;
  reachedHeading: boolean;
  reachedSpeed: boolean;
}

/** Turn rate for a true airspeed: standard rate, reduced when that would exceed the max bank angle. */
export function turnRateDegPerSec(tasKts: number, config: FlightModelConfig): number {
  if (tasKts <= 0) return config.standardTurnRateDegPerSec;
  const bankLimited = (TURN_RATE_CONSTANT * dmath.tan(toRadians(config.maxBankDeg))) / tasKts;
  return Math.min(config.standardTurnRateDegPerSec, bankLimited);
}

/** The speed the pilot actually flies: the assigned speed within the aircraft's limits and the regulatory limit. */
export function effectiveTargetSpeed(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  config: FlightModelConfig,
): number {
  const navigation = aircraft.navigation;
  // A published speed limit on the procedure applies unless ATC has assigned a speed.
  const published =
    aircraft.targets.speedMode === 'normal' && navigation.mode === 'procedure'
      ? navigation.speedLimitKts
      : undefined;
  // Holding speed is a maximum whatever the speed mode.
  const holding = navigation.mode === 'hold' ? navigation.speedLimitKts : undefined;
  let target = clamp(
    aircraft.targets.speedMode === 'normal'
      ? Math.min(normalSpeed(aircraft, performance), published ?? Infinity)
      : aircraft.targets.iasKts,
    performance.speeds.final,
    performance.speeds.max,
  );
  const limit = config.speedLimitKts;
  if (holding !== undefined) target = Math.min(target, Math.max(performance.speeds.final, holding));
  if (aircraft.altitudeFt < config.speedLimitBelowFt) target = Math.min(target, limit);
  else if (target > limit && aircraft.targets.altitudeFt < config.speedLimitBelowFt) {
    // Cleared below the limit altitude: slow down in time to cross it at the limit, at the
    // rate it is descending (or will, if held level for now by a procedure restriction).
    const descentFpm = Math.max(
      -aircraft.verticalSpeedFpm,
      rateAtAltitude(performance.descentRate, aircraft.altitudeFt),
    );
    const secondsToSlow = Math.max(0, aircraft.iasKts - limit) / performance.decelerationKtPerSec;
    const heightToSlow = (secondsToSlow * descentFpm) / 60 + SPEED_LIMIT_MARGIN_FT;
    if (aircraft.altitudeFt - config.speedLimitBelowFt <= heightToSlow)
      target = Math.min(target, limit);
  }
  return target;
}

/**
 * The speed a pilot flies when not assigned one: normal descent speed when
 * descending, otherwise climb speed. High up, the cruise Mach number limits
 * it (the indicated airspeed for a Mach number falls with altitude).
 */
export function normalSpeed(aircraft: AircraftState, performance: AircraftPerformance): number {
  const scheduled =
    aircraft.targets.altitudeFt < aircraft.altitudeFt - 50
      ? performance.speeds.descent
      : performance.speeds.climb;
  return Math.min(scheduled, Math.round(machToIas(performance.cruiseMach, aircraft.altitudeFt)));
}

/**
 * Advances one aircraft by `dtSec` seconds. Mutates `aircraft` in place.
 * Heading, speed and altitude update first, then the aircraft moves using the new values.
 */
export function stepAircraft(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  dtSec: number,
  magneticVariationDeg: number,
  config: FlightModelConfig,
): FlightStepResult {
  const reachedHeading = stepHeading(aircraft, dtSec, config);
  const reachedSpeed = stepSpeed(aircraft, performance, dtSec, config);
  const reachedAltitude = stepAltitude(aircraft, performance, dtSec, config);
  stepPosition(aircraft, dtSec, magneticVariationDeg);
  return { reachedAltitude, reachedHeading, reachedSpeed };
}

function stepHeading(aircraft: AircraftState, dtSec: number, config: FlightModelConfig): boolean {
  const { targets } = aircraft;
  const remaining = turnDelta(aircraft.headingDeg, targets.headingDeg, targets.turnDirection);
  if (remaining === 0) return false;

  const maxTurn = turnRateDegPerSec(trueAirspeedKts(aircraft), config) * dtSec;
  if (Math.abs(remaining) <= maxTurn) {
    aircraft.headingDeg = targets.headingDeg;
    targets.turnDirection = 'shortest';
    return true;
  }
  aircraft.headingDeg = normalizeHeading(aircraft.headingDeg + Math.sign(remaining) * maxTurn);
  return false;
}

function stepSpeed(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  dtSec: number,
  config: FlightModelConfig,
): boolean {
  const target = effectiveTargetSpeed(aircraft, performance, config);
  const remaining = target - aircraft.iasKts;
  if (remaining === 0) return false;

  const rate = remaining > 0 ? performance.accelerationKtPerSec : performance.decelerationKtPerSec;
  const maxChange = rate * dtSec;
  if (Math.abs(remaining) <= maxChange) {
    aircraft.iasKts = target;
    return true;
  }
  aircraft.iasKts += Math.sign(remaining) * maxChange;
  return false;
}

function stepAltitude(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  dtSec: number,
  config: FlightModelConfig,
): boolean {
  // Descending via a procedure, the planned descent sets the altitude to be at now.
  const navigation = aircraft.navigation;
  const cleared =
    navigation.mode === 'procedure' && navigation.vnavAltitudeFt !== undefined
      ? navigation.vnavAltitudeFt
      : aircraft.targets.altitudeFt;
  const target = clamp(cleared, 0, performance.ceilingFt);
  const remaining = target - aircraft.altitudeFt;
  if (remaining === 0) {
    aircraft.verticalSpeedFpm = 0;
    return false;
  }

  const curve = remaining > 0 ? performance.climbRate : performance.descentRate;
  const levelOffRate = Math.max(
    config.levelOffMinRateFpm,
    Math.abs(remaining) * config.levelOffRateFactor,
  );
  let rateFpm = Math.min(rateAtAltitude(curve, aircraft.altitudeFt), levelOffRate);
  // Still too fast to go below the speed-limit altitude: descend only as fast as it can
  // slow down, holding at that altitude if need be, as pilots do (14 CFR 91.117).
  const aboveLimitFt = aircraft.altitudeFt - config.speedLimitBelowFt;
  const excessKts = aircraft.iasKts - config.speedLimitKts;
  if (remaining < 0 && aboveLimitFt >= 0 && target < config.speedLimitBelowFt && excessKts > 1) {
    const secondsToSlow = excessKts / performance.decelerationKtPerSec;
    rateFpm = Math.min(rateFpm, (aboveLimitFt / secondsToSlow) * 60);
  }
  const maxChange = (rateFpm * dtSec) / 60;

  if (Math.abs(remaining) <= maxChange) {
    aircraft.altitudeFt = target;
    aircraft.verticalSpeedFpm = 0;
    return true;
  }
  aircraft.altitudeFt += Math.sign(remaining) * maxChange;
  aircraft.verticalSpeedFpm = maxChange > 0 ? Math.sign(remaining) * rateFpm : 0;
  return false;
}

function stepPosition(aircraft: AircraftState, dtSec: number, magneticVariationDeg: number): void {
  const distanceNm = (trueAirspeedKts(aircraft) * dtSec) / 3600;
  const trueCourse = magneticToTrue(aircraft.headingDeg, magneticVariationDeg);
  aircraft.position = destinationPoint(aircraft.position, trueCourse, distanceNm);
}
