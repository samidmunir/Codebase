import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { airlines, newYork, performance } from '../testing/fixtures';
import type { LiveWeatherReport } from '../weather/wind';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

const report = (
  icao: string,
  windDirectionTrueDeg: number | null,
  windSpeedKts: number,
  extra: Partial<LiveWeatherReport> = {},
): LiveWeatherReport => ({
  icao,
  observedAt: '2026-09-28T01:51:00.000Z',
  raw: `METAR ${icao} 280151Z ...`,
  windDirectionTrueDeg,
  windSpeedKts,
  ...extra,
});

// The real weather when this was written: northeast wind, gusting at LaGuardia.
const NORTHEAST = [
  report('KJFK', 30, 16, { ceilingFt: 1100, flightCategory: 'MVFR' }),
  report('KLGA', 40, 14, { gustKts: 26 }),
  report('KEWR', 20, 16),
];

function createEngine(overrides: Partial<SessionSettings> = {}, liveWeather = NORTHEAST) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
    seed: 4,
    startTimeUtc: '2026-09-28T02:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'weather.windMode': 'live',
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      'traffic.transitRatePerHour': 0,
      ...overrides,
    },
    airspace: newYork,
    airlines,
    liveWeather,
  });
}

describe('live weather', () => {
  it('starts with the reported winds, converted to magnetic, and picks runways from them', () => {
    const engine = createEngine();
    // 030° true is 043° magnetic in New York (13° west variation): reported as 040.
    expect(engine.winds.KJFK).toEqual({ directionDeg: 40, speedKts: 16 });
    expect(engine.winds.KLGA).toEqual({ directionDeg: 50, speedKts: 14, gustKts: 26 });
    // Gusts as reported, even under 10 kt above the steady wind.
    const light = createEngine({}, [report('KLGA', 40, 14, { gustKts: 23 })]);
    expect(light.winds.KLGA).toEqual({ directionDeg: 50, speedKts: 14, gustKts: 23 });
    expect(engine.activeRunways.KJFK!.arrivals[0]).toMatch(/^04/);
    expect(engine.activeRunways.KEWR!.arrivals[0]).toMatch(/^04/);
    expect(engine.liveWeather.KJFK).toMatchObject({ ceilingFt: 1100, flightCategory: 'MVFR' });
  });

  it('takes new reports during the session, and plans a runway change when the wind turns', () => {
    const engine = createEngine();
    const events: SimEvent['type'][] = [];
    engine.subscribe((event) => events.push(event.type));
    for (let i = 0; i < 1_900; i++) engine.step(); // past the minimum time between changes
    expect(engine.applyLiveWeather([report('KJFK', 210, 18), report('KLGA', 220, 15)])).toEqual({
      ok: true,
    });
    expect(engine.winds.KJFK).toEqual({ directionDeg: 220, speedKts: 18 });
    expect(events).toContain('windChanged');
    expect(events).toContain('runwayChangePlanned');
    expect(engine.pendingRunwayChanges.KJFK!.arrivals[0]).toMatch(/^22/);
    // EWR had no new report: its wind stays as it was.
    expect(engine.winds.KEWR).toEqual({ directionDeg: 30, speedKts: 16 });
    // The wind doesn't drift on its own in live mode.
    const winds = JSON.stringify(engine.winds);
    for (let i = 0; i < 3_600; i++) engine.step();
    expect(JSON.stringify(engine.winds)).toBe(winds);
  });

  it('treats variable wind as having no direction, and keeps reports in saved sessions', () => {
    const engine = createEngine();
    engine.applyLiveWeather([report('KJFK', null, 3)]);
    expect(engine.winds.KJFK).toEqual({ directionDeg: 0, speedKts: 3 });
    const restored = SimEngine.fromSnapshot(
      JSON.parse(JSON.stringify(engine.toSnapshot())),
      performance,
      { airspace: newYork, airlines },
    );
    expect(restored.liveWeather).toEqual(engine.liveWeather);
    expect(restored.winds).toEqual(engine.winds);
  });

  it('moves to the reported wind’s runways at once when the first reports come late', () => {
    // No reports at the start (the fetch failed): a random wind picked the runways.
    const engine = createEngine({}, []);
    expect(engine.activeRunways.KJFK!.arrivals[0]).not.toMatch(/^04/);
    engine.applyLiveWeather(NORTHEAST.map((r) => ({ ...r })));
    expect(engine.activeRunways.KJFK!.arrivals[0]).toMatch(/^04/);
    expect(engine.pendingRunwayChanges.KJFK).toBeUndefined();
  });

  it('falls back to a random wind without reports, and refuses reports in other modes', () => {
    const engine = createEngine({}, []);
    expect(Object.keys(engine.winds)).toEqual(newYork.airspace.airports);
    const random = createEngine({ 'weather.windMode': 'random' });
    expect(random.applyLiveWeather(NORTHEAST)).toMatchObject({ ok: false });
  });
});
