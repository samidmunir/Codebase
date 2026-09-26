import { describe, expect, it } from 'vitest';
import performanceData from '../../../../data/aircraft-types/performance.json';
import { cloneJson } from '../snapshot/clone';
import { parsePerformanceCatalog, rateAtAltitude } from './performance';

describe('performance data', () => {
  it('validates and includes the full v1 fleet', () => {
    const catalog = parsePerformanceCatalog(performanceData);
    expect(catalog.types().sort()).toEqual(
      [
        'A320',
        'A321',
        'A333',
        'B738',
        'B739',
        'B752',
        'B763',
        'B77W',
        'B789',
        'CRJ9',
        'E175',
      ].sort(),
    );
  });

  it('rejects inconsistent speeds', () => {
    const broken = cloneJson(performanceData);
    broken.aircraft[0]!.speeds.final = 400;
    expect(() => parsePerformanceCatalog(broken)).toThrow(/final must be below approach/);
  });

  it('rejects duplicate types', () => {
    const broken = cloneJson(performanceData);
    broken.aircraft.push(broken.aircraft[0]!);
    expect(() => parsePerformanceCatalog(broken)).toThrow(/unique/);
  });

  it('throws for an unknown type', () => {
    expect(() => parsePerformanceCatalog(performanceData).get('C172')).toThrow(/C172/);
  });
});

describe('rateAtAltitude', () => {
  const curve = [
    { altitudeFt: 0, fpm: 3000 },
    { altitudeFt: 10_000, fpm: 2000 },
  ];

  it('interpolates between points', () => {
    expect(rateAtAltitude(curve, 5_000)).toBe(2500);
  });

  it('clamps outside the curve', () => {
    expect(rateAtAltitude(curve, -100)).toBe(3000);
    expect(rateAtAltitude(curve, 40_000)).toBe(2000);
  });
});
