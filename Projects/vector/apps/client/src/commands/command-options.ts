import type { SessionSettings } from '@vector/shared';
import {
  assessHandoff,
  bearingTrue,
  descendViaBottomFt,
  restrictionsAhead,
  distanceNm,
  trueToMagnetic,
  type AircraftPerformance,
  type AircraftState,
  type AirspacePack,
  type AtcCommand,
  type Fix,
  type IlsClearance,
} from '@vector/sim-core';

// Builds the choices the command UI offers, from the airspace pack and the
// aircraft's performance. Choices are always valid values; the engine
// validates again when an instruction is transmitted.

/** Threshold crossing height assumed when a runway doesn't publish one. */
const DEFAULT_TCH_FT = 50;
const LOWEST_ASSIGNABLE_ALTITUDE_FT = 2_000;

export function ilsClearance(
  pack: AirspacePack,
  airport: string,
  runwayId: string,
): IlsClearance | undefined {
  const runway = pack.airport(airport).runways.find((r) => r.id === runwayId);
  const approach = pack.ilsApproaches(airport, runwayId)[0];
  if (!runway?.ils || !approach) return undefined;
  return {
    airport,
    runway: runwayId,
    approachId: approach.id,
    threshold: runway.threshold,
    thresholdElevationFt: runway.thresholdElevationFt,
    courseDeg: runway.ils.courseDeg,
    glideslopeDeg: runway.ils.glideslopeAngleDeg,
    thresholdCrossingHeightFt: runway.ils.thresholdCrossingHeightFt ?? DEFAULT_TCH_FT,
  };
}

/** Runways with an ILS at the aircraft's destination, if it lands in this airspace. */
export function ilsRunways(pack: AirspacePack, aircraft: Readonly<AircraftState>): string[] {
  if (!pack.airspace.airports.includes(aircraft.flightPlan.destination)) return [];
  return pack
    .airport(aircraft.flightPlan.destination)
    .runways.filter(
      (runway) =>
        runway.ils && pack.ilsApproaches(aircraft.flightPlan.destination, runway.id).length > 0,
    )
    .map((runway) => runway.id);
}

/**
 * Handoff to the Center the aircraft is leaving into (by where its heading
 * takes it across the boundary), on that Center's radio site nearest the
 * aircraft for its altitude band.
 */
export function centerHandoff(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
  handoffSettings: Pick<
    SessionSettings,
    | 'center.handoffWindowNm'
    | 'center.handoffMinimumEastboundFt'
    | 'center.handoffMinimumWestboundFt'
  > = {
    'center.handoffWindowNm': 20,
    'center.handoffMinimumEastboundFt': 17_000,
    'center.handoffMinimumWestboundFt': 18_000,
  },
): AtcCommand | undefined {
  const { center } = assessHandoff(pack, aircraft, handoffSettings);
  const band = aircraft.altitudeFt >= pack.airspace.transitionAltitudeFt ? 'high' : 'low';
  const candidates = center.sites
    .map((site) => ({
      site,
      frequency:
        site.frequencies.find((f) => f.altitude === band) ??
        site.frequencies.find((f) => f.altitude === 'low/high'),
    }))
    .filter((c) => c.frequency)
    .sort(
      (a, b) =>
        distanceNm(a.site.position, aircraft.position) -
        distanceNm(b.site.position, aircraft.position),
    );
  const nearest = candidates[0];
  if (!nearest) return undefined;
  return {
    type: 'handoff',
    to: center.id,
    facility: center.callsign,
    frequencyMhz: nearest.frequency!.frequencyMhz,
  };
}

/** Whether the aircraft leaves this airspace (and so gets handed off to Center). */
export function isDeparting(pack: AirspacePack, aircraft: Readonly<AircraftState>): boolean {
  return !pack.airspace.airports.includes(aircraft.flightPlan.destination);
}

export interface FixOption {
  fix: Fix;
  distanceNm: number;
  /** Magnetic bearing from the aircraft. */
  bearingDeg: number;
  onRoute: boolean;
}

export interface FixGroup {
  /** 'Route', 'Within 10 NM', '10–20 NM', ... */
  title: string;
  fixes: FixOption[];
}

/** Fixes farther than this are left out of the direct-to list: farther for fast, high traffic. */
const DIRECT_TO_RANGE_NM = 40;
const DIRECT_TO_RANGE_HIGH_NM = 120;

export const directToRangeNm = (aircraft: Readonly<AircraftState>, pack: AirspacePack) =>
  aircraft.altitudeFt >= pack.airspace.transitionAltitudeFt
    ? DIRECT_TO_RANGE_HIGH_NM
    : DIRECT_TO_RANGE_NM;

/**
 * Fixes still ahead of the aircraft on its route, in flying order: the rest of
 * the procedure it is flying, then any fixes in its flight plan (e.g. a
 * departure's gate).
 */
export function routeFixesAhead(pack: AirspacePack, aircraft: Readonly<AircraftState>): string[] {
  const ahead: string[] = [];
  const navigation = aircraft.navigation;
  if (navigation.mode === 'procedure') {
    for (const leg of navigation.legs.slice(navigation.legIndex)) {
      // Legs flown from a fix start there: that fix is behind.
      if (leg.fix && !leg.pathTerminator.startsWith('F') && !ahead.includes(leg.fix))
        ahead.push(leg.fix);
    }
  } else if (navigation.mode === 'direct') {
    ahead.push(navigation.fix);
  }
  for (const id of aircraft.flightPlan.route) {
    if (pack.fix(id) && !ahead.includes(id)) ahead.push(id);
  }
  return ahead;
}

/**
 * Fixes for direct-to, grouped to make the right one easy to find: the fixes
 * still ahead on the aircraft's route first (in flying order), then every other
 * fix within range in distance rings of `ringNm`, alphabetical within each ring.
 */
export function directToGroups(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
  ringNm: number,
): FixGroup[] {
  const variation = pack.airspace.magneticVariationDeg;
  const option = (fix: Fix, onRoute: boolean): FixOption => ({
    fix,
    distanceNm: distanceNm(aircraft.position, fix.position),
    bearingDeg:
      Math.round(trueToMagnetic(bearingTrue(aircraft.position, fix.position), variation)) % 360 ||
      360,
    onRoute,
  });

  // Route: the fixes still ahead on the aircraft's path, in the order it will fly them.
  const routeIds = routeFixesAhead(pack, aircraft);
  const route = routeIds
    .map((ident) => pack.fix(ident))
    .filter((fix): fix is Fix => fix !== undefined)
    .map((fix) => option(fix, true))
    .filter((o) => o.distanceNm > 1);

  const groups: FixGroup[] = route.length > 0 ? [{ title: 'Route', fixes: route }] : [];
  const range = directToRangeNm(aircraft, pack);
  const onRoute = new Set(routeIds);
  const others = pack.fixes
    .filter((fix) => !onRoute.has(fix.ident))
    .map((fix) => option(fix, false))
    .filter((o) => o.distanceNm > 1 && o.distanceNm <= range);

  for (let inner = 0; inner < range; inner += ringNm) {
    const outer = inner + ringNm;
    const fixes = others
      .filter((o) => o.distanceNm > inner && o.distanceNm <= outer)
      .sort((a, b) => a.fix.ident.localeCompare(b.fix.ident));
    if (fixes.length > 0)
      groups.push({ title: inner === 0 ? `Within ${outer} NM` : `${inner}–${outer} NM`, fixes });
  }
  return groups;
}

/** Assignable altitudes: every 1,000 ft from 2,000 ft to the top of the airspace (or the aircraft's ceiling). */
export function altitudeOptions(pack: AirspacePack, performance: AircraftPerformance): number[] {
  const top = Math.min(pack.airspace.boundary.ceilingFt, performance.ceilingFt);
  const options: number[] = [];
  for (let altitude = LOWEST_ASSIGNABLE_ALTITUDE_FT; altitude <= top; altitude += 1_000)
    options.push(altitude);
  return options;
}

/** Assignable speeds in 10-knot steps, from final approach speed to the limit for the altitude. */
export function speedOptions(performance: AircraftPerformance, altitudeFt: number): number[] {
  const low = Math.ceil(performance.speeds.final / 10) * 10;
  const high =
    Math.floor(
      Math.min(performance.speeds.max, altitudeFt < 10_000 ? 250 : performance.speeds.max) / 10,
    ) * 10;
  const options: number[] = [];
  for (let speed = low; speed <= high; speed += 10) options.push(speed);
  return options;
}

/** The minimum vectoring altitude at a position, from the airspace's MVA chart. */
export function minimumVectoringAltitude(
  pack: AirspacePack,
  position: { lat: number; lon: number },
): number | undefined {
  return pack.minimumVectoringAltitude(position);
}

/** Track miles needed per 1,000 ft of descent (the 3:1 rule). */
const DESCENT_NM_PER_1000FT = 3;
/** Arrivals are planned down to about this height above the field before the approach. */
const APPROACH_HEIGHT_FT = 3_000;
/** Warn this many miles before the descent should start. */
const DESCENT_WARNING_NM = 5;

export interface PlanningNote {
  label: string;
  value: string;
  tone: 'normal' | 'good' | 'caution';
}

/**
 * Planning help for the command panel: for arrivals, distance to the airport
 * and when to start down (3:1); for departures and overflights, the requested
 * level and where they leave, with how far to go.
 */
export function planningNotes(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
  altitudeLabel: (altitudeFt: number) => string,
  handoffSettings?: Pick<
    SessionSettings,
    | 'center.handoffWindowNm'
    | 'center.handoffMinimumEastboundFt'
    | 'center.handoffMinimumWestboundFt'
  >,
): PlanningNote[] {
  const { destination } = aircraft.flightPlan;
  if (pack.airspace.airports.includes(destination)) {
    const airport = pack.airport(destination);
    const distance = distanceNm(aircraft.position, airport.position);
    const toLose = Math.max(0, aircraft.altitudeFt - airport.elevationFt - APPROACH_HEIGHT_FT);
    const needed = (toLose / 1000) * DESCENT_NM_PER_1000FT;
    const descending = aircraft.targets.altitudeFt < aircraft.altitudeFt - 100;
    const shortName = destination.startsWith('K') ? destination.slice(1) : destination;
    const notes: PlanningNote[] = [
      { label: shortName, value: `${Math.round(distance)} NM`, tone: 'normal' },
    ];
    const via = descendViaOption(aircraft);
    if (via) {
      notes.push({
        label: via.active ? 'Descend via' : 'STAR',
        value: `${via.next.fix} ${via.next.label} · ${Math.round(via.next.distanceNm)} NM`,
        tone: via.active ? 'good' : 'normal',
      });
    }
    if (toLose > 0 && aircraft.phase === 'arrival' && !via?.active) {
      notes.push(
        descending
          ? { label: 'Descent', value: 'descending', tone: 'good' }
          : distance <= needed + DESCENT_WARNING_NM
            ? { label: 'Descent', value: 'start down now', tone: 'caution' }
            : {
                label: 'Descent',
                value: `start in ${Math.round(distance - needed)} NM`,
                tone: 'normal',
              },
      );
    }
    return notes;
  }

  const notes: PlanningNote[] = [];
  const requested = aircraft.flightPlan.requestedAltitudeFt;
  if (requested !== undefined) {
    const cleared = aircraft.targets.altitudeFt === requested;
    notes.push({
      label: 'Requested',
      value: `${altitudeLabel(requested)}${cleared ? ' ✓' : ''}`,
      tone: cleared ? 'good' : 'normal',
    });
  }
  if (handoffSettings) {
    const handoff = assessHandoff(pack, aircraft, handoffSettings);
    const name = handoff.center.callsign.replace(' Center', '');
    if (handoff.toBoundaryNm === undefined) {
      notes.push({ label: 'Exit', value: 'not heading out', tone: 'normal' });
    } else if (handoff.ok) {
      notes.push({ label: 'Handoff', value: `${name} · now`, tone: 'good' });
    } else if (!handoff.withinWindow) {
      const inNm = Math.round(handoff.toBoundaryNm - handoffSettings['center.handoffWindowNm']);
      notes.push({ label: 'Handoff', value: `${name} · in ${inNm} NM`, tone: 'normal' });
    } else {
      notes.push({
        label: 'Handoff',
        value: `climb to ${altitudeLabel(handoff.minimumAltitudeFt)}`,
        tone: 'caution',
      });
    }
  }
  return notes;
}

/** A published altitude restriction the way charts abbreviate it, in hundreds: '100', '240+', '170-', '190–220'. */
export function restrictionLabel(restriction: {
  minFt?: number | undefined;
  maxFt?: number | undefined;
}): string {
  const hundreds = (ft: number) => String(Math.round(ft / 100)).padStart(3, '0');
  const { minFt, maxFt } = restriction;
  if (minFt !== undefined && maxFt !== undefined)
    return minFt === maxFt ? hundreds(minFt) : `${hundreds(minFt)}–${hundreds(maxFt)}`;
  if (minFt !== undefined) return `${hundreds(minFt)}+`;
  return `${hundreds(maxFt!)}-`;
}

/** What "descend via" would do for an arrival on a STAR that publishes altitudes, if anything. */
export function descendViaOption(aircraft: Readonly<AircraftState>):
  | {
      procedure: string;
      bottomFt: number;
      /** Already descending via it. */
      active: boolean;
      next: { fix: string; label: string; distanceNm: number };
    }
  | undefined {
  const navigation = aircraft.navigation;
  if (navigation.mode !== 'procedure') return undefined;
  const bottomFt = descendViaBottomFt(aircraft);
  const [next] = restrictionsAhead(aircraft);
  if (bottomFt === undefined || !next) return undefined;
  return {
    procedure: navigation.name,
    bottomFt,
    active: navigation.descendVia === true,
    next: { fix: next.fix, label: restrictionLabel(next), distanceNm: next.distanceNm },
  };
}
