import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../random/seeded-random';
import { generateWinds, selectRunwayConfig, windComponents } from './wind';

// JFK configurations and magnetic runway headings.
const JFK_CONFIGS = [
  { id: '22s', arrivals: ['22L'], departures: ['22R'] },
  { id: '31s', arrivals: ['31R'], departures: ['31L'] },
  { id: '13s', arrivals: ['13L'], departures: ['13R'] },
  { id: '4s', arrivals: ['04R'], departures: ['04L'] },
];
const HEADINGS: Record<string, number> = {
  '22L': 224,
  '22R': 224,
  '31R': 314,
  '31L': 314,
  '13L': 134,
  '13R': 134,
  '04R': 44,
  '04L': 44,
};
const heading = (runway: string) => HEADINGS[runway]!;
const LIMITS = { maxTailwindKts: 5, maxCrosswindKts: 20 };

describe('wind components', () => {
  it('splits wind into headwind and crosswind', () => {
    expect(windComponents({ directionDeg: 220, speedKts: 10 }, 220).headwindKts).toBeCloseTo(10);
    expect(windComponents({ directionDeg: 310, speedKts: 10 }, 220).crosswindKts).toBeCloseTo(10);
    expect(windComponents({ directionDeg: 40, speedKts: 10 }, 220).headwindKts).toBeCloseTo(-10);
  });
});

describe('runway configuration', () => {
  it.each([
    [{ directionDeg: 220, speedKts: 14 }, '22s'],
    [{ directionDeg: 310, speedKts: 18 }, '31s'],
    [{ directionDeg: 140, speedKts: 12 }, '13s'],
    [{ directionDeg: 50, speedKts: 15 }, '4s'],
  ])('uses the runways facing into the wind (%o)', (wind, expected) => {
    expect(selectRunwayConfig(JFK_CONFIGS, heading, wind, LIMITS).id).toBe(expected);
  });

  it('uses the preferred configuration in calm wind', () => {
    expect(
      selectRunwayConfig(JFK_CONFIGS, heading, { directionDeg: 0, speedKts: 2 }, LIMITS).id,
    ).toBe('22s');
  });

  it('never picks runways beyond the tailwind limit', () => {
    // 20 kt from 040: the 22s would have a 20 kt tailwind.
    const config = selectRunwayConfig(
      JFK_CONFIGS,
      heading,
      { directionDeg: 40, speedKts: 20 },
      LIMITS,
    );
    expect(config.id).toBe('4s');
  });

  it('falls back to the least crosswind when nothing is within limits', () => {
    const config = selectRunwayConfig(
      JFK_CONFIGS,
      heading,
      { directionDeg: 270, speedKts: 40 },
      LIMITS,
    );
    // 40 kt from 270: 31s have ~30 kt crosswind, 22s ~30 kt too; both exceed 20 kt.
    expect(['22s', '31s']).toContain(config.id);
  });
});

describe('wind generation', () => {
  it('gives similar winds at nearby airports, rounded to 10°', () => {
    const winds = generateWinds(new SeededRandom(11), ['KJFK', 'KLGA', 'KEWR']);
    const values = Object.values(winds);
    expect(values).toHaveLength(3);
    for (const wind of values) {
      expect(wind.directionDeg % 10).toBe(0);
      expect(wind.speedKts).toBeGreaterThanOrEqual(0);
      expect(wind.speedKts).toBeLessThanOrEqual(30);
    }
    const speeds = values.map((w) => w.speedKts);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThanOrEqual(6);
  });

  it('is deterministic for a seed and favours southwest and northwest flow', () => {
    expect(generateWinds(new SeededRandom(5), ['KJFK'])).toEqual(
      generateWinds(new SeededRandom(5), ['KJFK']),
    );
    const directions = Array.from(
      { length: 2000 },
      (_, seed) => generateWinds(new SeededRandom(seed), ['KJFK']).KJFK!.directionDeg,
    );
    const share = (from: number, to: number) =>
      directions.filter((d) => d >= from && d <= to).length / directions.length;
    expect(share(190, 240)).toBeGreaterThan(0.2);
    expect(share(280, 330)).toBeGreaterThan(0.2);
  });
});
