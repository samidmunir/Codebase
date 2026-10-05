import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { TRACK_SAMPLE_SEC } from '../aircraft/track';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

function createEngine(overrides: Partial<SessionSettings> = {}) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed: 12,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'pilots.responseDelaySec': [1, 1],
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

describe('aircraft tracks', () => {
  it('record an arrival from the moment it enters, every sample interval', () => {
    const engine = createEngine({ 'traffic.arrivalRatePerHour': 20 });
    let arrivalId: string | undefined;
    let enteredAt = 0;
    engine.subscribe((event, tick) => {
      if (event.type === 'arrivalEntered' && !arrivalId) {
        arrivalId = event.aircraftId;
        enteredAt = tick;
      }
    });
    run(engine, 600);
    expect(arrivalId).toBeDefined();
    const track = engine.track(arrivalId!);
    expect(track[0]![0]).toBe(enteredAt);
    const ticks = track.map((point) => point[0]);
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]! - ticks[i - 1]!).toBe(TRACK_SAMPLE_SEC);
    const [, lat, lon, altitudeFt, groundSpeedKts] = track.at(-1)!;
    const arrival = engine.getAircraft(arrivalId!)!;
    expect(Math.abs(lat - arrival.position.lat)).toBeLessThan(0.05);
    expect(Math.abs(lon - arrival.position.lon)).toBeLessThan(0.05);
    expect(altitudeFt).toBeGreaterThan(5_000);
    expect(groundSpeedKts).toBeGreaterThan(200);
  });

  it('start a departure’s track at radar contact, not on the runway', () => {
    const engine = createEngine({ 'traffic.departureRatePerHour': 10 });
    const entry = engine.departureQueue[0]!;
    engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
    let contactTick: number | undefined;
    let aircraftId: string | undefined;
    engine.subscribe((event, tick) => {
      if (event.type === 'tookOff') aircraftId = event.aircraftId;
      if (event.type === 'ownerChanged' && event.to === 'N90' && contactTick === undefined)
        contactTick = tick;
    });
    run(engine, 240);
    expect(contactTick).toBeDefined();
    const track = engine.track(aircraftId!);
    expect(track[0]![0]).toBe(contactTick);
    expect(track[0]![3]).toBeGreaterThanOrEqual(1_500);
  });

  it('are dropped with the aircraft and kept in snapshots', () => {
    const engine = createEngine({ 'traffic.transitRatePerHour': 20 });
    run(engine, 900);
    const [first] = engine.listAircraft();
    expect(engine.track(first!.id).length).toBeGreaterThan(1);

    const restored = SimEngine.fromSnapshot(engine.toSnapshot(), performance, {
      airspace: newYork,
      airlines,
    });
    expect(restored.track(first!.id)).toEqual(engine.track(first!.id));

    engine.removeAircraft(first!.id);
    expect(engine.track(first!.id)).toEqual([]);
    expect(engine.toSnapshot().state.tracks[first!.id]).toBeUndefined();
  });
});
