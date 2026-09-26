import type { SessionSettings } from '@vector/shared';
import { trueAirspeedKts, type AircraftState, type IlsClearance } from '../aircraft/aircraft';
import { finalApproachGeometry, glidepathAltitudeFt } from '../aircraft/navigation';
import { headingDifference, toDegrees, toRadians } from '../math/angles';
import type { AircraftPerformance } from '../performance/performance';

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
/** Tolerance above the glidepath (the glideslope is intercepted from below). */
const ABOVE_GLIDEPATH_FT = 300;

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

  if (geometry.alongTrackNm < minDistance)
    return reject('distance', 'too close to the runway for the approach');
  if (geometry.alongTrackNm > maxDistance)
    return reject('distance', 'too far out for the approach');

  const offsetDeg = toDegrees(Math.atan2(Math.abs(geometry.crossTrackNm), geometry.alongTrackNm));
  const coverage = geometry.alongTrackNm <= COVERAGE_NEAR_NM ? COVERAGE_NEAR_DEG : COVERAGE_FAR_DEG;
  if (offsetDeg > coverage) return reject('position', 'not in position for the localizer');

  // The heading the pilot will fly to intercept: the assigned heading when on vectors.
  const heading =
    aircraft.navigation.mode === 'heading' ? aircraft.targets.headingDeg : aircraft.headingDeg;
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

  if (
    aircraft.altitudeFt >
    glidepathAltitudeFt(clearance, geometry.alongTrackNm) + ABOVE_GLIDEPATH_FT
  ) {
    return reject('tooHigh', 'too high for the approach');
  }
  const mva = context.minimumVectoringAltitudeFt;
  if (mva !== undefined && aircraft.altitudeFt < mva - 50) {
    return reject('belowMva', 'below the minimum vectoring altitude');
  }

  // Time to slow to final approach speed before the stabilized-approach gate.
  const gateNm = distanceForHeightNm(clearance, settings['approaches.stabilizedGateFt']);
  const availableSec =
    ((geometry.alongTrackNm - gateNm) / Math.max(1, trueAirspeedKts(aircraft))) * 3600;
  const neededSec =
    Math.max(0, aircraft.iasKts - performance.speeds.final) / performance.decelerationKtPerSec;
  if (neededSec * 1.2 > availableSec) return reject('tooFast', 'unable to slow down in time');

  return { ok: true };
}
