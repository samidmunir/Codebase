import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { NewAircraft } from '../aircraft/aircraft';
import { destinationPoint } from '../math/geo';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

function createEngine(overrides: Partial<SessionSettings> = {}) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed: 3,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'pilots.responseDelaySec': [1, 1],
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      'traffic.transitRatePerHour': 0,
      'center.automation': false,
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
const at = (bearing: number, nm: number) => destinationPoint(center, bearing, nm);

function yours(overrides: Partial<NewAircraft>): NewAircraft {
  return {
    callsign: 'DAL100',
    aircraftType: 'B738',
    squawk: '4312',
    flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [], requestedAltitudeFt: 30_000 },
    phase: 'enroute',
    owner: 'N90',
    position: at(45, 100),
    altitudeFt: 20_000,
    headingDeg: 40,
    iasKts: 280,
    ...overrides,
  } as NewAircraft;
}

const handoff = (engine: SimEngine, id: string) =>
  engine.issueInstruction(id, [
    { type: 'handoff', to: 'ZBW', facility: 'Boston Center', frequencyMhz: 133.45 },
  ]);

describe('RP scoring', () => {
  it('rewards departure handoffs, with a bonus when cleared to the requested level', () => {
    const engine = createEngine();
    const climbing = engine.addAircraft(yours({ targets: { altitudeFt: 30_000 } }));
    const low = engine.addAircraft(yours({ callsign: 'DAL200', position: at(40, 100) }));
    handoff(engine, climbing.id);
    handoff(engine, low.id);
    run(engine, 5);
    const events = engine.score.events;
    expect(events.map((e) => [e.callsigns[0], e.kind, e.rp])).toEqual([
      ['DAL100', 'departureHandoff', 100],
      ['DAL200', 'departureHandoff', 60],
    ]);
    expect(events[0]!.detail).toBe('handed to Boston Center, cleared to requested FL300');
  });

  it('rewards overflight handoffs', () => {
    const engine = createEngine();
    const transit = engine.addAircraft(
      yours({
        flightPlan: { origin: 'KORD', destination: 'KBOS', route: [], requestedAltitudeFt: 34_000 },
        altitudeFt: 34_000,
      }),
    );
    handoff(engine, transit.id);
    run(engine, 5);
    expect(engine.score.tally.transitHandoff).toEqual({ count: 1, rp: 90 });
  });

  it('takes RP for an aircraft that leaves without a handoff, but not for one handed off', () => {
    const engine = createEngine();
    engine.addAircraft(yours({ position: at(0, 158), headingDeg: 360 - variation }));
    const handedOff = engine.addAircraft(
      yours({ callsign: 'DAL300', position: at(5, 158), headingDeg: 5 - variation }),
    );
    handoff(engine, handedOff.id);
    run(engine, 90);
    expect(engine.listAircraft()).toHaveLength(0);
    expect(engine.score.tally.leftWithoutHandoff).toEqual({ count: 1, rp: -100 });
    expect(engine.score.events.find((e) => e.kind === 'leftWithoutHandoff')!.callsigns).toEqual([
      'DAL100',
    ]);
  });

  it('only penalizes losses of separation closer than 5 NM, more the closer they get', () => {
    // With an 8 NM en route minimum, a 6 NM pass is a loss of separation but costs nothing.
    const engine = createEngine({ 'separation.enrouteLateralNm': 8 });
    const start = at(270, 100);
    engine.addAircraft(
      yours({
        callsign: 'AAL1',
        position: start,
        headingDeg: 0 - variation,
        altitudeFt: 30_000,
        iasKts: 250,
      }),
    );
    engine.addAircraft(
      yours({
        callsign: 'AAL2',
        position: destinationPoint(start, 90, 6),
        headingDeg: 0 - variation,
        altitudeFt: 30_000,
        iasKts: 250,
      }),
    );
    run(engine, 5);
    expect(engine.violations).toHaveLength(1);
    // End it by separating them vertically.
    engine.setTargets(engine.listAircraft()[1]!.id, { altitudeFt: 32_000 });
    run(engine, 120);
    expect(engine.violations[0]!.endTick).toBeDefined();
    expect(engine.score.tally.separationLoss).toBeUndefined();

    // A 2.5 NM loss costs 150 × 1.5.
    const close = createEngine();
    close.addAircraft(
      yours({
        callsign: 'AAL3',
        position: start,
        headingDeg: 0 - variation,
        altitudeFt: 30_000,
        iasKts: 250,
      }),
    );
    const b = close.addAircraft(
      yours({
        callsign: 'AAL4',
        position: destinationPoint(start, 90, 2.5),
        headingDeg: 0 - variation,
        altitudeFt: 30_000,
        iasKts: 250,
      }),
    );
    run(close, 5);
    close.setTargets(b.id, { altitudeFt: 32_000 });
    run(close, 120);
    expect(close.score.tally.separationLoss).toEqual({ count: 1, rp: -225 });
    expect(close.score.events.at(-1)!.detail).toBe('loss of separation, 2.5 NM, 0 ft');
  });

  it('scores a near midair collision once, instead of the loss of separation', () => {
    const engine = createEngine();
    const start = at(270, 100);
    engine.addAircraft(
      yours({ callsign: 'AAL5', position: start, headingDeg: 90 - variation, altitudeFt: 30_000 }),
    );
    engine.addAircraft(
      yours({
        callsign: 'AAL6',
        position: destinationPoint(start, 90, 8),
        headingDeg: 270 - variation,
        altitudeFt: 30_200,
      }),
    );
    run(engine, 200);
    expect(engine.score.tally.nearMidAir).toEqual({ count: 1, rp: -1000 });
    expect(engine.score.tally.separationLoss).toBeUndefined();
  });

  it('keeps the score in snapshots', () => {
    const engine = createEngine();
    const a = engine.addAircraft(yours({}));
    handoff(engine, a.id);
    run(engine, 5);
    const restored = SimEngine.fromSnapshot(engine.toSnapshot(), performance, {
      airspace: newYork,
      airlines,
    });
    expect(restored.score).toEqual(engine.score);
  });
});
