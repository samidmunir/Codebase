import { applyDifficulty, defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { NEW_YORK_WORLD, newAircraft, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

function createEngine() {
  return SimEngine.create({
    performance,
    world: NEW_YORK_WORLD,
    seed: 2026,
    startTimeUtc: '2026-09-26T14:00:00Z',
  });
}

describe('SimEngine clock', () => {
  it('runs one tick per real second at 1x', () => {
    const engine = createEngine();
    expect(engine.advance(1_000)).toBe(1);
    expect(engine.tick).toBe(1);
  });

  it('accumulates partial frames', () => {
    const engine = createEngine();
    expect(engine.advance(16)).toBe(0);
    for (let i = 0; i < 62; i++) engine.advance(16);
    expect(engine.tick).toBe(1);
  });

  it('multiplies ticks by sim speed', () => {
    const engine = createEngine();
    engine.setSpeed(4);
    expect(engine.advance(1_000)).toBe(4);
  });

  it('does not advance while paused', () => {
    const engine = createEngine();
    engine.pause();
    expect(engine.advance(5_000)).toBe(0);
    engine.resume();
    expect(engine.advance(1_000)).toBe(1);
  });

  it('caps ticks after a long stall and drops the backlog', () => {
    const engine = createEngine();
    expect(engine.advance(60_000)).toBe(engine.config.maxTicksPerAdvance);
    expect(engine.advance(1_000)).toBeLessThanOrEqual(2);
  });

  it('reports a smooth display time between ticks', () => {
    const engine = createEngine();
    engine.advance(1_250);
    expect(engine.simTimeSec).toBe(1);
    expect(engine.displayTimeSec).toBeCloseTo(1.25);
    engine.pause();
    expect(engine.displayTimeSec).toBe(1);
  });

  it('reports UTC time from the start time plus sim time', () => {
    const engine = createEngine();
    for (let i = 0; i < 90; i++) engine.step();
    expect(engine.utcTime.toISOString()).toBe('2026-09-26T14:01:30.000Z');
  });

  it('rejects a non-positive speed', () => {
    expect(() => createEngine().setSpeed(0)).toThrow();
  });
});

describe('SimEngine aircraft', () => {
  it('assigns ids and defaults targets to steady flight', () => {
    const engine = createEngine();
    const first = engine.addAircraft(newAircraft());
    const second = engine.addAircraft(newAircraft({ callsign: 'DAL412' }));

    expect([first.id, second.id]).toEqual(['AC1', 'AC2']);
    expect(first.targets).toEqual({
      altitudeFt: 5_000,
      headingDeg: 0,
      turnDirection: 'shortest',
      iasKts: 220,
    });
  });

  it('rejects unknown aircraft types and invalid squawks', () => {
    const engine = createEngine();
    expect(() => engine.addAircraft(newAircraft({ aircraftType: 'C172' }))).toThrow(/C172/);
    expect(() => engine.addAircraft(newAircraft({ squawk: '8888' }))).toThrow();
  });

  it('removes aircraft', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft());
    engine.removeAircraft(aircraft.id);
    expect(engine.listAircraft()).toHaveLength(0);
    expect(() => engine.removeAircraft(aircraft.id)).toThrow();
  });

  it('flies toward new targets', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft({ headingDeg: 0 }));
    engine.setTargets(aircraft.id, { headingDeg: 90, altitudeFt: 7_000 });
    for (let i = 0; i < 300; i++) engine.step();

    expect(engine.getAircraft(aircraft.id)).toMatchObject({ headingDeg: 90, altitudeFt: 7_000 });
  });

  it('emits events as aircraft reach their targets', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));

    const aircraft = engine.addAircraft(newAircraft());
    engine.setTargets(aircraft.id, { altitudeFt: 6_000, headingDeg: 45, iasKts: 250 });
    for (let i = 0; i < 300; i++) engine.step();
    engine.removeAircraft(aircraft.id);

    const types = events.map((event) => event.type);
    expect(types[0]).toBe('aircraftAdded');
    expect(types.at(-1)).toBe('aircraftRemoved');
    // Heading, speed and altitude complete independently, each exactly once.
    expect(types.slice(1, -1).sort()).toEqual([
      'altitudeReached',
      'headingReached',
      'speedReached',
    ]);
  });

  it('transfers ownership and changes phase', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft({ owner: 'KJFK_TWR', phase: 'departure' }));
    engine.setOwner(aircraft.id, 'N90');
    engine.setPhase(aircraft.id, 'enroute');
    expect(engine.getAircraft(aircraft.id)).toMatchObject({ owner: 'N90', phase: 'enroute' });
    expect(() => engine.setOwner('AC99', 'N90')).toThrow(/AC99/);
  });

  it('stops notifying after unsubscribe', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    const unsubscribe = engine.subscribe((event) => events.push(event));
    unsubscribe();
    engine.addAircraft(newAircraft());
    expect(events).toHaveLength(0);
  });
});

describe('SimEngine snapshots', () => {
  function populate(engine: SimEngine) {
    const departure = engine.addAircraft(newAircraft({ altitudeFt: 2_000, iasKts: 200 }));
    engine.setTargets(departure.id, { altitudeFt: 14_000, headingDeg: 90, iasKts: 300 });

    const arrival = engine.addAircraft(
      newAircraft({ callsign: 'DAL412', aircraftType: 'B739', altitudeFt: 12_000, iasKts: 280 }),
    );
    engine.setTargets(arrival.id, {
      altitudeFt: 4_000,
      headingDeg: 200,
      turnDirection: 'left',
      iasKts: 210,
    });

    const heavy = engine.addAircraft(
      newAircraft({ callsign: 'BAW117', aircraftType: 'B77W', altitudeFt: 8_000, headingDeg: 300 }),
    );
    engine.setTargets(heavy.id, { headingDeg: 40, iasKts: 180 });
  }

  it('resumes exactly as an uninterrupted run would have continued', () => {
    const continuous = createEngine();
    populate(continuous);
    for (let i = 0; i < 600; i++) {
      continuous.step();
      if (i % 50 === 0) continuous.random.next();
    }

    const firstHalf = createEngine();
    populate(firstHalf);
    for (let i = 0; i < 300; i++) {
      firstHalf.step();
      if (i % 50 === 0) firstHalf.random.next();
    }
    // Round-trip through JSON text, as a save to the server would.
    const saved = JSON.parse(JSON.stringify(firstHalf.toSnapshot())) as unknown;
    const resumed = SimEngine.fromSnapshot(saved, performance);
    for (let i = 300; i < 600; i++) {
      resumed.step();
      if (i % 50 === 0) resumed.random.next();
    }

    expect(resumed.toSnapshot()).toEqual(continuous.toSnapshot());
    expect(resumed.random.next()).toBe(continuous.random.next());
  });

  it('returns a copy that cannot change the running engine', () => {
    const engine = createEngine();
    populate(engine);
    const snapshot = engine.toSnapshot();
    snapshot.state.aircraft[0]!.altitudeFt = 99_999;

    expect(engine.listAircraft()[0]!.altitudeFt).not.toBe(99_999);
  });

  it('rejects snapshots from an unknown schema version', () => {
    const snapshot = { ...createEngine().toSnapshot(), schemaVersion: 999 };
    expect(() => SimEngine.fromSnapshot(snapshot, performance)).toThrow(
      /Invalid simulation snapshot/,
    );
  });

  it('rejects snapshots with aircraft types that have no performance data', () => {
    const engine = createEngine();
    engine.addAircraft(newAircraft());
    const snapshot = engine.toSnapshot();
    snapshot.state.aircraft[0]!.aircraftType = 'C172';

    expect(() => SimEngine.fromSnapshot(snapshot, performance)).toThrow(/C172/);
  });
});

describe('SimEngine session settings', () => {
  it('uses default session settings when none are given', () => {
    expect(createEngine().settings).toEqual(defaultSettings('session'));
  });

  it('saves and restores custom settings with the session', () => {
    const settings = {
      ...applyDifficulty(defaultSettings('session'), 'expert'),
      'separation.lateralNm': 5,
    };
    const engine = SimEngine.create({
      performance,
      world: NEW_YORK_WORLD,
      seed: 1,
      startTimeUtc: '2026-09-26T14:00:00Z',
      settings,
    });
    const saved = JSON.parse(JSON.stringify(engine.toSnapshot())) as unknown;

    expect(SimEngine.fromSnapshot(saved, performance).settings).toEqual(settings);
  });

  it('loads snapshots saved before newer settings existed', () => {
    const snapshot = createEngine().toSnapshot();
    const stored = snapshot.state.settings as Record<string, unknown>;
    delete stored['approaches.showEligibility'];
    stored['separation.lateralNm'] = 4;

    const restored = SimEngine.fromSnapshot(snapshot, performance);

    expect(restored.settings['approaches.showEligibility']).toBe(false);
    expect(restored.settings['separation.lateralNm']).toBe(4);
  });
});
