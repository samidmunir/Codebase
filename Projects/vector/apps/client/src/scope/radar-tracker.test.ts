import type { AircraftState } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { RadarTracker } from './radar-tracker';

function aircraft(id: string, lat: number): AircraftState {
  return {
    id,
    callsign: `TST${id}`,
    aircraftType: 'A320',
    squawk: '1200',
    flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
    phase: 'arrival',
    owner: 'N90',
    position: { lat, lon: -73.8 },
    altitudeFt: 5_000,
    headingDeg: 180,
    iasKts: 210,
    verticalSpeedFpm: 0,
    targets: { altitudeFt: 5_000, headingDeg: 180, turnDirection: 'shortest', iasKts: 210 },
  };
}

describe('RadarTracker', () => {
  it('only updates positions on the sweep interval', () => {
    const radar = new RadarTracker(4.8);
    expect(radar.update(0, [aircraft('1', 41)])).toBe(true);
    expect(radar.update(3, [aircraft('1', 40.9)])).toBe(false);
    expect(radar.get('1')!.position.lat).toBe(41);

    expect(radar.update(4.8, [aircraft('1', 40.8)])).toBe(true);
    expect(radar.get('1')!.position.lat).toBe(40.8);
  });

  it('keeps previous returns as history, newest first', () => {
    const radar = new RadarTracker(1);
    radar.update(0, [aircraft('1', 41)]);
    radar.update(1, [aircraft('1', 40.9)]);
    radar.update(2, [aircraft('1', 40.8)]);
    expect(radar.get('1')!.history.map((p) => p.lat)).toEqual([40.9, 41]);
  });

  it('caps history length', () => {
    const radar = new RadarTracker(1);
    for (let t = 0; t < 30; t++) radar.update(t, [aircraft('1', 41 - t * 0.01)]);
    expect(radar.get('1')!.history).toHaveLength(10);
  });

  it('drops aircraft that are gone', () => {
    const radar = new RadarTracker(1);
    radar.update(0, [aircraft('1', 41), aircraft('2', 40)]);
    radar.update(1, [aircraft('2', 40)]);
    expect(radar.list().map((t) => t.id)).toEqual(['2']);
  });

  it('keeps an even sweep rhythm even when ticks do not line up with the interval', () => {
    const radar = new RadarTracker(4.8);
    const sweeps = Array.from({ length: 30 }, (_, t) => t).filter((t) => radar.update(t, []));
    // Sweeps due at 0, 4.8, 9.6, 14.4, 19.2, 24.0, 28.8 happen on the next whole-second tick.
    expect(sweeps).toEqual([0, 5, 10, 15, 20, 24, 29]);
  });

  it('moves the sweep beam continuously', () => {
    const radar = new RadarTracker(4);
    expect(radar.sweepProgress(11)).toBe(0.75);
    expect(radar.sweepProgress(11.5)).toBe(0.875);
    expect(radar.sweepProgress(12)).toBe(0);
  });
});
