import { describe, expect, it } from 'vitest';
import { findRadarSites } from './radar-sites';
import type { Ring } from './shapefile';

const kx = 60 * Math.cos((40.7 * Math.PI) / 180);

/** A closed circle of `radiusNm` around a point, as [lon, lat]. */
function circle(lat: number, lon: number, radiusNm: number, points = 180): Ring {
  return Array.from({ length: points + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / points;
    return [lon + (radiusNm * Math.sin(a)) / kx, lat + (radiusNm * Math.cos(a)) / 60] as [
      number,
      number,
    ];
  });
}

describe('findRadarSites', () => {
  it('recovers the center of large range arcs and clusters them by site', () => {
    const sites = findRadarSites(
      [circle(40.6388, -73.7698, 30), circle(40.6388, -73.7698, 60)],
      20,
      40.7,
    );
    expect(sites).toHaveLength(1);
    expect(sites[0]!.lat).toBeCloseTo(40.6388, 4);
    expect(sites[0]!.lon).toBeCloseTo(-73.7698, 4);
    expect(sites[0]!.arcRadiiNm).toEqual([30, 60]);
  });

  it('ignores small circles, like obstacle clearance rings', () => {
    expect(findRadarSites([circle(40.75, -73.98, 3)], 20, 40.7)).toEqual([]);
  });

  it('ignores straight and irregular boundaries', () => {
    const straight: Ring = Array.from(
      { length: 40 },
      (_, i) => [-74 + i * 0.01, 40.5] as [number, number],
    );
    expect(findRadarSites([straight], 20, 40.7)).toEqual([]);
  });
});
