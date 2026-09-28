import { describe, expect, it } from 'vitest';
import { newYork, performance } from '../testing/fixtures';
import { arrivalRoutes, entryAltitudeLimitFt } from '../traffic/arrival-route';
import { bearingTrue, trueToMagnetic } from '../math/geo';
import type { AircraftState } from './aircraft';
import { DEFAULT_FLIGHT_MODEL_CONFIG as config, stepAircraft } from './flight-model';
import { descendViaBottomFt, restrictionsAhead, updateNavigation } from './navigation';

const variation = newYork.airspace.magneticVariationDeg;

/** An arrival entering on a STAR route at `altitudeFt`, descending via it. */
function onArrival(star: string, airport: string, runway: string, altitudeFt: number) {
  const routes = arrivalRoutes(newYork, airport, runway).filter((r) => r.star === star);
  return routes.map((route) => {
    // As the sim enters them: low enough to meet the STAR's restrictions.
    altitudeFt = Math.min(
      altitudeFt,
      Math.floor((entryAltitudeLimitFt(route) ?? Infinity) / 1_000) * 1_000,
    );
    const first = route.legs.find((leg) => leg.position)!;
    const aircraft = {
      id: 'A1',
      callsign: 'DAL1',
      aircraftType: 'A320',
      squawk: '1234',
      flightPlan: { origin: 'KATL', destination: airport, route: [star] },
      phase: 'arrival',
      owner: 'N90',
      position: route.entry,
      altitudeFt,
      headingDeg: trueToMagnetic(bearingTrue(route.entry, first.position!), variation),
      iasKts: 280,
      verticalSpeedFpm: 0,
      targets: {
        altitudeFt,
        headingDeg: 0,
        turnDirection: 'shortest',
        iasKts: 280,
        speedMode: 'normal',
      },
      navigation: {
        mode: 'procedure',
        name: star,
        legs: route.legs,
        legIndex: 0,
        legStart: route.entry,
        descendVia: true,
      },
    } as AircraftState;
    aircraft.targets.altitudeFt = descendViaBottomFt(aircraft) ?? altitudeFt;
    return { route, aircraft };
  });
}

/** Flies the procedure, recording the altitude and speed at each fix passed. */
function fly(aircraft: AircraftState) {
  const crossed: Record<string, { altitudeFt: number; iasKts: number }> = {};
  const a320 = performance.get('A320');
  for (let t = 0; t < 3 * 3600 && aircraft.navigation.mode === 'procedure'; t++) {
    const result = updateNavigation(aircraft, a320, variation, config);
    if (result.fixPassed)
      crossed[result.fixPassed] = { altitudeFt: aircraft.altitudeFt, iasKts: aircraft.iasKts };
    stepAircraft(aircraft, a320, 1, variation, config);
  }
  return crossed;
}

const TOLERANCE_FT = 150;

describe('descend via a STAR', () => {
  it.each([
    ['PROUD2', 'KLGA', '22', 37_000],
    ['PHLBO4', 'KEWR', '22L', 35_000],
    ['BRAND1', 'KEWR', '22L', 24_000],
    ['APPLE3', 'KLGA', '22', 24_000],
    ['PAWLN1', 'KJFK', '22L', 33_000],
  ])('%s: meets every published altitude at its fix', (star, airport, runway, entryFt) => {
    const flights = onArrival(star, airport, runway, entryFt);
    expect(flights.length).toBeGreaterThan(0);
    for (const { aircraft } of flights) {
      const restrictions = restrictionsAhead(aircraft);
      if (restrictions.length === 0) continue;
      const crossed = fly(aircraft);
      for (const r of restrictions) {
        const at = crossed[r.fix];
        // Restrictions the aircraft entered too low (or too close) to meet from above are skipped.
        if (!at || (r.minFt !== undefined && entryFt < r.minFt)) continue;
        const label = `${star} ${r.fix} ${r.minFt ?? ''}–${r.maxFt ?? ''} crossed at ${Math.round(at.altitudeFt)}`;
        if (r.minFt !== undefined)
          expect(at.altitudeFt, label).toBeGreaterThanOrEqual(r.minFt - TOLERANCE_FT);
        if (r.maxFt !== undefined)
          expect(at.altitudeFt, label).toBeLessThanOrEqual(r.maxFt + TOLERANCE_FT);
      }
    }
  });

  it('stays at cruise until the planned descent, then levels at the bottom', () => {
    const { aircraft } = onArrival('PROUD2', 'KLGA', '22', 37_000)[0]!;
    const bottom = aircraft.targets.altitudeFt;
    expect(bottom).toBe(10_000); // KORRY at 10,000
    const a320 = performance.get('A320');
    // Early on, the next "at" restriction (RIDGY at FL270) is far: no descent yet.
    updateNavigation(aircraft, a320, variation, config);
    const first = restrictionsAhead(aircraft)[0]!;
    if (first.distanceNm > (37_000 - 27_000) / 300 + 5) {
      stepAircraft(aircraft, a320, 1, variation, config);
      expect(aircraft.altitudeFt).toBe(37_000);
    }
    fly(aircraft);
    expect(aircraft.altitudeFt).toBeCloseTo(bottom, -2);
  });

  it('crosses 10,000 ft at 250 kt or less on the way down', () => {
    const { aircraft } = onArrival('PHLBO4', 'KEWR', '22L', 35_000)[0]!;
    const a320 = performance.get('A320');
    let fastest = 0;
    for (let t = 0; t < 3 * 3600 && aircraft.navigation.mode === 'procedure'; t++) {
      updateNavigation(aircraft, a320, variation, config);
      stepAircraft(aircraft, a320, 1, variation, config);
      if (aircraft.altitudeFt < 10_000) fastest = Math.max(fastest, aircraft.iasKts);
    }
    expect(fastest).toBeLessThanOrEqual(251);
  });
});
