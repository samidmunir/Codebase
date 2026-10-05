import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../random/seeded-random';
import * as dmath from './dmath';

/** Distance in units in the last place between two doubles. */
function ulps(a: number, b: number): number {
  if (a === b) return 0;
  const view = new DataView(new ArrayBuffer(16));
  view.setFloat64(0, a);
  view.setFloat64(8, b);
  const ia = view.getBigInt64(0);
  const ib = view.getBigInt64(8);
  const ordered = (i: bigint) => (i < 0n ? -(i & 0x7fffffffffffffffn) : i);
  const d = ordered(ia) - ordered(ib);
  return Number(d < 0n ? -d : d);
}

/** Many values of a range, plus its edges. */
function samples(from: number, to: number, count = 20_000): number[] {
  const random = new SeededRandom(9);
  return [from, to, 0, ...Array.from({ length: count }, () => random.range(from, to))].filter(
    (v) => v >= from && v <= to,
  );
}

const cases: [string, (x: number) => number, (x: number) => number, number[], number][] = [
  ['sin', dmath.sin, Math.sin, samples(-50, 50), 1],
  ['cos', dmath.cos, Math.cos, samples(-50, 50), 1],
  ['tan', dmath.tan, Math.tan, samples(-1.5, 1.5), 3],
  ['atan', dmath.atan, Math.atan, samples(-1e4, 1e4), 1],
  ['asin', dmath.asin, Math.asin, samples(-1, 1), 1],
  ['exp', dmath.exp, Math.exp, samples(-700, 700), 1],
  ['log', dmath.log, Math.log, samples(1e-12, 1e12), 1],
];

describe('deterministic math', () => {
  it.each(cases)(
    '%s matches Math within a unit or so in the last place',
    (_name, mine, native, xs, maxUlps) => {
      let worst = 0;
      for (const x of xs) worst = Math.max(worst, ulps(mine(x), native(x)));
      expect(worst).toBeLessThanOrEqual(maxUlps);
    },
  );

  it('atan2 matches Math.atan2 in every quadrant and on the axes', () => {
    const random = new SeededRandom(4);
    let worst = 0;
    for (let i = 0; i < 20_000; i++) {
      const y = random.range(-500, 500);
      const x = random.range(-500, 500);
      worst = Math.max(worst, ulps(dmath.atan2(y, x), Math.atan2(y, x)));
    }
    expect(worst).toBeLessThanOrEqual(1);
    for (const [y, x] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [-0, -1],
      [Infinity, Infinity],
      [-Infinity, 2],
    ] as const)
      expect(dmath.atan2(y, x), `${y}, ${x}`).toBe(Math.atan2(y, x));
  });

  it('handles the edges like Math', () => {
    expect(dmath.sin(0)).toBe(0);
    expect(dmath.cos(0)).toBe(1);
    expect(Number.isNaN(dmath.sin(Infinity))).toBe(true);
    expect(dmath.asin(1)).toBe(Math.asin(1));
    expect(Number.isNaN(dmath.asin(1.5))).toBe(true);
    expect(dmath.exp(0)).toBe(1);
    expect(dmath.exp(1000)).toBe(Infinity);
    expect(dmath.log(1)).toBe(0);
    expect(dmath.log(0)).toBe(-Infinity);
  });

  it('raises to powers, whole ones exactly', () => {
    expect(dmath.pow(3, 4)).toBe(81);
    expect(dmath.pow(2, -2)).toBe(0.25);
    expect(dmath.pow(-2, 3)).toBe(-8);
    expect(ulps(dmath.pow(0.8, 4.2559), 0.8 ** 4.2559)).toBeLessThanOrEqual(4);
    expect(ulps(dmath.pow(37, 0.3), 37 ** 0.3)).toBeLessThanOrEqual(4);
    expect(dmath.hypot(3, 4)).toBe(5);
  });
});
