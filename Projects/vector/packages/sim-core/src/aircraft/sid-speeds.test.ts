import { describe, expect, it } from 'vitest';
import { destinationPoint } from '../math/geo';
import { newYork, performance } from '../testing/fixtures';
import { resolveLegs } from '../traffic/departure-procedure';
import type { AircraftState, ResolvedLeg } from './aircraft';
import { DEFAULT_FLIGHT_MODEL_CONFIG as config, stepAircraft } from './flight-model';
import { updateNavigation } from './navigation';

const variation = newYork.airspace.magneticVariationDeg;

/** A departure just airborne off `runway`, starting the SID's runway transition. */
function departing(
  airport: string,
  sid: string,
  runway: string,
  speedMode: 'normal' | 'assigned' = 'normal',
  assignedKts = 250,
) {
  const procedure = newYork.departures.find((d) => d.airport === airport && d.id === sid)!;
  const transition = procedure.runwayTransitions.find((t) => t.runways?.includes(runway))!;
  const legs: ResolvedLeg[] = resolveLegs(newYork, airport, [
    ...transition.legs,
    ...procedure.commonRoutes.flatMap((route) => route.legs),
    ...(procedure.enrouteTransitions[0]?.legs ?? []),
  ]);
  const rwy = newYork.runway(airport, runway);
  const position = destinationPoint(rwy.threshold, rwy.magneticHeadingDeg + variation, 1.5);
  const aircraft = {
    id: 'D1',
    callsign: 'DAL2',
    aircraftType: 'A320',
    squawk: '1234',
    flightPlan: { origin: airport, destination: 'KATL', route: [sid] },
    phase: 'departure',
    owner: 'N90',
    position,
    altitudeFt: 1_000,
    headingDeg: rwy.magneticHeadingDeg,
    iasKts: 170,
    verticalSpeedFpm: 0,
    targets: {
      altitudeFt: 7_000,
      headingDeg: rwy.magneticHeadingDeg,
      turnDirection: 'shortest',
      iasKts: assignedKts,
      speedMode,
    },
    navigation: { mode: 'procedure', name: sid, legs, legIndex: 0, legStart: position },
  } as AircraftState;
  return {
    aircraft,
    limits: new Map(
      legs.filter((l) => l.fix && l.speedLimitKts).map((l) => [l.fix!, l.speedLimitKts!]),
    ),
  };
}

function fly(aircraft: AircraftState) {
  const crossed = new Map<string, number>();
  const a320 = performance.get('A320');
  for (let t = 0; t < 1_800 && aircraft.navigation.mode === 'procedure'; t++) {
    const result = updateNavigation(aircraft, a320, variation, config);
    if (result.fixPassed) crossed.set(result.fixPassed, aircraft.iasKts);
    stepAircraft(aircraft, a320, 1, variation, config);
  }
  return crossed;
}

describe('SID speed restrictions', () => {
  it.each([
    ['KLGA', 'GLDMN8', '13'],
    ['KLGA', 'TNNIS6', '13'],
    ['KLGA', 'NTHNS6', '13'],
    ['KLGA', 'JUTES4', '22'],
    ['KJFK', 'SKORR6', '31L'],
  ])('%s %s: crosses every restricted fix at or below its speed', (airport, sid, runway) => {
    const { aircraft, limits } = departing(airport, sid, runway);
    expect(limits.size).toBeGreaterThan(0);
    const crossed = fly(aircraft);
    expect([...limits.keys()].some((fix) => crossed.has(fix))).toBe(true);
    for (const [fix, limit] of limits) {
      const ias = crossed.get(fix);
      if (ias === undefined) continue;
      expect(ias, `${sid} ${fix} limit ${limit}`).toBeLessThanOrEqual(limit + 2);
    }
    // Then back to its normal climb speed (it wasn't left on an assigned speed).
    expect(aircraft.targets.speedMode).toBe('normal');
  });

  it('lets an assigned speed override the published one', () => {
    const { aircraft, limits } = departing('KLGA', 'GLDMN8', '13', 'assigned', 250);
    const crossed = fly(aircraft);
    const [fix] = [...limits.keys()];
    expect(crossed.get(fix!)).toBeGreaterThan(240);
  });
});
