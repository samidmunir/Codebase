import { clamp, headingDifference, normalizeHeading, toRadians } from '../math/angles';
import { bearingTrue, distanceNm, magneticToTrue, trueToMagnetic, type LatLon } from '../math/geo';
import type { AircraftPerformance } from '../performance/performance';
import {
  trueAirspeedKts,
  type AircraftState,
  type IlsClearance,
  type ResolvedLeg,
} from './aircraft';
import { turnRateDegPerSec, type FlightModelConfig } from './flight-model';

// Lateral and vertical guidance: flying direct to a fix and flying an ILS.
// updateNavigation() runs before the flight model moves the aircraft (it sets
// the targets), and followGlideslope() runs after (it holds the glidepath).

const FEET_PER_NM = 6076.12;
/** Direct-to: the fix counts as passed within this distance. */
const FIX_PASSED_NM = 0.5;
/** Pointing within this of a fix counts as flying toward it. */
const INBOUND_BEARING_DEG = 45;
/** Flying on from a fix too close to turn onto, until this much beyond a turn's width. */
const EXTEND_MARGIN_NM = 1;
/** Localizer tracking: heading correction per NM off centerline, and its limit. */
const LOCALIZER_GAIN_DEG_PER_NM = 40;
const LOCALIZER_MAX_CORRECTION_DEG = 30;
/** Localizer capture is possible within this distance of the threshold. */
const LOCALIZER_RANGE_NM = 30;
/**
 * Glideslope capture window around the glidepath. From below, the glidepath
 * comes down to meet the aircraft; from above, the pilot descends to meet it
 * (capturing from above), so capture is always close to the glidepath.
 */
const GLIDESLOPE_BELOW_FT = 20;
const GLIDESLOPE_ABOVE_FT = 60;
/** Extra distance pilots allow to be at final approach speed before the stabilized-approach gate. */
const FINAL_SPEED_MARGIN_NM = 1;

export interface NavigationEvents {
  fixPassed?: string;
  /** The aircraft finished its procedure (and continues on its last heading). */
  procedureCompleted?: string;
  localizerCaptured?: boolean;
  glideslopeCaptured?: boolean;
}

/** Where an aircraft is relative to a runway's final approach course. */
export interface FinalApproachGeometry {
  /** Distance from the threshold along the extended centerline (positive on the approach side). */
  alongTrackNm: number;
  /** Distance off the centerline, positive when right of course (as the pilot sees it). */
  crossTrackNm: number;
  /** Final approach course, true. */
  courseTrueDeg: number;
}

export function finalApproachGeometry(
  position: LatLon,
  clearance: IlsClearance,
  magneticVariationDeg: number,
): FinalApproachGeometry {
  const courseTrueDeg = magneticToTrue(clearance.courseDeg, magneticVariationDeg);
  const outbound = normalizeHeading(courseTrueDeg + 180);
  const distance = distanceNm(clearance.threshold, position);
  const offset = toRadians(headingDifference(outbound, bearingTrue(clearance.threshold, position)));
  return {
    alongTrackNm: distance * Math.cos(offset),
    // Clockwise of outbound is left of course for an inbound pilot.
    crossTrackNm: -distance * Math.sin(offset),
    courseTrueDeg,
  };
}

/** Glidepath altitude at a distance from the threshold. */
export function glidepathAltitudeFt(clearance: IlsClearance, alongTrackNm: number): number {
  return (
    clearance.thresholdElevationFt +
    clearance.thresholdCrossingHeightFt +
    Math.max(0, alongTrackNm) * FEET_PER_NM * Math.tan(toRadians(clearance.glideslopeDeg))
  );
}

/**
 * Flies toward a fix, updating the navigation's `inbound` and `extending`
 * state, and says whether the fix is passed: overhead, or (like an FMS
 * sequencing a fix) left abeam or behind within a turn's reach after flying
 * toward it. A fix inside the circle the aircraft would turn on can't be
 * reached by turning, so the pilot flies on until there is room to turn back
 * (without this, a fast aircraft would circle the fix forever).
 */
function flyToFix(
  aircraft: AircraftState,
  state: { inbound?: boolean | undefined; extending?: boolean | undefined },
  fix: LatLon,
  magneticVariationDeg: number,
  config: FlightModelConfig,
): boolean {
  const distance = distanceNm(aircraft.position, fix);
  const bearingDeg = trueToMagnetic(bearingTrue(aircraft.position, fix), magneticVariationDeg);
  const offBearing = Math.abs(headingDifference(aircraft.headingDeg, bearingDeg));
  const tas = trueAirspeedKts(aircraft);
  const turnRadiusNm = tas / 3600 / toRadians(turnRateDegPerSec(tas, config));
  if (distance <= FIX_PASSED_NM) return true;
  if (state.inbound && offBearing >= 90 && distance <= 2 * turnRadiusNm + FIX_PASSED_NM)
    return true;
  if (offBearing <= INBOUND_BEARING_DEG) state.inbound = true;

  // The fix in the aircraft's frame (across toward it, ahead), from the center of the turn.
  const across = distance * Math.sin(toRadians(offBearing));
  const ahead = distance * Math.cos(toRadians(offBearing));
  if (Math.hypot(across - turnRadiusNm, ahead) < turnRadiusNm) state.extending = true;
  else if (state.extending && distance >= 2 * turnRadiusNm + EXTEND_MARGIN_NM)
    delete state.extending;
  aircraft.targets.headingDeg = state.extending ? aircraft.headingDeg : bearingDeg;
  return false;
}

/** Sets the aircraft's targets from its navigation mode. Mutates `aircraft`. */
export function updateNavigation(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  magneticVariationDeg: number,
  config: FlightModelConfig,
  /** Height of the stabilized-approach gate; established pilots plan to be slowed by then. */
  stabilizedGateFt = 1_000,
): NavigationEvents {
  const navigation = aircraft.navigation;

  if (navigation.mode === 'direct') {
    if (flyToFix(aircraft, navigation, navigation.position, magneticVariationDeg, config)) {
      aircraft.navigation = { mode: 'heading' };
      return { fixPassed: navigation.fix };
    }
    aircraft.targets.turnDirection = 'shortest';
    return {};
  }

  if (navigation.mode === 'procedure') return flyProcedure(aircraft, magneticVariationDeg, config);
  if (navigation.mode !== 'approach') return {};

  const events: NavigationEvents = {};
  const { clearance } = navigation;
  const geometry = finalApproachGeometry(aircraft.position, clearance, magneticVariationDeg);
  const onApproachSide = geometry.alongTrackNm > 0 && geometry.alongTrackNm <= LOCALIZER_RANGE_NM;

  if (!navigation.localizerCaptured) {
    const headingTrue = magneticToTrue(aircraft.headingDeg, magneticVariationDeg);
    const interceptAngle = headingDifference(headingTrue, geometry.courseTrueDeg);
    // Heading toward the centerline (or already on it), within 90° of the course.
    const closing =
      Math.abs(geometry.crossTrackNm) < 0.05 ||
      Math.sign(interceptAngle) === Math.sign(geometry.crossTrackNm);
    // Start the turn early enough to roll out on the centerline.
    const turnRadiusNm =
      trueAirspeedKts(aircraft) /
      3600 /
      toRadians(turnRateDegPerSec(trueAirspeedKts(aircraft), config));
    const lead = turnRadiusNm * (1 - Math.cos(toRadians(interceptAngle))) + 0.05;
    if (
      onApproachSide &&
      Math.abs(interceptAngle) < 90 &&
      closing &&
      Math.abs(geometry.crossTrackNm) <= lead
    ) {
      navigation.localizerCaptured = true;
      events.localizerCaptured = true;
    }
  }

  if (navigation.localizerCaptured) {
    const correction = clamp(
      -geometry.crossTrackNm * LOCALIZER_GAIN_DEG_PER_NM,
      -LOCALIZER_MAX_CORRECTION_DEG,
      LOCALIZER_MAX_CORRECTION_DEG,
    );
    aircraft.targets.headingDeg = trueToMagnetic(
      geometry.courseTrueDeg + correction,
      magneticVariationDeg,
    );
    aircraft.targets.turnDirection = 'shortest';

    const glidepath = glidepathAltitudeFt(clearance, geometry.alongTrackNm);
    if (
      !navigation.glideslopeCaptured &&
      aircraft.altitudeFt >= glidepath - GLIDESLOPE_BELOW_FT &&
      aircraft.altitudeFt <= glidepath + GLIDESLOPE_ABOVE_FT
    ) {
      navigation.glideslopeCaptured = true;
      events.glideslopeCaptured = true;
    } else if (!navigation.glideslopeCaptured && aircraft.altitudeFt > glidepath) {
      // Above the glideslope on the localizer (a late or shallow intercept): descend at a
      // normal descent rate, well above the glidepath's, to capture it from above. Aiming
      // at the field keeps the flight model from easing off; capture stops the descent.
      aircraft.targets.altitudeFt = clearance.thresholdElevationFt;
    }
  }

  if (navigation.localizerCaptured) {
    // Pilots slow down on their own once on the localizer: to approach speed, then to
    // final approach speed early enough to be stable at the gate.
    const gateNm =
      Math.max(0, stabilizedGateFt - clearance.thresholdCrossingHeightFt) /
      (FEET_PER_NM * Math.tan(toRadians(clearance.glideslopeDeg)));
    const slowingNm =
      (Math.max(0, aircraft.iasKts - performance.speeds.final) / performance.decelerationKtPerSec) *
      (trueAirspeedKts(aircraft) / 3600);
    const approachSpeed =
      geometry.alongTrackNm <= gateNm + slowingNm + FINAL_SPEED_MARGIN_NM
        ? performance.speeds.final
        : performance.speeds.approach;
    if (aircraft.targets.speedMode === 'normal' || aircraft.targets.iasKts > approachSpeed) {
      aircraft.targets.speedMode = 'assigned';
      aircraft.targets.iasKts = approachSpeed;
    }
  }

  if (navigation.glideslopeCaptured) {
    // The glidepath is flown in followGlideslope(); keep the flight model from changing altitude.
    aircraft.targets.altitudeFt = aircraft.altitudeFt;
  }
  return events;
}

/**
 * Holds an aircraft established on the glideslope on the glidepath, after the
 * flight model has moved it. Returns true when it has landed. Mutates `aircraft`.
 */
export function followGlideslope(
  aircraft: AircraftState,
  magneticVariationDeg: number,
  dtSec: number,
): boolean {
  const navigation = aircraft.navigation;
  if (navigation.mode !== 'approach' || !navigation.glideslopeCaptured) return false;

  const { clearance } = navigation;
  const { alongTrackNm } = finalApproachGeometry(
    aircraft.position,
    clearance,
    magneticVariationDeg,
  );
  const altitude = glidepathAltitudeFt(clearance, alongTrackNm);
  aircraft.verticalSpeedFpm = dtSec > 0 ? ((altitude - aircraft.altitudeFt) / dtSec) * 60 : 0;
  aircraft.altitudeFt = Math.max(clearance.thresholdElevationFt, altitude);
  aircraft.targets.altitudeFt = aircraft.altitudeFt;

  return alongTrackNm <= 0;
}

// ---- Procedures --------------------------------------------------------------

const FIX_LEGS = new Set(['IF', 'TF', 'CF', 'DF', 'RF', 'AF']);
const ALTITUDE_LEGS = new Set(['VA', 'CA', 'FA']);
const INTERCEPT_LEGS = new Set(['VI', 'CI']);
const MANUAL_LEGS = new Set(['VM', 'FM']);
const DISTANCE_LEGS = new Set(['FC', 'CD', 'FD', 'VD', 'CR', 'VR']);
/** Distance flown on legs that end at a DME distance or radial we don't model exactly. */
const DEFAULT_LEG_DISTANCE_NM = 3;
/** An intercept leg ends when the aircraft is this close to the next leg's course. */
const INTERCEPT_CAPTURE_NM = 0.3;

/** Pilots respect a procedure speed restriction from this far out along the route. */
const SPEED_RESTRICTION_LOOKAHEAD_NM = 20;
/** Deceleration pilots plan with, and the distance they want to be slowed by before the fix. */
const PLANNED_DECELERATION_KT_PER_SEC = 0.8;
const SPEED_RESTRICTION_MARGIN_NM = 2;

/** The next speed-restricted fix ahead on a procedure, and the distance to it along the route. */
function nextSpeedRestriction(
  aircraft: AircraftState,
  legs: readonly ResolvedLeg[],
  fromIndex: number,
): { kts: number; distanceNm: number } | undefined {
  let distance = 0;
  let from = aircraft.position;
  for (let i = fromIndex; i < legs.length; i++) {
    const leg = legs[i]!;
    if (leg.position) {
      distance += distanceNm(from, leg.position);
      from = leg.position;
    } else if (leg.distanceNm !== undefined) {
      distance += leg.distanceNm;
    }
    if (leg.speedLimitKts !== undefined) return { kts: leg.speedLimitKts, distanceNm: distance };
    if (distance > SPEED_RESTRICTION_LOOKAHEAD_NM * 3) return undefined;
  }
  return undefined;
}

/**
 * Flies the current procedure leg and advances through the legs. Holds and
 * procedure turns end the procedure; the aircraft then keeps its heading.
 */
function flyProcedure(
  aircraft: AircraftState,
  magneticVariationDeg: number,
  config: FlightModelConfig,
): NavigationEvents {
  const events: NavigationEvents = {};
  for (let guard = 0; guard < 4; guard++) {
    const navigation = aircraft.navigation;
    if (navigation.mode !== 'procedure') return events;
    const leg = navigation.legs[navigation.legIndex];
    if (!leg) return finishProcedure(aircraft, events);
    const pt = leg.pathTerminator;

    const advance = () => {
      if (navigation.legIndex + 1 >= navigation.legs.length) {
        finishProcedure(aircraft, events);
        return;
      }
      navigation.legIndex++;
      navigation.legStart = { ...aircraft.position };
      delete navigation.inbound;
      delete navigation.extending;
      const next = navigation.legs[navigation.legIndex]!;
      aircraft.targets.turnDirection = next.turnDirection ?? 'shortest';
    };

    // Pilots plan for the next speed restriction ahead: they don't accelerate past it,
    // and start slowing early enough to meet it at the fix.
    const restriction = nextSpeedRestriction(aircraft, navigation.legs, navigation.legIndex);
    if (restriction) {
      const slowingNm =
        (Math.max(0, aircraft.iasKts - restriction.kts) / PLANNED_DECELERATION_KT_PER_SEC) *
        (trueAirspeedKts(aircraft) / 3600);
      const applies =
        restriction.distanceNm <= SPEED_RESTRICTION_LOOKAHEAD_NM ||
        restriction.distanceNm <= slowingNm + SPEED_RESTRICTION_MARGIN_NM;
      if (applies) navigation.speedLimitKts = restriction.kts;
      else delete navigation.speedLimitKts;
    } else delete navigation.speedLimitKts;
    planDescentVia(aircraft);

    if (FIX_LEGS.has(pt) && leg.position) {
      if (flyToFix(aircraft, navigation, leg.position, magneticVariationDeg, config)) {
        if (leg.fix) events.fixPassed = leg.fix;
        advance();
        continue;
      }
      return events;
    }

    if (leg.courseDeg === undefined) {
      advance();
      continue;
    }
    aircraft.targets.headingDeg = normalizeHeading(leg.courseDeg) || 0;

    if (ALTITUDE_LEGS.has(pt)) {
      if (leg.altitudeFt === undefined || aircraft.altitudeFt >= leg.altitudeFt) {
        advance();
        continue;
      }
      return events;
    }

    if (INTERCEPT_LEGS.has(pt)) {
      const next = navigation.legs[navigation.legIndex + 1];
      if (!next?.position || next.courseDeg === undefined) {
        advance();
        continue;
      }
      // Distance off the next leg's inbound course line (through its fix).
      const inbound = magneticToTrue(next.courseDeg, magneticVariationDeg);
      const offset = toRadians(
        headingDifference(
          normalizeHeading(inbound + 180),
          bearingTrue(next.position, aircraft.position),
        ),
      );
      const crossTrack = Math.abs(distanceNm(next.position, aircraft.position) * Math.sin(offset));
      if (crossTrack <= INTERCEPT_CAPTURE_NM) {
        advance();
        continue;
      }
      return events;
    }

    if (DISTANCE_LEGS.has(pt)) {
      if (
        distanceNm(navigation.legStart, aircraft.position) >=
        (leg.distanceNm ?? DEFAULT_LEG_DISTANCE_NM)
      ) {
        advance();
        continue;
      }
      return events;
    }

    if (MANUAL_LEGS.has(pt)) return events; // fly the heading until given vectors

    // Holds, procedure turns and other legs end the procedure.
    return finishProcedure(aircraft, events);
  }
  return events;
}

/** A published altitude restriction still ahead on the procedure being flown. */
export interface RestrictionAhead {
  fix: string;
  /** Cross at or above this altitude. */
  minFt?: number;
  /** Cross at or below this altitude. */
  maxFt?: number;
  /** Along the route from the aircraft. */
  distanceNm: number;
}

/**
 * The altitude restrictions ahead on the procedure an aircraft is flying, in
 * order, with the distance along the route to each. Stops at a heading leg,
 * where the route's length is no longer known.
 */
export function restrictionsAhead(aircraft: Readonly<AircraftState>): RestrictionAhead[] {
  const navigation = aircraft.navigation;
  if (navigation.mode !== 'procedure') return [];
  const ahead: RestrictionAhead[] = [];
  let from = aircraft.position;
  let distance = 0;
  for (const leg of navigation.legs.slice(navigation.legIndex)) {
    // Legs flown from a fix start there: no distance, and their fix is behind.
    if (leg.pathTerminator.startsWith('F')) continue;
    if (!leg.position) break;
    distance += distanceNm(from, leg.position);
    from = leg.position;
    const restriction = leg.altitudeRestriction;
    if (
      restriction &&
      leg.fix &&
      (restriction.minFt !== undefined || restriction.maxFt !== undefined)
    )
      ahead.push({
        fix: leg.fix,
        ...(restriction.minFt !== undefined ? { minFt: restriction.minFt } : {}),
        ...(restriction.maxFt !== undefined ? { maxFt: restriction.maxFt } : {}),
        distanceNm: distance,
      });
  }
  return ahead;
}

/**
 * The distance still to fly along the procedure (or direct-to) an aircraft is
 * on, and where that path ends. Stops at a heading leg, where the path's
 * length is no longer known.
 */
export function routeAhead(aircraft: Readonly<AircraftState>): { distanceNm: number; end: LatLon } {
  const navigation = aircraft.navigation;
  if (navigation.mode === 'direct')
    return {
      distanceNm: distanceNm(aircraft.position, navigation.position),
      end: navigation.position,
    };
  let end = aircraft.position;
  let distance = 0;
  if (navigation.mode !== 'procedure') return { distanceNm: 0, end };
  for (const leg of navigation.legs.slice(navigation.legIndex)) {
    if (leg.pathTerminator.startsWith('F')) continue;
    if (!leg.position) break;
    distance += distanceNm(end, leg.position);
    end = leg.position;
  }
  return { distanceNm: distance, end };
}

/**
 * Where a descent via the procedure ends: the lowest altitude its remaining
 * restrictions lead down to, or undefined if there are none ahead.
 */
export function descendViaBottomFt(aircraft: Readonly<AircraftState>): number | undefined {
  const levels = restrictionsAhead(aircraft).map((r) => r.minFt ?? r.maxFt!);
  return levels.length > 0 ? Math.min(...levels) : undefined;
}

/** Descents via a procedure are planned at this gradient (about 3°, a normal idle descent). */
export const DESCENT_PLAN_FT_PER_NM = 300;
/** ...aimed this far ahead of each restriction, so the aircraft is down in time. */
const DESCENT_PLAN_LEAD_NM = 2;

/**
 * Descending via a procedure: the altitude to descend to or hold now so every
 * restriction ahead is met, like an FMS's vertical path. The aircraft stays
 * up until it reaches the planned descent path (top of descent) to the next
 * "at or below" restriction, then descends to that restriction's altitude
 * and levels there; it never goes below an "at or above" restriction before
 * its fix, and never climbs. Sets `vnavAltitudeFt`, which the flight model
 * follows instead of the cleared (bottom) altitude.
 */
function planDescentVia(aircraft: AircraftState): void {
  const navigation = aircraft.navigation;
  if (navigation.mode !== 'procedure') return;
  const ahead = navigation.descendVia ? restrictionsAhead(aircraft) : [];
  if (ahead.length === 0) {
    delete navigation.vnavAltitudeFt;
    return;
  }
  const altitude = aircraft.altitudeFt;
  const floor = Math.min(
    altitude,
    Math.max(aircraft.targets.altitudeFt, ...ahead.map((r) => r.minFt ?? -Infinity)),
  );
  // The restriction whose descent path is lowest here decides when to go down, and to what.
  let path = Infinity;
  let pathTo: number | undefined;
  for (const r of ahead) {
    if (r.maxFt === undefined) continue;
    const onPath =
      r.maxFt + Math.max(0, r.distanceNm - DESCENT_PLAN_LEAD_NM) * DESCENT_PLAN_FT_PER_NM;
    if (onPath < path) {
      path = onPath;
      pathTo = r.maxFt;
    }
  }
  let target = navigation.vnavAltitudeFt;
  if (pathTo !== undefined && altitude >= path) target = pathTo;
  // Level (or no descent under way): hold where it is.
  else if (target === undefined || target >= altitude) target = altitude;
  navigation.vnavAltitudeFt = Math.max(target, floor);
}

function finishProcedure(aircraft: AircraftState, events: NavigationEvents): NavigationEvents {
  if (aircraft.navigation.mode === 'procedure') {
    events.procedureCompleted = aircraft.navigation.name;
    aircraft.navigation = { mode: 'heading' };
  }
  return events;
}
