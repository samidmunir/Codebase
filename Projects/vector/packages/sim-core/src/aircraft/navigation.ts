import { clamp, headingDifference, normalizeHeading, toRadians } from '../math/angles';
import { bearingTrue, distanceNm, magneticToTrue, trueToMagnetic, type LatLon } from '../math/geo';
import type { AircraftPerformance } from '../performance/performance';
import { trueAirspeedKts, type AircraftState, type IlsClearance } from './aircraft';
import { turnRateDegPerSec, type FlightModelConfig } from './flight-model';

// Lateral and vertical guidance: flying direct to a fix and flying an ILS.
// updateNavigation() runs before the flight model moves the aircraft (it sets
// the targets), and followGlideslope() runs after (it holds the glidepath).

const FEET_PER_NM = 6076.12;
/** Direct-to: the fix counts as passed within this distance. */
const FIX_PASSED_NM = 0.5;
/** Localizer tracking: heading correction per NM off centerline, and its limit. */
const LOCALIZER_GAIN_DEG_PER_NM = 40;
const LOCALIZER_MAX_CORRECTION_DEG = 30;
/** Localizer capture is possible within this distance of the threshold. */
const LOCALIZER_RANGE_NM = 30;
/** Glideslope capture window around the glidepath (captured from below or slightly above). */
const GLIDESLOPE_BELOW_FT = 20;
const GLIDESLOPE_ABOVE_FT = 300;
/** Established aircraft slow to final approach speed inside this distance. */
const FINAL_SPEED_NM = 6;

export interface NavigationEvents {
  fixPassed?: string;
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

/** Sets the aircraft's targets from its navigation mode. Mutates `aircraft`. */
export function updateNavigation(
  aircraft: AircraftState,
  performance: AircraftPerformance,
  magneticVariationDeg: number,
  config: FlightModelConfig,
): NavigationEvents {
  const navigation = aircraft.navigation;

  if (navigation.mode === 'direct') {
    const distance = distanceNm(aircraft.position, navigation.position);
    if (distance <= FIX_PASSED_NM) {
      aircraft.navigation = { mode: 'heading' };
      return { fixPassed: navigation.fix };
    }
    aircraft.targets.headingDeg = trueToMagnetic(
      bearingTrue(aircraft.position, navigation.position),
      magneticVariationDeg,
    );
    aircraft.targets.turnDirection = 'shortest';
    return {};
  }

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
    }
  }

  if (navigation.glideslopeCaptured) {
    // The glidepath is flown in followGlideslope(); keep the flight model from changing altitude.
    aircraft.targets.altitudeFt = aircraft.altitudeFt;
    // Pilots slow down on their own once established.
    const approachSpeed =
      geometry.alongTrackNm <= FINAL_SPEED_NM
        ? performance.speeds.final
        : performance.speeds.approach;
    if (aircraft.targets.speedMode === 'normal' || aircraft.targets.iasKts > approachSpeed) {
      aircraft.targets.speedMode = 'assigned';
      aircraft.targets.iasKts = approachSpeed;
    }
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
