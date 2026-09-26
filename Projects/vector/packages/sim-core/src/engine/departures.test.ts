import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../random/seeded-random';
import { departureProcedure } from '../traffic/departure-procedure';
import { initialOperations, newDepartureEntry } from '../traffic/operations';
import { windComponents } from '../weather/wind';
import { airlines, newYork, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

function createEngine(overrides: Partial<SessionSettings> = {}, seed = 21) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: { ...defaultSettings('session'), 'pilots.responseDelaySec': [2, 2], ...overrides },
    airspace: newYork,
    airlines,
  });
}

const OPERATIONS_SETTINGS = {
  windMode: 'random' as const,
  manualWind: { directionDeg: 310, speedKts: 12 },
  maxTailwindKts: 5,
  maxCrosswindKts: 20,
  departureRatePerHour: 10,
  maxDepartureQueue: 5,
};

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

describe('wind and runways', () => {
  it('picks runways for each airport that suit its wind', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const engine = createEngine({}, seed);
      for (const icao of newYork.airspace.airports) {
        const wind = engine.winds[icao]!;
        const { arrivals, departures } = engine.activeRunways[icao]!;
        for (const id of [...arrivals, ...departures]) {
          const { headwindKts } = windComponents(wind, newYork.runway(icao, id).magneticHeadingDeg);
          // Within the tailwind limit, or a config that avoids tailwinds when nothing else fits.
          expect(headwindKts).toBeGreaterThanOrEqual(-5.01);
        }
      }
    }
  });

  it('uses the manual wind when set', () => {
    const engine = createEngine({
      'weather.windMode': 'manual',
      'weather.manualWindDirectionDeg': 310,
      'weather.manualWindSpeedKts': 18,
    });
    expect(engine.winds.KJFK).toEqual({ directionDeg: 310, speedKts: 18 });
    expect(engine.activeRunways.KJFK).toMatchObject({ arrivals: ['31R'], departures: ['31L'] });
  });
});

describe('departure queue', () => {
  it('starts with departures waiting at each airport', () => {
    const engine = createEngine();
    for (const icao of newYork.airspace.airports) {
      expect(engine.departureQueue.filter((d) => d.airport === icao)).toHaveLength(2);
    }
    const callsigns = engine.departureQueue.map((d) => d.callsign);
    expect(new Set(callsigns).size).toBe(callsigns.length);
  });

  it('never sends widebodies from LaGuardia', () => {
    const engine = createEngine({
      'traffic.departureRatePerHour': 40,
      'traffic.maxDepartureQueue': 20,
    });
    run(engine, 3_600);
    const lga = engine.departureQueue.filter((d) => d.airport === 'KLGA');
    expect(lga.length).toBeGreaterThan(5);
    expect(lga.some((d) => ['B77W', 'B789', 'B763', 'A333'].includes(d.aircraftType))).toBe(false);
  });

  it('only sends airlines to destinations they serve', () => {
    const random = new SeededRandom(3);
    const operations = initialOperations(newYork, random, OPERATIONS_SETTINGS, 0);
    const context = {
      pack: newYork,
      airlines: new Map(airlines.map((airline) => [airline.icao, airline])),
      random,
      callsignsInUse: new Set<string>(),
      hasPerformance: (type: string) => performance.has(type),
    };
    const entries = Array.from({ length: 500 }, () =>
      newDepartureEntry(context, operations, 'KJFK', 0),
    );
    const speedbird = entries.filter((d) => d.callsign.startsWith('BAW'));
    expect(speedbird.length).toBeGreaterThan(10);
    expect(speedbird.every((d) => d.destination === 'EGLL')).toBe(true);
  });

  it('holds departures at the gate when the queue is full, and releases them as it empties', () => {
    const engine = createEngine({
      'traffic.departureRatePerHour': 40,
      'traffic.maxDepartureQueue': 2,
    });
    run(engine, 900);
    expect(engine.departureQueue.filter((d) => d.airport === 'KJFK')).toHaveLength(2);
    const held = engine.gateHolds('KJFK');
    expect(held).toBeGreaterThan(0);

    const [first] = engine.departureQueue.filter((d) => d.airport === 'KJFK');
    const runway = engine.activeRunways.KJFK!.departures[0]!;
    engine.releaseDeparture(first!.id, runway);
    run(engine, 120);
    expect(engine.gateHolds('KJFK')).toBeLessThan(held + 1);
    expect(engine.departureQueue.filter((d) => d.airport === 'KJFK')).toHaveLength(2);
  });
});

describe('releasing departures', () => {
  it('only releases onto active departure runways', () => {
    const engine = createEngine({
      'weather.windMode': 'manual',
      'weather.manualWindDirectionDeg': 220,
    });
    const entry = engine.departureQueue.find((d) => d.airport === 'KJFK')!;
    expect(engine.releaseDeparture(entry.id, '04L')).toEqual({
      ok: false,
      reason: 'Runway 04L is not in use for departures',
    });
    expect(engine.releaseDeparture(entry.id, '22R')).toEqual({ ok: true });
    expect(engine.releaseDeparture(entry.id, '22R').ok).toBe(false);
  });

  it('clears for takeoff, takes off under Tower, and hands off to the player at radar contact', () => {
    const engine = createEngine({
      'weather.windMode': 'manual',
      'weather.manualWindDirectionDeg': 220,
    });
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const entry = engine.departureQueue.find((d) => d.airport === 'KJFK')!;

    engine.releaseDeparture(entry.id, '22R');
    expect(engine.comms.at(-1)).toMatchObject({
      speaker: 'controller',
      facility: 'JFK TWR',
      callsign: entry.callsign,
    });
    expect(engine.comms.at(-1)!.text).toMatch(
      /Kennedy Tower, runway two two right, cleared for takeoff\.$/,
    );
    run(engine, 2);
    expect(engine.comms.at(-1)!.text).toMatch(/^Cleared for takeoff runway two two right/);

    // Step to the moment of takeoff.
    for (let i = 0; i < 120 && !events.some((e) => e.type === 'tookOff'); i++) engine.step();
    const tookOff = events.find((e) => e.type === 'tookOff');
    expect(tookOff).toMatchObject({ airport: 'KJFK', runway: '22R' });
    const aircraft = engine.listAircraft().find((a) => a.callsign === entry.callsign)!;
    expect(aircraft).toMatchObject({ owner: 'KJFK_TWR', phase: 'departure' });
    expect(aircraft.navigation.mode).toBe('procedure');
    expect(engine.departureQueue.some((d) => d.id === entry.id)).toBe(false);

    run(engine, 90);
    const climbing = engine.getAircraft(aircraft.id)!;
    expect(climbing.altitudeFt).toBeGreaterThan(1_500);
    expect(climbing.owner).toBe('N90');
    expect(events).toContainEqual({
      type: 'ownerChanged',
      aircraftId: aircraft.id,
      from: 'KJFK_TWR',
      to: 'N90',
    });
    expect(
      engine.comms.some(
        (c) => c.aircraftId === aircraft.id && c.text.startsWith('New York Departure,'),
      ),
    ).toBe(true);
  });

  it('spaces takeoffs on the same runway', () => {
    const engine = createEngine({
      'weather.windMode': 'manual',
      'weather.manualWindDirectionDeg': 220,
    });
    const takeoffs: number[] = [];
    engine.subscribe(
      (event, tick) => event.type === 'tookOff' && event.airport === 'KJFK' && takeoffs.push(tick),
    );
    for (const entry of engine.departureQueue.filter((d) => d.airport === 'KJFK')) {
      engine.releaseDeparture(entry.id, '22R');
    }
    run(engine, 300);
    expect(takeoffs).toHaveLength(2);
    expect(takeoffs[1]! - takeoffs[0]!).toBeGreaterThanOrEqual(60);
  });
});

describe('departure procedures', () => {
  it('flies a coded SID when one leaves toward the gate', () => {
    const procedure = departureProcedure(newYork, 'KLGA', '13', 'MERIT');
    expect(procedure.sid).toBeDefined();
    expect(procedure.legs[0]!.pathTerminator).toBe('VI');
  });

  it('flies runway heading where no coded SID serves the runway', () => {
    const procedure = departureProcedure(newYork, 'KJFK', '22R', 'WHITE');
    expect(procedure).toMatchObject({ name: 'Runway heading', sid: undefined });
    expect(procedure.legs.map((leg) => leg.pathTerminator)).toEqual(['VA', 'VM']);
  });

  it('flies the SID fixes after takeoff', () => {
    const engine = createEngine({
      'weather.windMode': 'manual',
      'weather.manualWindDirectionDeg': 130,
    });
    expect(engine.activeRunways.KLGA!.departures).toContain('13');
    const passed: string[] = [];
    engine.subscribe((event) => event.type === 'fixPassed' && passed.push(event.fix));
    const entry = engine.departureQueue.find((d) => d.airport === 'KLGA')!;
    engine.releaseDeparture(entry.id, '13');
    run(engine, 600);
    const route = departureProcedure(newYork, 'KLGA', '13', entry.gateFix);
    if (route.sid) expect(passed.length).toBeGreaterThan(0);
  });
});

describe('leaving the airspace', () => {
  it('removes aircraft handed to Center once they are past the boundary', () => {
    const engine = createEngine({ 'traffic.departureRatePerHour': 0 });
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const aircraft = engine.addAircraft({
      callsign: 'JBU99',
      aircraftType: 'A320',
      squawk: '1234',
      flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [] },
      phase: 'enroute',
      owner: 'ZNY',
      position: { lat: newYork.airspace.center.lat + 0.8, lon: newYork.airspace.center.lon },
      altitudeFt: 12_000,
      headingDeg: 360,
      iasKts: 250,
    });
    run(engine, 5);
    expect(engine.getAircraft(aircraft.id)).toBeUndefined();
    expect(events).toContainEqual({
      type: 'leftAirspace',
      aircraftId: aircraft.id,
      callsign: 'JBU99',
      handedOff: true,
    });
  });
});

describe('snapshots with operations', () => {
  it('resumes queues, releases and takeoffs exactly', () => {
    const scenario = (engine: SimEngine) => {
      const entry = engine.departureQueue[0]!;
      engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
    };
    const continuous = createEngine();
    scenario(continuous);
    run(continuous, 400);

    const first = createEngine();
    scenario(first);
    run(first, 30);
    const saved = JSON.parse(JSON.stringify(first.toSnapshot())) as unknown;
    const resumed = SimEngine.fromSnapshot(saved, performance, { airspace: newYork, airlines });
    run(resumed, 370);

    expect(resumed.toSnapshot()).toEqual(continuous.toSnapshot());
  });
});
