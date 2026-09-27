import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { headingDifference } from '../math/angles';
import { isHemisphericLevel } from '../traffic/cruise-levels';
import { bearingTrue, distanceNm, type LatLon } from '../math/geo';
import { airlines, newYork, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { parseSnapshot } from '../snapshot/snapshot';
import { SimEngine } from './sim-engine';

function createEngine(overrides: Partial<SessionSettings> = {}, seed = 5) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      ...overrides,
    },
    airspace: newYork,
    airlines,
  });
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

const countTransits = (engine: SimEngine, seconds: number) => {
  let entered = 0;
  const unsubscribe = engine.subscribe((event) => event.type === 'transitEntered' && entered++);
  run(engine, seconds);
  unsubscribe();
  return entered;
};

describe('transits', () => {
  it('cross the airspace at altitude, direct to an exit fix on the far side', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 12 });
    const entered: Extract<SimEvent, { type: 'transitEntered' }>[] = [];
    const navigation: unknown[] = [];
    const entries: LatLon[] = [];
    const headings: number[] = [];
    engine.subscribe((event) => {
      if (event.type !== 'transitEntered') return;
      entered.push(event);
      const transit = engine.getAircraft(event.aircraftId)!;
      navigation.push(transit.navigation);
      headings.push(transit.headingDeg);
      entries.push(transit.position);
    });
    run(engine, 1_800);

    expect(entered.length).toBeGreaterThan(2);
    const { center } = newYork.airspace;
    entered.forEach((event, i) =>
      expect(navigation[i]).toMatchObject({ mode: 'direct', fix: event.exitFix }),
    );
    for (const [i, event] of entered.entries()) {
      const transit = engine.getAircraft(event.aircraftId);
      if (transit) expect(isHemisphericLevel(transit.altitudeFt, headings[i]!)).toBe(true);
    }
    for (const event of entered) {
      const transit = engine.getAircraft(event.aircraftId);
      if (!transit) continue;
      expect(transit.phase).toBe('enroute');
      expect(transit.owner).toBe('N90');
      // At the level they filed, which suits the direction they cross in.
      expect(transit.altitudeFt).toBeGreaterThanOrEqual(16_000);
      expect(transit.altitudeFt).toBeLessThanOrEqual(41_000);
      expect(transit.flightPlan.requestedAltitudeFt).toBe(transit.altitudeFt);
      expect(newYork.airspace.airports).not.toContain(transit.flightPlan.destination);
      expect(transit.flightPlan.route).toEqual([event.exitFix]);
    }
    const first = { position: entries[0]! };
    const exit = newYork.fix(entered[0]!.exitFix)!;
    // It entered on the opposite side from its exit.
    const turn = headingDifference(
      bearingTrue(center, first.position),
      bearingTrue(center, exit.position),
    );
    expect(Math.abs(turn)).toBeGreaterThan(90);
    expect(distanceNm(center, first.position)).toBeLessThan(newYork.boundaryRadiusNm);
    // Transits check in at their cruising level.
    expect(engine.comms.some((c) => /^New York Center, .*, flight level/.test(c.text))).toBe(true);
  });

  it('follows the transit rate setting', () => {
    expect(countTransits(createEngine({ 'traffic.transitRatePerHour': 0 }), 3_600)).toBe(0);
    expect(countTransits(createEngine({ 'traffic.transitRatePerHour': 3 }), 3_600)).toBeLessThan(
      countTransits(createEngine({ 'traffic.transitRatePerHour': 15 }), 3_600),
    );
  });
});

describe('in-session traffic tuning', () => {
  it('changes rates mid-session and reschedules the next spawn', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 0 });
    expect(countTransits(engine, 1_800)).toBe(0);
    expect(engine.updateTrafficSettings({ 'traffic.transitRatePerHour': 20 })).toEqual({
      ok: true,
    });
    expect(engine.settings['traffic.transitRatePerHour']).toBe(20);
    expect(countTransits(engine, 1_800)).toBeGreaterThan(3);
  });

  it('turns arrivals and departures on and off', () => {
    const engine = createEngine();
    let arrivals = 0;
    engine.subscribe((event) => event.type === 'arrivalEntered' && arrivals++);
    run(engine, 1_200);
    expect(arrivals).toBe(0);
    engine.updateTrafficSettings({
      'traffic.arrivalRatePerHour': 20,
      'traffic.maxDepartureQueue': 2,
    });
    run(engine, 1_800);
    expect(arrivals).toBeGreaterThan(3);
    expect(engine.settings['traffic.maxDepartureQueue']).toBe(2);
  });

  it('rejects settings that cannot change in a session, and out-of-range values', () => {
    const engine = createEngine();
    const before = { ...engine.settings };
    expect(engine.updateTrafficSettings({ 'weather.windMode': 'manual' } as never)).toMatchObject({
      ok: false,
    });
    expect(engine.updateTrafficSettings({ 'traffic.arrivalRatePerHour': 500 })).toMatchObject({
      ok: false,
    });
    expect(engine.settings).toEqual(before);
  });

  it('keeps tuned rates in the snapshot', () => {
    const engine = createEngine();
    engine.updateTrafficSettings({ 'traffic.transitRatePerHour': 9 });
    const restored = SimEngine.fromSnapshot(engine.toSnapshot(), performance, {
      airspace: newYork,
      airlines,
    });
    expect(restored.settings['traffic.transitRatePerHour']).toBe(9);
    run(engine, 900);
    run(restored, 900);
    expect(restored.toSnapshot()).toEqual(engine.toSnapshot());
  });
});

describe('traffic rates of zero', () => {
  it('keep the session savable (no out-of-range spawn times) and resume when raised', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 5 });
    run(engine, 60);
    engine.updateTrafficSettings({
      'traffic.transitRatePerHour': 0,
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
    });
    run(engine, 600);
    const snapshot = JSON.parse(JSON.stringify(engine.toSnapshot()));
    expect(() => parseSnapshot(snapshot)).not.toThrow();
    engine.updateTrafficSettings({ 'traffic.transitRatePerHour': 20 });
    expect(countTransits(engine, 1_800)).toBeGreaterThan(3);
  });
});

describe('flying the route', () => {
  it('sends an overflight on toward its destination once past its exit fix', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 20 });
    let checked = false;
    engine.subscribe((event) => {
      if (event.type !== 'fixPassed' || checked) return;
      const transit = engine.getAircraft(event.aircraftId);
      if (!transit || transit.flightPlan.route[0] !== event.fix) return;
      checked = true;
    });
    for (let t = 0; t < 3_600 && !checked; t++) engine.step();
    expect(checked).toBe(true);
    const flown = engine
      .listAircraft()
      .filter((a) => engine.routeFlown(a.id) && a.navigation.mode === 'direct');
    expect(flown.length).toBeGreaterThan(0);
    for (const a of flown) {
      expect(a.navigation).toMatchObject({ mode: 'direct', fix: a.flightPlan.destination });
    }
  });
});

describe('wind over a session', () => {
  it('drifts slightly around the starting wind, and resumes exactly from a save', () => {
    const engine = createEngine({ 'weather.windVariation': 'slight' }, 11);
    const start = { ...engine.winds };
    const seen = new Set<string>();
    let changes = 0;
    engine.subscribe((event) => event.type === 'windChanged' && changes++);
    for (let minute = 0; minute < 120; minute++) {
      run(engine, 60);
      seen.add(JSON.stringify(engine.winds));
      for (const [airport, wind] of Object.entries(engine.winds)) {
        const base = start[airport]!;
        expect(Math.abs(wind.speedKts - base.speedKts)).toBeLessThanOrEqual(4);
      }
    }
    expect(changes).toBeGreaterThan(3);
    expect(seen.size).toBeGreaterThan(3);
    expect(engine.regionalWind).toBeDefined();

    const restored = SimEngine.fromSnapshot(
      JSON.parse(JSON.stringify(engine.toSnapshot())),
      performance,
      { airspace: newYork, airlines },
    );
    run(engine, 1_800);
    run(restored, 1_800);
    expect(restored.winds).toEqual(engine.winds);
  });

  it('stays steady when variation is off', () => {
    const engine = createEngine({ 'weather.windVariation': 'off' }, 11);
    const start = JSON.stringify(engine.winds);
    run(engine, 3_600);
    expect(JSON.stringify(engine.winds)).toBe(start);
  });
});
