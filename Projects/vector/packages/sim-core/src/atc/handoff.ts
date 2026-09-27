import type { SessionSettings } from '@vector/shared';
import type { AircraftState } from '../aircraft/aircraft';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { CenterController } from '../airspace/schema';
import { destinationPoint, distanceNm, magneticToTrue, type LatLon } from '../math/geo';

// When Center accepts a handoff. The receiving controller takes an aircraft
// that is close to the boundary it will leave through, high enough for their
// airspace, and actually leaving. The minimum altitude is the higher of the
// FAA minimum vectoring / minimum IFR altitude where the aircraft is and where
// it will cross, and the session's handoff floor (real facilities set handoff
// altitudes in letters of agreement, which aren't published).

/** The receiving Center is the one this far past the boundary crossing. */
const CENTER_LOOKAHEAD_NM = 10;
/** Distance flown when searching along the heading for the boundary crossing. */
const SEARCH_STEP_NM = 1;
const SEARCH_LIMIT_NM = 400;

/** Where an aircraft's heading takes it across the airspace boundary, and how far that is. */
export function boundaryCrossing(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
): { point: LatLon; distanceNm: number } | undefined {
  const { center, magneticVariationDeg } = pack.airspace;
  const radius = pack.boundaryRadiusNm;
  const course = magneticToTrue(aircraft.headingDeg, magneticVariationDeg);
  if (distanceNm(center, aircraft.position) > radius)
    return { point: aircraft.position, distanceNm: 0 };
  for (let flown = SEARCH_STEP_NM; flown <= SEARCH_LIMIT_NM; flown += SEARCH_STEP_NM) {
    const point = destinationPoint(aircraft.position, course, flown);
    if (distanceNm(center, point) > radius) return { point, distanceNm: flown };
  }
  return undefined;
}

export interface HandoffAssessment {
  /** The Center it will be handed to (the one it leaves into). */
  center: CenterController;
  /** Distance along its heading to the boundary, if it is heading out. */
  toBoundaryNm: number | undefined;
  minimumAltitudeFt: number;
  withinWindow: boolean;
  highEnough: boolean;
  /** Whether Center will accept the handoff now; otherwise why not. */
  ok: boolean;
  reason: string | undefined;
}

type HandoffSettings = Pick<
  SessionSettings,
  'center.handoffWindowNm' | 'center.handoffMinimumAltitudeFt'
>;

/** Whether Center will take a departure or overflight now, and what's missing if not. */
export function assessHandoff(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
  settings: HandoffSettings,
): HandoffAssessment {
  const crossing = boundaryCrossing(pack, aircraft);
  const exit = crossing?.point ?? aircraft.position;
  // The Center just past the crossing, clear of the boundary line itself.
  const beyond = destinationPoint(
    exit,
    magneticToTrue(aircraft.headingDeg, pack.airspace.magneticVariationDeg),
    CENTER_LOOKAHEAD_NM,
  );
  const center = pack.centerAt(beyond, aircraft.altitudeFt);
  const minimumAltitudeFt = Math.max(
    settings['center.handoffMinimumAltitudeFt'],
    pack.minimumVectoringAltitude(aircraft.position) ?? 0,
    pack.minimumVectoringAltitude(exit) ?? 0,
  );
  const window = settings['center.handoffWindowNm'];
  const withinWindow = crossing !== undefined && crossing.distanceNm <= window;
  const highEnough = aircraft.altitudeFt >= minimumAltitudeFt - 50;
  const label = (ft: number) =>
    ft >= pack.airspace.transitionAltitudeFt
      ? `FL${Math.round(ft / 100)}`
      : `${ft.toLocaleString('en-US')} ft`;

  let reason: string | undefined;
  if (pack.airspace.airports.includes(aircraft.flightPlan.destination))
    reason = 'Arrivals stay with you until Tower takes them';
  else if (!crossing) reason = 'Not heading out of your airspace';
  else if (!withinWindow)
    reason = `${center.callsign} takes it within ${window} NM of the boundary (${Math.round(crossing.distanceNm)} NM to go)`;
  else if (!highEnough)
    reason = `${center.callsign} needs it at or above ${label(minimumAltitudeFt)}`;

  return {
    center,
    toBoundaryNm: crossing?.distanceNm,
    minimumAltitudeFt,
    withinWindow,
    highEnough,
    ok: reason === undefined,
    reason,
  };
}

/** The last fix in a flight plan that is in the airspace: a departure's gate or an overflight's exit fix. */
export function routeExitFix(pack: AirspacePack, aircraft: Readonly<AircraftState>) {
  for (const ident of [...aircraft.flightPlan.route].reverse()) {
    const fix = pack.fix(ident);
    if (fix) return fix;
  }
  return undefined;
}
