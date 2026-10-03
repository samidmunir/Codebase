import type { SessionSettings } from '@vector/shared';
import type { AircraftState } from '../aircraft/aircraft';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { CenterController } from '../airspace/schema';
import { pointInRing } from '../airspace/airspace-pack';
import { normalizeHeading } from '../math/angles';
import { destinationPoint, distanceNm, magneticToTrue, type LatLon } from '../math/geo';

// When Center accepts a handoff. The receiving controller takes an aircraft
// that is close to where it leaves the TRACON's airspace (N90's outline),
// high enough (17,000 ft eastbound and 18,000 ft westbound by default, and
// never below the FAA minimum vectoring / minimum IFR altitude where it is and
// where it leaves), and actually leaving.

/** The receiving Center is the one this far past the boundary crossing. */
const CENTER_LOOKAHEAD_NM = 10;
/** Distance flown when searching along the heading for the boundary crossing. */
const SEARCH_STEP_NM = 1;
const SEARCH_LIMIT_NM = 400;

/**
 * The boundary handoffs are measured against: the TRACON's own airspace when
 * the pack has its outline, otherwise the edge of the whole airspace.
 */
function handoffArea(pack: AirspacePack): {
  name: string;
  inside: (position: LatLon) => boolean;
} {
  const { traconBoundary } = pack.videoMap;
  const ring = traconBoundary.lines.reduce<readonly (readonly [number, number])[]>(
    (longest, line) => (line.length > longest.length ? line : longest),
    [],
  );
  if (ring.length >= 4) {
    return { name: `${traconBoundary.name} boundary`, inside: (p) => pointInRing(p, ring) };
  }
  const { center } = pack.airspace;
  const radius = pack.boundaryRadiusNm;
  return { name: 'boundary', inside: (p) => distanceNm(center, p) <= radius };
}

/**
 * Where an aircraft's heading takes it out of the handoff area, and how far
 * that is. An aircraft outside it that will cross through it leaves on the
 * far side; one outside that never enters it is already past (distance 0).
 */
export function boundaryCrossing(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
): { point: LatLon; distanceNm: number } | undefined {
  const area = handoffArea(pack);
  const course = magneticToTrue(aircraft.headingDeg, pack.airspace.magneticVariationDeg);
  let wasInside = area.inside(aircraft.position);
  let enteredAt: number | undefined = wasInside ? 0 : undefined;
  for (let flown = SEARCH_STEP_NM; flown <= SEARCH_LIMIT_NM; flown += SEARCH_STEP_NM) {
    const point = destinationPoint(aircraft.position, course, flown);
    const inside = area.inside(point);
    if (inside && !wasInside) enteredAt = flown;
    if (!inside && wasInside) return { point, distanceNm: flown };
    wasInside = inside;
  }
  // Never inside along its path: already out.
  return enteredAt === undefined ? { point: aircraft.position, distanceNm: 0 } : undefined;
}

/** The name of the boundary handoffs are measured against, e.g. 'N90 boundary'. */
export const handoffBoundaryName = (pack: AirspacePack) => handoffArea(pack).name;

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
  'center.handoffWindowNm' | 'center.handoffMinimumEastboundFt' | 'center.handoffMinimumWestboundFt'
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
  // Eastbound (magnetic course 000–179) and westbound flights have their own floors.
  const eastbound = normalizeHeading(aircraft.headingDeg) < 180;
  const directionalFloorFt = eastbound
    ? settings['center.handoffMinimumEastboundFt']
    : settings['center.handoffMinimumWestboundFt'];
  const minimumAltitudeFt = Math.max(
    directionalFloorFt,
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
    reason = `${center.callsign} takes it within ${window} NM of the ${handoffBoundaryName(pack)} (${Math.round(crossing.distanceNm)} NM to go)`;
  else if (!highEnough)
    reason = `${center.callsign} needs it at or above ${label(minimumAltitudeFt)}${
      minimumAltitudeFt === directionalFloorFt ? (eastbound ? ' (eastbound)' : ' (westbound)') : ''
    }`;

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
