// Planar geometry helpers for building map data. Coordinates are [lon, lat];
// distances use a local equirectangular approximation, which is accurate to
// well under 1% across a TRACON-sized area.
import type { Ring } from './shapefile';

export type Point = [lon: number, lat: number];
export type Line = Point[];

export interface Box {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

const METERS_PER_DEGREE_LAT = 111_320;

export function boxAround(center: { lat: number; lon: number }, radiusNm: number): Box {
  const dLat = (radiusNm * 1852) / METERS_PER_DEGREE_LAT;
  const dLon = dLat / Math.cos((center.lat * Math.PI) / 180);
  return {
    minLon: center.lon - dLon,
    maxLon: center.lon + dLon,
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
  };
}

export function inBox([lon, lat]: Point, box: Box): boolean {
  return lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat;
}

export function ringBox(ring: readonly Point[]): Box {
  const box = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
  for (const [lon, lat] of ring) {
    box.minLon = Math.min(box.minLon, lon);
    box.maxLon = Math.max(box.maxLon, lon);
    box.minLat = Math.min(box.minLat, lat);
    box.maxLat = Math.max(box.maxLat, lat);
  }
  return box;
}

export function boxesIntersect(a: Box, b: Box): boolean {
  return (
    a.minLon <= b.maxLon && a.maxLon >= b.minLon && a.minLat <= b.maxLat && a.maxLat >= b.minLat
  );
}

/** Converts [lon, lat] to local meters around a reference latitude. */
function projector(referenceLat: number) {
  const kx = METERS_PER_DEGREE_LAT * Math.cos((referenceLat * Math.PI) / 180);
  return {
    toMeters: ([lon, lat]: Point): Point => [lon * kx, lat * METERS_PER_DEGREE_LAT],
    toDegrees: ([x, y]: Point): Point => [x / kx, y / METERS_PER_DEGREE_LAT],
  };
}

// ---- Boundary extraction -----------------------------------------------------

const pointKey = ([lon, lat]: Point) => `${lon.toFixed(7)},${lat.toFixed(7)}`;

/**
 * Edges that belong to exactly one ring. Where polygons share a boundary (e.g.
 * two counties' water polygons meeting mid-river), the shared edges cancel out.
 */
export function unsharedEdges(rings: readonly Ring[]): [Point, Point][] {
  const counts = new Map<string, number>();
  const edgeKey = (a: Point, b: Point) => {
    const [ka, kb] = [pointKey(a), pointKey(b)];
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  };
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const key = edgeKey(ring[i]!, ring[i + 1]!);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const edges: [Point, Point][] = [];
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const [a, b] = [ring[i]!, ring[i + 1]!];
      if (pointKey(a) !== pointKey(b) && counts.get(edgeKey(a, b)) === 1) edges.push([a, b]);
    }
  }
  return edges;
}

/** Joins edges that share endpoints into the longest possible polylines. */
export function chainEdges(edges: readonly [Point, Point][]): Line[] {
  const adjacency = new Map<string, number[]>();
  edges.forEach(([a, b], index) => {
    for (const p of [a, b]) {
      const key = pointKey(p);
      adjacency.set(key, [...(adjacency.get(key) ?? []), index]);
    }
  });

  const used = new Uint8Array(edges.length);
  const nextEdge = (point: Point) =>
    (adjacency.get(pointKey(point)) ?? []).find((index) => !used[index]);

  const extend = (line: Line) => {
    for (;;) {
      const end = line[line.length - 1]!;
      const index = nextEdge(end);
      if (index === undefined) return;
      used[index] = 1;
      const [a, b] = edges[index]!;
      line.push(pointKey(a) === pointKey(end) ? b : a);
    }
  };

  const lines: Line[] = [];
  edges.forEach(([a, b], index) => {
    if (used[index]) return;
    used[index] = 1;
    const line: Line = [a, b];
    extend(line);
    line.reverse();
    extend(line);
    lines.push(line);
  });
  return lines;
}

// ---- Simplification and clipping -------------------------------------------

/** Douglas–Peucker simplification with a tolerance in meters. */
export function simplify(line: Line, toleranceMeters: number): Line {
  if (line.length <= 2) return line;
  const { toMeters } = projector(line[0]![1]);
  const points = line.map(toMeters);
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;

  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const distance = segmentDistance(points[i]!, points[first]!, points[last]!);
      if (distance > maxDistance) [maxDistance, index] = [distance, i];
    }
    if (index !== -1 && maxDistance > toleranceMeters) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

function segmentDistance([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const [dx, dy] = [bx - ax, by - ay];
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Splits lines into the runs that fall inside the box. */
export function clipLines(lines: readonly Line[], box: Box): Line[] {
  const result: Line[] = [];
  for (const line of lines) {
    let run: Line = [];
    for (const point of line) {
      if (inBox(point, box)) run.push(point);
      else {
        if (run.length >= 2) result.push(run);
        run = [];
      }
    }
    if (run.length >= 2) result.push(run);
  }
  return result;
}

export function lineLengthMeters(line: Line): number {
  const { toMeters } = projector(line[0]![1]);
  let length = 0;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [toMeters(line[i - 1]!), toMeters(line[i]!)];
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return length;
}

export function roundLine(line: Line, decimals = 5): Line {
  const f = 10 ** decimals;
  return line.map(([lon, lat]) => [Math.round(lon * f) / f, Math.round(lat * f) / f]);
}

// ---- Land test -------------------------------------------------------------

/** Even–odd point-in-polygon over a set of rings. */
function insideRings(point: Point, rings: readonly { ring: Ring; box: Box }[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (const { ring, box } of rings) {
    if (x < box.minLon || x > box.maxLon || y < box.minLat || y > box.maxLat) continue;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/**
 * Tests whether points are on land, given land polygons that may be simplified
 * (e.g. Census 1:500k). Points within `toleranceMeters` of the land outline
 * count as land, to absorb the simplification.
 */
export function landTester(landRings: readonly Ring[], toleranceMeters: number) {
  const indexed = landRings.map((ring) => ({ ring, box: ringBox(ring) }));
  const { toMeters } = projector(40.7);

  // Grid of land outline segments for the tolerance check.
  const cell = 0.01;
  const grid = new Map<string, [Point, Point][]>();
  const cellKey = (lon: number, lat: number) =>
    `${Math.floor(lon / cell)},${Math.floor(lat / cell)}`;
  for (const ring of landRings) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const [a, b] = [ring[i]!, ring[i + 1]!];
      const key = cellKey((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      grid.set(key, [...(grid.get(key) ?? []), [a, b]]);
    }
  }

  const nearOutline = ([lon, lat]: Point) => {
    const p = toMeters([lon, lat]);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const segments = grid.get(cellKey(lon + dx * cell, lat + dy * cell)) ?? [];
        for (const [a, b] of segments) {
          if (segmentDistance(p, toMeters(a), toMeters(b)) <= toleranceMeters) return true;
        }
      }
    }
    return false;
  };

  return (point: Point) => insideRings(point, indexed) || nearOutline(point);
}

/**
 * For a ring edge from `a` to `b`, the point `offsetMeters` to its left.
 * Shapefile polygons keep their interior on the right, so this is outside.
 */
export function leftOfEdge(a: Point, b: Point, offsetMeters: number): Point {
  const { toMeters, toDegrees } = projector(a[1]);
  const [pa, pb] = [toMeters(a), toMeters(b)];
  const [dx, dy] = [pb[0] - pa[0], pb[1] - pa[1]];
  const length = Math.hypot(dx, dy) || 1;
  const mid: Point = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
  return toDegrees([mid[0] - (dy / length) * offsetMeters, mid[1] + (dx / length) * offsetMeters]);
}
