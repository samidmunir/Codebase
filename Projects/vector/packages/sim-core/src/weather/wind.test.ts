import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../random/seeded-random';
import { newYork } from '../testing/fixtures';
import { configWithinLimits, generateWinds, selectRunwayConfig, windComponents } from './wind';

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

  it('lands into even a light wind (030 at 3–5 kt uses the 4s, not the preferred 22s)', () => {
    for (const speedKts of [3, 4, 5, 8]) {
      expect(
        selectRunwayConfig(JFK_CONFIGS, heading, { directionDeg: 30, speedKts }, LIMITS).id,
      ).toBe('4s');
    }
  });

  it('never picks a tailwind runway at New York airports when one into the wind is usable', () => {
    for (const icao of newYork.airspace.airports) {
      const configs = newYork.traffic.airports[icao]!.runwayConfigs;
      const runwayHeading = (runway: string) => newYork.runway(icao, runway).magneticHeadingDeg;
      const headwind = (
        config: (typeof configs)[number],
        wind: { directionDeg: number; speedKts: number },
      ) =>
        Math.min(
          ...[config.arrivals[0]!, config.departures[0]!].map(
            (r) => windComponents(wind, runwayHeading(r)).headwindKts,
          ),
        );
      for (let directionDeg = 10; directionDeg <= 360; directionDeg += 10) {
        for (const speedKts of [3, 5, 8, 12, 18, 25]) {
          const wind = { directionDeg, speedKts };
          const chosen = selectRunwayConfig(configs, runwayHeading, wind, LIMITS);
          const usable = configs.filter((c) => configWithinLimits(c, runwayHeading, wind, LIMITS));
          if (usable.some((c) => headwind(c, wind) >= 0)) {
            expect(
              headwind(chosen, wind),
              `${icao} ${directionDeg}/${speedKts}: ${chosen.id}`,
            ).toBeGreaterThanOrEqual(0);
          }
          if (usable.length > 0) expect(usable).toContain(chosen);
        }
      }
    }
  });

  it('goes least over the tailwind limit when nothing is within limits', () => {
    // LGA's 22/13 has a 10 kt tailwind on 22 in 12 kt from 010; 04/13 only 6.7 kt on 13.
    const configs = [
      { id: '22-13', arrivals: ['22'], departures: ['13'] },
      { id: '04-13', arrivals: ['04'], departures: ['13'] },
    ];
    const lga = (runway: string) => ({ '04': 44, '13': 134, '22': 224 })[runway]!;
    expect(selectRunwayConfig(configs, lga, { directionDeg: 10, speedKts: 12 }, LIMITS).id).toBe(
      '04-13',
    );
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

  it('blows from the regimes it is given, whatever their weights add up to', () => {
    const regimes = [
      { weight: 3, fromDeg: 90, toDeg: 110 },
      { weight: 1, fromDeg: 260, toDeg: 280 },
    ];
    const directions = Array.from(
      { length: 1000 },
      (_, seed) => generateWinds(new SeededRandom(seed), ['KORD'], regimes).KORD!,
    )
      .filter((wind) => wind.speedKts > 3)
      .map((wind) => wind.directionDeg);
    // Each airport's wind is within 10° of the regional one.
    expect(directions.every((d) => (d >= 80 && d <= 120) || (d >= 250 && d <= 290))).toBe(true);
    const east = directions.filter((d) => d <= 120).length / directions.length;
    expect(east).toBeGreaterThan(0.65);
    expect(east).toBeLessThan(0.85);
  });
});
