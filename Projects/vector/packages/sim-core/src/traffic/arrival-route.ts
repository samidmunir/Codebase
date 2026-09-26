import type { ResolvedLeg } from '../aircraft/aircraft';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { RouteSegment } from '../airspace/schema';
import { headingDifference } from '../math/angles';
import { bearingTrue, destinationPoint, distanceNm, type LatLon } from '../math/geo';
import { resolveLegs } from './departure-procedure';

export interface ArrivalRoute {
  /** STAR id, e.g. 'CAMRN5'. */
  star: string;
  /** Enroute transition the aircraft entered on, if any. */
  transition: string | undefined;
  /** Where the route crosses the airspace boundary: the aircraft appears here. */
  entry: LatLon;
  /** Remaining legs from the boundary inward. */
  legs: ResolvedLeg[];
  /** Published altitude at the first fix inside the boundary, if the STAR gives one. */
  crossingAltitudeFt: number | undefined;
}

/** Arrivals appear this far inside the boundary so they are clearly the player's traffic. */
const ENTRY_INSET_NM = 1;

/** Point where the great-circle segment a→b first comes within `radiusNm` of `center`. */
function boundaryCrossing(a: LatLon, b: LatLon, center: LatLon, radiusNm: number): LatLon {
  const bearing = bearingTrue(a, b);
  let low = 0;
  let high = distanceNm(a, b);
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (distanceNm(center, destinationPoint(a, bearing, mid)) > radiusNm) low = mid;
    else high = mid;
  }
  return destinationPoint(a, bearing, high);
}

/**
 * All arrival routes into an airport that cross into the airspace, for the
 * runway in use: each STAR's enroute transitions (or its common route alone),
 * common route, and the runway transition for that runway.
 */
export function arrivalRoutes(
  pack: AirspacePack,
  airport: string,
  arrivalRunway: string,
): ArrivalRoute[] {
  const { center } = pack.airspace;
  const radius = pack.boundaryRadiusNm - ENTRY_INSET_NM;
  const routes: ArrivalRoute[] = [];

  for (const star of pack.arrivals.filter((a) => a.airport === airport)) {
    const runwayTransition = star.runwayTransitions.find((t) => t.runways?.includes(arrivalRunway));
    const common = star.commonRoutes.filter(
      (route) => !route.runways || route.runways.includes(arrivalRunway),
    );
    const entries: (RouteSegment | undefined)[] =
      star.enrouteTransitions.length > 0 ? star.enrouteTransitions : [undefined];

    for (const transition of entries) {
      const legs = resolveLegs(pack, airport, [
        ...(transition?.legs ?? []),
        ...common.flatMap((route) => route.legs),
        ...(runwayTransition?.legs ?? []),
      ]);
      // Find the first leg whose fix is inside the boundary, coming from one outside.
      const index = legs.findIndex(
        (leg, i) =>
          i > 0 &&
          leg.position !== undefined &&
          distanceNm(center, leg.position) <= radius &&
          legs
            .slice(0, i)
            .some((earlier) => earlier.position && distanceNm(center, earlier.position) > radius),
      );
      if (index === -1) continue;
      const previous = [...legs.slice(0, index)].reverse().find((leg) => leg.position)!;
      const firstInside = legs[index]!;
      const altitude = star.commonRoutes
        .concat(transition ? [transition] : [])
        .flatMap((segment) => segment.legs)
        .find((leg) => leg.fix === firstInside.fix)?.altitude;

      routes.push({
        star: star.id,
        transition: transition?.name,
        entry: boundaryCrossing(previous.position!, firstInside.position!, center, radius),
        legs: legs.slice(index),
        crossingAltitudeFt:
          altitude?.type === 'at' || altitude?.type === 'atOrBelow'
            ? altitude.ft
            : altitude?.type === 'between'
              ? altitude.maxFt
              : undefined,
      });
    }
  }
  return routes;
}

/** The arrival route that enters closest to the direction the flight comes from. */
export function arrivalRouteFrom(
  pack: AirspacePack,
  airport: string,
  arrivalRunway: string,
  fromBearingDeg: number,
): ArrivalRoute | undefined {
  const { center } = pack.airspace;
  let best: { route: ArrivalRoute; angle: number } | undefined;
  for (const route of arrivalRoutes(pack, airport, arrivalRunway)) {
    const angle = Math.abs(headingDifference(fromBearingDeg, bearingTrue(center, route.entry)));
    if (!best || angle < best.angle) best = { route, angle };
  }
  return best?.route;
}
