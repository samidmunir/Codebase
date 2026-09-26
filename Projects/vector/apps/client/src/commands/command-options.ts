import {
  bearingTrue,
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

/** Handoff to the New York Center radio site nearest the aircraft, on its altitude band. */
export function centerHandoff(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
): AtcCommand | undefined {
  const { center } = pack.airspace.controllers;
  const band = aircraft.altitudeFt >= 18_000 ? 'high' : 'low';
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

/** Fixes for direct-to: fixes on the aircraft's arrival or departure procedure first, then the nearest others. */
export function directToOptions(
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
  limit = 14,
): FixOption[] {
  const variation = pack.airspace.magneticVariationDeg;
  const option = (fix: Fix, onRoute: boolean): FixOption => ({
    fix,
    distanceNm: distanceNm(aircraft.position, fix.position),
    bearingDeg:
      Math.round(trueToMagnetic(bearingTrue(aircraft.position, fix.position), variation)) % 360 ||
      360,
    onRoute,
  });

  const routeIds = new Set<string>();
  for (const id of aircraft.flightPlan.route) {
    const procedure = [...pack.arrivals, ...pack.departures].find(
      (p) =>
        p.id === id &&
        (p.airport === aircraft.flightPlan.destination || p.airport === aircraft.flightPlan.origin),
    );
    for (const segment of [
      ...(procedure?.enrouteTransitions ?? []),
      ...(procedure?.commonRoutes ?? []),
      ...(procedure?.runwayTransitions ?? []),
    ]) {
      for (const leg of segment.legs) if (leg.fix) routeIds.add(leg.fix);
    }
  }

  const route = [...routeIds]
    .map((ident) => pack.fix(ident))
    .filter((fix): fix is Fix => fix !== undefined)
    .map((fix) => option(fix, true))
    .filter((o) => o.distanceNm > 1 && o.distanceNm < 60);

  const nearby = pack.fixes
    .filter((fix) => !routeIds.has(fix.ident))
    .map((fix) => option(fix, false))
    .filter((o) => o.distanceNm > 1)
    .sort((a, b) => a.distanceNm - b.distanceNm);

  return [...route.sort((a, b) => a.distanceNm - b.distanceNm), ...nearby].slice(0, limit);
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
  const inside = (ring: readonly [number, number][]) => {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (
        yi > position.lat !== yj > position.lat &&
        position.lon < ((xj - xi) * (position.lat - yi)) / (yj - yi) + xi
      ) {
        result = !result;
      }
    }
    return result;
  };
  let highest: number | undefined;
  for (const sector of pack.videoMap.minimumVectoringAltitudes) {
    if (inside(sector.exterior) && !sector.holes.some(inside)) {
      highest = Math.max(highest ?? 0, sector.minimumAltitudeFt);
    }
  }
  return highest;
}
