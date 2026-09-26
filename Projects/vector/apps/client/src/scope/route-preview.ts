import {
  destinationPoint,
  magneticToTrue,
  procedureWords,
  type AircraftState,
  type AirspacePack,
  type LatLon,
} from '@vector/sim-core';

/** The route an aircraft is flying, for drawing on the scope when it is selected. */
export interface RoutePreview {
  /** The path being flown, from the aircraft onward. */
  path: LatLon[];
  /** Where the aircraft continues after its current path (e.g. a departure's gate), drawn fainter. */
  onward: LatLon[];
  fixes: { ident: string; position: LatLon; note?: string }[];
  /** A heading being flown with no fix at the end ("expect vectors"). */
  headingTail: { from: LatLon; to: LatLon } | undefined;
  /** Short description, e.g. 'TNNIS six departure', drawn at the start. */
  label: string | undefined;
}

/** Length of a heading line when the route ends on a heading. */
const HEADING_TAIL_NM = 10;
/** ILS final approach course drawn out to this distance. */
const FINAL_COURSE_NM = 12;

export function routePreview(aircraft: Readonly<AircraftState>, pack: AirspacePack): RoutePreview {
  const variation = pack.airspace.magneticVariationDeg;
  const preview: RoutePreview = {
    path: [aircraft.position],
    onward: [],
    fixes: [],
    headingTail: undefined,
    label: undefined,
  };
  const tail = (from: LatLon, courseDeg: number) => ({
    from,
    to: destinationPoint(from, magneticToTrue(courseDeg, variation), HEADING_TAIL_NM),
  });
  const navigation = aircraft.navigation;

  if (navigation.mode === 'procedure') {
    preview.label =
      navigation.name === 'Runway heading' || navigation.name === 'Missed approach'
        ? navigation.name
        : `${procedureWords(navigation.name)} ${aircraft.phase === 'arrival' ? 'arrival' : 'departure'}`;
    for (const leg of navigation.legs.slice(navigation.legIndex)) {
      // FA, FC, FD and FM legs start at their fix and fly a course from it: the fix is behind.
      const fromFix = leg.pathTerminator.startsWith('F');
      if (fromFix) {
        if (leg.courseDeg !== undefined)
          preview.headingTail = tail(preview.path.at(-1)!, leg.courseDeg);
        if (leg.pathTerminator === 'FM') break;
        continue;
      }
      if (leg.position) {
        preview.path.push(leg.position);
        if (leg.fix) {
          preview.fixes.push({
            ident: leg.fix,
            position: leg.position,
            ...(leg.speedLimitKts ? { note: `≤${leg.speedLimitKts}` } : {}),
          });
        }
      } else if (
        leg.courseDeg !== undefined &&
        ['VM', 'VA', 'CA', 'VI', 'CI'].includes(leg.pathTerminator)
      ) {
        // A heading leg: draw it from wherever the path has got to; VM ends the route (vectors expected).
        preview.headingTail = tail(preview.path.at(-1)!, leg.courseDeg);
        if (leg.pathTerminator === 'VM') break;
      }
    }
  } else if (navigation.mode === 'direct') {
    preview.path.push(navigation.position);
    preview.fixes.push({ ident: navigation.fix, position: navigation.position });
  } else if (navigation.mode === 'approach') {
    const { clearance } = navigation;
    const outbound = magneticToTrue(clearance.courseDeg, variation) + 180;
    preview.label = `ILS ${clearance.runway}`;
    if (!navigation.localizerCaptured)
      preview.headingTail = tail(aircraft.position, aircraft.targets.headingDeg);
    preview.onward = [
      destinationPoint(clearance.threshold, outbound, FINAL_COURSE_NM),
      clearance.threshold,
    ];
    if (navigation.localizerCaptured) preview.path.push(clearance.threshold);
  } else {
    preview.headingTail = tail(aircraft.position, aircraft.targets.headingDeg);
  }

  // Departures continue to their gate fix, the last fix in the flight plan route.
  const last = aircraft.flightPlan.route.at(-1);
  const gate = last ? pack.fix(last) : undefined;
  const departing = !pack.airspace.airports.includes(aircraft.flightPlan.destination);
  if (departing && gate && !preview.fixes.some((fix) => fix.ident === gate.ident)) {
    preview.onward = [preview.path.at(-1)!, gate.position];
    preview.fixes.push({ ident: gate.ident, position: gate.position, note: 'gate' });
  }
  return preview;
}
