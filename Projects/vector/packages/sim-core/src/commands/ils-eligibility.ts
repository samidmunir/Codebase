import type { SessionSettings } from '@vector/shared';
import { trueAirspeedKts, type AircraftState, type IlsClearance } from '../aircraft/aircraft';
import { finalApproachGeometry, glidepathAltitudeFt } from '../aircraft/navigation';
import { DEFAULT_FLIGHT_MODEL_CONFIG, turnRateDegPerSec } from '../aircraft/flight-model';
import { clamp, headingDifference, toDegrees, toRadians } from '../math/angles';
import { rateAtAltitude, type AircraftPerformance } from '../performance/performance';

// Whether a pilot can accept an ILS clearance from where the aircraft is. A
// pilot who can't replies "unable" with the reason.

export type IlsProblem =
  | 'distance'
  | 'position'
  | 'interceptAngle'
  | 'notIntercepting'
  | 'tooHigh'
  | 'belowMva'
  | 'tooFast';

export type IlsEligibility = { ok: true } | { ok: false; problem: IlsProblem; reason: string };

export interface IlsEligibilityContext {
  performance: AircraftPerformance;
  settings: Readonly<SessionSettings>;
  magneticVariationDeg: number;
  /** Minimum vectoring altitude at the aircraft's position, if known. */
  minimumVectoringAltitudeFt: number | undefined;
}

const FEET_PER_NM = 6076.12;
/**
 * Localizer coverage used for accepting an approach: ±35° out to 18 NM, ±10° beyond. (The
 * FAA standard service volume is ±35° to 10 NM and ±10° to 18 NM; most localizers are
 * usable wider, and pilots accept clearances they will intercept inside coverage.)
 */
const COVERAGE_NEAR_NM = 18;
const COVERAGE_NEAR_DEG = 35;
const COVERAGE_FAR_DEG = 10;
/** Already established: close enough to the centerline on a heading near the course. */
const ON_COURSE_NM = 0.2;
const ON_COURSE_DEG = 10;
/** Height above the glidepath a pilot always accepts at the localizer join point. */
const ABOVE_GLIDEPATH_FT = 300;
/**
 * The most height a pilot gains on the glidepath per NM when capturing it from above
 * (the actual figure comes from the type's descent rate and speed), and the distance
 * they want to be established before the stabilized-approach gate.
 */
const MAX_FROM_ABOVE_FT_PER_NM = 300;
const ESTABLISHED_BEFORE_GATE_NM = 1;
/** Intercepts shallower than this are treated as flying along the localizer. */
const MIN_INTERCEPT_DEG = 3;

/** Distance from the threshold at which the glidepath reaches a height above the runway. */
export function distanceForHeightNm(clearance: IlsClearance, heightFt: number): number {
  return (
    Math.max(0, heightFt - clearance.thresholdCrossingHeightFt) /
    (FEET_PER_NM * Math.tan(toRadians(clearance.glideslopeDeg)))
  );
}

export function ilsEligibility(
  aircraft: Readonly<AircraftState>,
  clearance: IlsClearance,
  context: IlsEligibilityContext,
): IlsEligibility {
  const reject = (problem: IlsProblem, reason: string): IlsEligibility => ({
    ok: false,
    problem,
    reason,
  });
  const { settings, performance } = context;
  const geometry = finalApproachGeometry(
    aircraft.position,
    clearance,
    context.magneticVariationDeg,
  );
  const [minDistance, maxDistance] = settings['approaches.interceptDistanceNm'];

  // Beyond the runway (the wrong side of the airport) is a position problem, not distance.
  if (geometry.alongTrackNm <= 0) return reject('position', 'not in position for the localizer');
  if (geometry.alongTrackNm < minDistance)
    return reject('distance', 'too close to the runway for the approach');
  if (geometry.alongTrackNm > maxDistance)
    return reject('distance', 'too far out for the approach');

  const offsetDeg = toDegrees(Math.atan2(Math.abs(geometry.crossTrackNm), geometry.alongTrackNm));
  const coverage = geometry.alongTrackNm <= COVERAGE_NEAR_NM ? COVERAGE_NEAR_DEG : COVERAGE_FAR_DEG;
  if (offsetDeg > coverage) return reject('position', 'not in position for the localizer');

  // The heading the pilot will fly to intercept: the one being steered to (the assigned
  // heading on vectors, or where the procedure, direct-to or hold was turning), which is
  // what the aircraft keeps flying once cleared.
  const heading = aircraft.targets.headingDeg;
  const interceptAngle = headingDifference(heading, clearance.courseDeg);
  const onCourse =
    Math.abs(geometry.crossTrackNm) <= ON_COURSE_NM && Math.abs(interceptAngle) <= ON_COURSE_DEG;
  if (!onCourse) {
    if (Math.abs(interceptAngle) > settings['approaches.maxInterceptAngleDeg']) {
      return reject('interceptAngle', 'intercept angle too steep');
    }
    // Right of course needs a heading left of the course (and vice versa) to converge.
    if (Math.sign(interceptAngle) !== Math.sign(geometry.crossTrackNm)) {
      return reject('notIntercepting', 'heading does not intercept the localizer');
    }
  }

  // Where the aircraft will join the localizer on its heading: pilots judge the
  // approach from there, not from where they are now.
  // Still turning to that heading: the turn itself carries it on toward the runway first.
  const tas = Math.max(1, trueAirspeedKts(aircraft));
  const turnNm =
    ((Math.abs(headingDifference(aircraft.headingDeg, heading)) /
      turnRateDegPerSec(tas, DEFAULT_FLIGHT_MODEL_CONFIG)) *
      tas) /
    3600;
  const joinNm =
    (onCourse
      ? geometry.alongTrackNm
      : geometry.alongTrackNm -
        Math.abs(geometry.crossTrackNm) /
          Math.tan(toRadians(Math.max(MIN_INTERCEPT_DEG, Math.abs(interceptAngle))))) - turnNm;
  if (joinNm < minDistance) {
    return reject('distance', 'would join the localizer too close to the runway');
  }

  // Above the glidepath at the join point, it must be able to get down to it before the gate.
  const gateNm = distanceForHeightNm(clearance, settings['approaches.stabilizedGateFt']);
  // Told to climb, it will be higher by the join: judge from the higher of the two.
  const altitudeFt = Math.max(aircraft.altitudeFt, aircraft.targets.altitudeFt);
  const excessFt = altitudeFt - glidepathAltitudeFt(clearance, joinNm);
  // How much faster than the glidepath it can come down: its descent rate over its ground
  // speed, less the glidepath's own gradient (little at high speed, more when slow).
  const descentFtPerNm = (rateAtAltitude(performance.descentRate, aircraft.altitudeFt) * 60) / tas;
  const glidepathFtPerNm = FEET_PER_NM * Math.tan(toRadians(clearance.glideslopeDeg));
  const spareFtPerNm = clamp(descentFtPerNm - glidepathFtPerNm, 0, MAX_FROM_ABOVE_FT_PER_NM);
  const allowedFt = Math.max(
    ABOVE_GLIDEPATH_FT,
    (joinNm - gateNm - ESTABLISHED_BEFORE_GATE_NM) * spareFtPerNm,
  );
  if (excessFt > allowedFt) return reject('tooHigh', 'too high for the approach');
  const mva = context.minimumVectoringAltitudeFt;
  if (mva !== undefined && aircraft.altitudeFt < mva - 50) {
    return reject('belowMva', 'below the minimum vectoring altitude');
  }

  // Time to slow to final approach speed before the stabilized-approach gate (pilots slow
  // down once they are on the localizer).
  const availableSec = ((joinNm - gateNm) / Math.max(1, trueAirspeedKts(aircraft))) * 3600;
  const neededSec =
    Math.max(0, aircraft.iasKts - performance.speeds.final) / performance.decelerationKtPerSec;
  if (neededSec > availableSec) return reject('tooFast', 'unable to slow down in time');

  return { ok: true };
}
