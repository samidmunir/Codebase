import { groundSpeedKts, type AircraftState } from '../aircraft/aircraft';
import type { AirspacePack } from '../airspace/airspace-pack';
import { headingDifference, toRadians } from '../math/angles';
import { bearingTrue, distanceNm, magneticToTrue, type LatLon } from '../math/geo';

// The computer Center controller. Traffic the player hands to Center is
// flown on: climbed or descended to its requested cruise level, routed along
// its flight plan and on toward its destination, and kept apart from other
// Center traffic with level changes.

/** Where Center sends an aircraft next: a fix still ahead in its flight plan, else its destination. */
export function centerRouteTarget(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
): { fix: string; position: LatLon } | undefined {
  const course = magneticToTrue(aircraft.headingDeg, pack.airspace.magneticVariationDeg);
  for (const ident of aircraft.flightPlan.route) {
    const fix = pack.fix(ident);
    if (!fix) continue;
    const distance = distanceNm(aircraft.position, fix.position);
    const offCourse = Math.abs(
      headingDifference(course, bearingTrue(aircraft.position, fix.position)),
    );
    // Ahead, and not one it has just passed (behind, or close and off to the side).
    if (distance > MIN_ROUTE_FIX_NM && offCourse < MAX_ROUTE_FIX_OFF_COURSE_DEG) {
      return { fix: fix.ident, position: fix.position };
    }
  }
  const destination = pack.traffic.cityPositions[aircraft.flightPlan.destination];
  return destination ? { fix: aircraft.flightPlan.destination, position: destination } : undefined;
}

/** Route fixes closer than this are treated as passed. */
const MIN_ROUTE_FIX_NM = 3;
/** Route fixes more than this far off the aircraft's course are behind it. */
const MAX_ROUTE_FIX_OFF_COURSE_DEG = 100;

export interface CenterConflict {
  /** The aircraft that should change level. */
  movingId: string;
  /** The aircraft it must stay clear of. */
  otherId: string;
  /** The level the moving aircraft should fly until the conflict is past. */
  resolutionAltitudeFt: number;
}

export interface CenterSeparation {
  lateralNm: number;
  verticalFt: number;
  lookaheadSec: number;
  magneticVariationDeg: number;
}

/** Prediction step through the look-ahead window. */
const STEP_SEC = 10;
const NM_PER_DEG_LAT = 60;

interface Motion {
  aircraft: Readonly<AircraftState>;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function motion(
  aircraft: Readonly<AircraftState>,
  referenceLat: number,
  variation: number,
): Motion {
  const kx = NM_PER_DEG_LAT * Math.cos(toRadians(referenceLat));
  const speed = groundSpeedKts(aircraft) / 3600;
  const course = toRadians(magneticToTrue(aircraft.headingDeg, variation));
  return {
    aircraft,
    x: aircraft.position.lon * kx,
    y: aircraft.position.lat * NM_PER_DEG_LAT,
    vx: speed * Math.sin(course),
    vy: speed * Math.cos(course),
  };
}

/** Rate assumed for a level change that is assigned but hasn't started yet. */
const ASSUMED_RATE_FPM = 2_000;

/** Altitude after `t` seconds, climbing or descending toward the target and stopping there. */
function altitudeAt(aircraft: Readonly<AircraftState>, t: number): number {
  const toTarget = aircraft.targets.altitudeFt - aircraft.altitudeFt;
  const rateFpm =
    aircraft.verticalSpeedFpm !== 0 || Math.abs(toTarget) < 100
      ? aircraft.verticalSpeedFpm
      : Math.sign(toTarget) * ASSUMED_RATE_FPM;
  const change = (rateFpm / 60) * t;
  const target = aircraft.targets.altitudeFt;
  const next = aircraft.altitudeFt + change;
  if (change > 0) return Math.min(next, Math.max(target, aircraft.altitudeFt));
  if (change < 0) return Math.max(next, Math.min(target, aircraft.altitudeFt));
  return aircraft.altitudeFt;
}

/** Whether two aircraft are predicted to lose separation within the look-ahead window. */
export function predictedConflict(
  a: Readonly<AircraftState>,
  b: Readonly<AircraftState>,
  separation: CenterSeparation,
): boolean {
  const referenceLat = (a.position.lat + b.position.lat) / 2;
  const ma = motion(a, referenceLat, separation.magneticVariationDeg);
  const mb = motion(b, referenceLat, separation.magneticVariationDeg);
  for (let t = 0; t <= separation.lookaheadSec; t += STEP_SEC) {
    const lateral = Math.hypot(
      ma.x + ma.vx * t - (mb.x + mb.vx * t),
      ma.y + ma.vy * t - (mb.y + mb.vy * t),
    );
    const vertical = Math.abs(altitudeAt(a, t) - altitudeAt(b, t));
    if (lateral < separation.lateralNm && vertical < separation.verticalFt) return true;
  }
  return false;
}

/**
 * How Center resolves a conflict. The aircraft still changing level (or, if
 * both are level, the second of the pair) moves: it levels 1,000 ft below the
 * other's level if it is below it, or 1,000 ft above if it is above. Two level
 * aircraft: the moving one steps 2,000 ft down, or up if that is too low.
 */
export function resolveConflict(
  a: Readonly<AircraftState>,
  b: Readonly<AircraftState>,
  separation: CenterSeparation,
  minimumAltitudeFt: number,
): CenterConflict {
  const changing = (x: Readonly<AircraftState>) =>
    Math.abs(x.targets.altitudeFt - x.altitudeFt) > 100;
  const [moving, other] = changing(a) && !changing(b) ? [a, b] : [b, a];
  const step = separation.verticalFt;
  const otherLevel = Math.round(other.altitudeFt / 1000) * 1000;
  let resolution: number;
  if (changing(moving)) {
    resolution = moving.altitudeFt <= other.altitudeFt ? otherLevel - step : otherLevel + step;
  } else {
    const level = Math.round(moving.altitudeFt / 1000) * 1000;
    resolution = level - 2 * step >= minimumAltitudeFt ? level - 2 * step : level + 2 * step;
  }
  return {
    movingId: moving.id,
    otherId: other.id,
    resolutionAltitudeFt: Math.max(minimumAltitudeFt, resolution),
  };
}
