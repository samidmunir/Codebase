import { describe, expect, it } from 'vitest';
import { bearingTrue, destinationPoint, distanceNm, magneticToTrue, trueToMagnetic } from './geo';

describe('distanceNm', () => {
  it('measures one degree of latitude as about 60 NM', () => {
    expect(distanceNm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(60.04, 1);
  });

  it('matches the published JFK-LAX great-circle distance (~2,145 NM)', () => {
    const jfk = { lat: 40.6398, lon: -73.7789 };
    const lax = { lat: 33.9425, lon: -118.4081 };
    expect(distanceNm(jfk, lax)).toBeGreaterThan(2_140);
    expect(distanceNm(jfk, lax)).toBeLessThan(2_150);
  });
});

describe('bearingTrue', () => {
  it('points north and east correctly', () => {
    expect(bearingTrue({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0);
    expect(bearingTrue({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90);
  });
});

describe('destinationPoint', () => {
  it('round-trips with distance and bearing', () => {
    const origin = { lat: 40.6398, lon: -73.7789 };
    const destination = destinationPoint(origin, 47, 25);

    expect(distanceNm(origin, destination)).toBeCloseTo(25, 6);
    expect(bearingTrue(origin, destination)).toBeCloseTo(47, 6);
  });

  it('wraps across the antimeridian', () => {
    const point = destinationPoint({ lat: 0, lon: 179.9 }, 90, 60);
    expect(point.lon).toBeCloseTo(-179.1, 1);
  });
});

describe('magnetic variation', () => {
  it('converts with west variation as negative', () => {
    expect(magneticToTrue(360, -13)).toBe(347);
    expect(trueToMagnetic(347, -13)).toBe(0);
  });
});
