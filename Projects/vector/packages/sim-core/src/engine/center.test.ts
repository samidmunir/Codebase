import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { NewAircraft } from '../aircraft/aircraft';
import { destinationPoint, distanceNm } from '../math/geo';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

function createEngine(overrides: Partial<SessionSettings> = {}) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed: 8,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      'traffic.transitRatePerHour': 0,
      ...overrides,
    },
    airspace: newYork,
    airlines,
  });
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

const { center } = newYork.airspace;
const variation = newYork.airspace.magneticVariationDeg;
/** A point `nm` from the airspace center on a true bearing. */
const at = (bearing: number, nm: number) => destinationPoint(center, bearing, nm);

function centerAircraft(overrides: Partial<NewAircraft>): NewAircraft {
  return {
    callsign: 'DAL100',
    aircraftType: 'B738',
    squawk: '4312',
    flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [], requestedAltitudeFt: 34_000 },
    phase: 'enroute',
    owner: 'ZNY',
    position: at(45, 60),
    altitudeFt: 12_000,
    headingDeg: 60,
    iasKts: 250,
    ...overrides,
  } as NewAircraft;
}

describe('Center automation', () => {
  it('climbs handed-off traffic to its requested level and routes it toward its destination', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(
      centerAircraft({
        flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [], requestedAltitudeFt: 30_000 },
        targets: { speedMode: 'assigned', iasKts: 210 },
      }),
    );
    run(engine, 10);
    const flown = engine.getAircraft(aircraft.id)!;
    expect(flown.targets.altitudeFt).toBe(30_000);
    expect(flown.targets.speedMode).toBe('normal');
    expect(flown.navigation).toMatchObject({ mode: 'direct', fix: 'KBOS' });
  });

  it('follows the rest of the flight plan first', () => {
    const engine = createEngine();
    const merit = newYork.fix('MERIT')!;
    const aircraft = engine.addAircraft(
      centerAircraft({
        position: destinationPoint(merit.position, 230, 20),
        flightPlan: {
          origin: 'KJFK',
          destination: 'KBOS',
          route: ['MERIT'],
          requestedAltitudeFt: 28_000,
        },
      }),
    );
    run(engine, 10);
    expect(engine.getAircraft(aircraft.id)!.navigation).toMatchObject({
      mode: 'direct',
      fix: 'MERIT',
    });
  });

  it('leaves aircraft alone when automation is off', () => {
    const engine = createEngine({ 'center.automation': false });
    const aircraft = engine.addAircraft(centerAircraft({}));
    run(engine, 30);
    const flown = engine.getAircraft(aircraft.id)!;
    expect(flown.targets.altitudeFt).toBe(12_000);
    expect(flown.navigation.mode).toBe('heading');
  });

  it('keeps two of its aircraft apart when they would meet at the same level', () => {
    const engine = createEngine();
    // Head-on at FL300, 40 NM apart, both already at their requested level.
    const east = at(270, 60);
    const west = destinationPoint(east, 90, 40);
    const a = engine.addAircraft(
      centerAircraft({
        callsign: 'AAL1',
        position: east,
        headingDeg: 90 - variation,
        altitudeFt: 30_000,
        flightPlan: { origin: 'KORD', destination: 'KJFK', route: [], requestedAltitudeFt: 30_000 },
        phase: 'enroute',
      }),
    );
    const b = engine.addAircraft(
      centerAircraft({
        callsign: 'UAL2',
        position: west,
        headingDeg: 270 - variation,
        altitudeFt: 30_000,
        flightPlan: { origin: 'KBOS', destination: 'KORD', route: [], requestedAltitudeFt: 30_000 },
      }),
    );
    // Keep both on their headings: this checks the level-change resolution alone.
    let closest = { lateralNm: Infinity, verticalFt: 0 };
    for (let t = 0; t < 360; t++) {
      engine.step();
      const pa = engine.getAircraft(a.id);
      const pb = engine.getAircraft(b.id);
      if (!pa || !pb) break;
      const lateral = distanceNm(pa.position, pb.position);
      if (lateral < closest.lateralNm)
        closest = { lateralNm: lateral, verticalFt: Math.abs(pa.altitudeFt - pb.altitudeFt) };
    }
    expect(closest.lateralNm).toBeLessThan(5);
    expect(closest.verticalFt).toBeGreaterThanOrEqual(1_000);
  });

  it('stops a climbing aircraft below level traffic ahead, then lets it continue', () => {
    const engine = createEngine();
    const start = at(200, 70);
    const climber = engine.addAircraft(
      centerAircraft({
        callsign: 'JBU3',
        position: start,
        headingDeg: 90 - variation,
        altitudeFt: 24_000,
        flightPlan: { origin: 'KJFK', destination: 'KMIA', route: [], requestedAltitudeFt: 35_000 },
      }),
    );
    const level = engine.addAircraft(
      centerAircraft({
        callsign: 'DAL4',
        position: destinationPoint(start, 90, 18),
        headingDeg: 270 - variation,
        altitudeFt: 28_000,
        flightPlan: { origin: 'KMIA', destination: 'KBOS', route: [], requestedAltitudeFt: 28_000 },
      }),
    );
    run(engine, 10);
    expect(engine.centerResolutions[climber.id]).toMatchObject({
      altitudeFt: 27_000,
      otherId: level.id,
    });
    expect(engine.getAircraft(climber.id)!.targets.altitudeFt).toBe(27_000);
    // Once they have passed, the climb resumes to the requested level.
    run(engine, 300);
    expect(engine.centerResolutions[climber.id]).toBeUndefined();
    expect(engine.getAircraft(climber.id)!.targets.altitudeFt).toBe(35_000);
  });

  it('resumes exactly from a snapshot', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 20 });
    engine.addAircraft(centerAircraft({ position: at(200, 70), headingDeg: 77 }));
    run(engine, 200);
    const restored = SimEngine.fromSnapshot(engine.toSnapshot(), performance, {
      airspace: newYork,
      airlines,
    });
    run(engine, 300);
    run(restored, 300);
    expect(restored.toSnapshot()).toEqual(engine.toSnapshot());
  });
});
