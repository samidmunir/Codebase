// Arrivals, departures and overflights are drawn in different colors.

export type TrafficCategory = 'arrival' | 'departure' | 'transit';

/**
 * An aircraft's role in this airspace: landing at one of its airports, having
 * departed one, or just passing through.
 */
export function trafficCategory(
  flightPlan: { origin: string; destination: string },
  airports: ReadonlySet<string>,
): TrafficCategory {
  if (airports.has(flightPlan.destination)) return 'arrival';
  if (airports.has(flightPlan.origin)) return 'departure';
  return 'transit';
}
