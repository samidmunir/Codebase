import { describe, expect, it } from 'vitest';
import { regionalWind, variedWind, WIND_VARIATIONS } from './wind';

const slight = { ...WIND_VARIATIONS.slight, periodSec: 20 * 60 };
const base = { directionDeg: 220, speedKts: 12 };
const minutes = (count: number) => Array.from({ length: count }, (_, i) => i * 60);
const turn = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('wind variation', () => {
  it('starts at the session wind and drifts within the variation', () => {
    expect(variedWind(base, 'KJFK', 42, 0, slight)).toEqual(base);
    const winds = minutes(600).map((t) => variedWind(base, 'KJFK', 42, t, slight));
    for (const wind of winds) {
      expect(turn(wind.directionDeg, base.directionDeg)).toBeLessThanOrEqual(20);
      expect(Math.abs(wind.speedKts - base.speedKts)).toBeLessThanOrEqual(4);
      expect(wind.directionDeg % 10).toBe(0);
    }
    // It does change, a step at a time.
    expect(new Set(winds.map((w) => `${w.directionDeg}/${w.speedKts}`)).size).toBeGreaterThan(5);
    for (let i = 1; i < winds.length; i++) {
      expect(turn(winds[i]!.directionDeg, winds[i - 1]!.directionDeg)).toBeLessThanOrEqual(10);
      expect(Math.abs(winds[i]!.speedKts - winds[i - 1]!.speedKts)).toBeLessThanOrEqual(1);
    }
  });

  it('is repeatable, and moves the airports together', () => {
    expect(variedWind(base, 'KJFK', 7, 3_000, slight)).toEqual(
      variedWind(base, 'KJFK', 7, 3_000, slight),
    );
    for (const t of minutes(300)) {
      const jfk = variedWind(base, 'KJFK', 7, t, slight);
      const lga = variedWind(base, 'KLGA', 7, t, slight);
      expect(turn(jfk.directionDeg, lga.directionDeg)).toBeLessThanOrEqual(20);
    }
  });

  it('stays steady when off, and calm stays calm', () => {
    const off = { ...WIND_VARIATIONS.off, periodSec: 1_200 };
    expect(variedWind(base, 'KJFK', 1, 5_000, off)).toEqual(base);
    for (const t of minutes(200)) {
      const calm = variedWind({ directionDeg: 0, speedKts: 2 }, 'KJFK', 1, t, slight);
      expect(calm.directionDeg).toBe(0);
      expect(calm.speedKts).toBeLessThanOrEqual(3);
    }
  });

  it('averages the airports into one regional wind', () => {
    expect(
      regionalWind({
        KJFK: { directionDeg: 210, speedKts: 12 },
        KLGA: { directionDeg: 230, speedKts: 12 },
      }),
    ).toEqual({ directionDeg: 220, speedKts: 12 });
    expect(regionalWind({ KJFK: { directionDeg: 0, speedKts: 2 } })).toEqual({
      directionDeg: 0,
      speedKts: 0,
    });
  });
});
