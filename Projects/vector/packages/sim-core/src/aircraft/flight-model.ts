import { z } from 'zod';
import { clamp, normalizeHeading, toRadians, turnDelta } from '../math/angles';
import { destinationPoint, magneticToTrue } from '../math/geo';
import { rateAtAltitude, type AircraftPerformance } from '../performance/performance';
import { trueAirspeedKts, type AircraftState } from './aircraft';

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
  const bankLimited = (TURN_RATE_CONSTANT * Math.tan(toRadians(config.maxBankDeg))) / tasKts;
  return Math.min(config.standardTurnRateDegPerSec, bankLimited);
}

/** The speed the pilot actually flies: the assigned speed within the aircraft's limits and the regulatory limit. */
export function effectiveTargetSpeed(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  config: FlightModelConfig,
): number {
  let target = clamp(
    aircraft.targets.speedMode === 'normal'
      ? normalSpeed(aircraft, performance)
      : aircraft.targets.iasKts,
    performance.speeds.final,
    performance.speeds.max,
  );
  if (aircraft.altitudeFt < config.speedLimitBelowFt)
    target = Math.min(target, config.speedLimitKts);
  return target;
}

/** The speed a pilot flies when not assigned one: normal descent speed when descending, otherwise climb speed. */
export function normalSpeed(aircraft: AircraftState, performance: AircraftPerformance): number {
  return aircraft.targets.altitudeFt < aircraft.altitudeFt - 50
    ? performance.speeds.descent
    : performance.speeds.climb;
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
  const target = clamp(aircraft.targets.altitudeFt, 0, performance.ceilingFt);
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
  const rateFpm = Math.min(rateAtAltitude(curve, aircraft.altitudeFt), levelOffRate);
  const maxChange = (rateFpm * dtSec) / 60;

  if (Math.abs(remaining) <= maxChange) {
    aircraft.altitudeFt = target;
    aircraft.verticalSpeedFpm = 0;
    return true;
  }
  aircraft.altitudeFt += Math.sign(remaining) * maxChange;
  aircraft.verticalSpeedFpm = Math.sign(remaining) * rateFpm;
  return false;
}

function stepPosition(aircraft: AircraftState, dtSec: number, magneticVariationDeg: number): void {
  const distanceNm = (trueAirspeedKts(aircraft) * dtSec) / 3600;
  const trueCourse = magneticToTrue(aircraft.headingDeg, magneticVariationDeg);
  aircraft.position = destinationPoint(aircraft.position, trueCourse, distanceNm);
}
