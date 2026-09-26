// Finds radar antenna positions in an MVA chart. MVA charts are drawn around
// the radar antenna, so their long range arcs (e.g. 30 and 60 NM) are circles
// centered on it. Fitting circles to those arcs recovers the antenna position.
import type { Ring } from './shapefile';

export interface RadarSite {
  lat: number;
  lon: number;
  /** Range arcs found around this site, in NM. */
  arcRadiiNm: number[];
}

const NM_PER_DEGREE = 60;
/** Points along an arc used to fit and confirm a circle. */
const ARC_POINTS = 21;
const FIT_TOLERANCE_NM = 0.02;

type Xy = [number, number];

function circleThrough(a: Xy, b: Xy, c: Xy): { x: number; y: number; r: number } | undefined {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return undefined;
  const sq = (p: Xy) => p[0] ** 2 + p[1] ** 2;
  const x = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
  const y = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
  return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
}

/** Centers of circular arcs of at least `minRadiusNm` in the given rings, clustered. */
export function findRadarSites(
  rings: readonly Ring[],
  minRadiusNm: number,
  referenceLat: number,
): RadarSite[] {
  const kx = NM_PER_DEGREE * Math.cos((referenceLat * Math.PI) / 180);
  const toXy = ([lon, lat]: [number, number]): Xy => [lon * kx, lat * NM_PER_DEGREE];
  const sites: { x: number; y: number; radii: Set<number> }[] = [];

  for (const ring of rings) {
    const points = ring.map(toXy);
    for (let i = 0; i + ARC_POINTS <= points.length; i += 5) {
      const arc = points.slice(i, i + ARC_POINTS);
      const circle = circleThrough(arc[0]!, arc[10]!, arc[20]!);
      if (!circle || circle.r < minRadiusNm) continue;
      const onCircle = arc.every(
        (p) => Math.abs(Math.hypot(p[0] - circle.x, p[1] - circle.y) - circle.r) < FIT_TOLERANCE_NM,
      );
      if (!onCircle) continue;

      const site = sites.find((s) => Math.hypot(s.x - circle.x, s.y - circle.y) < 0.3);
      if (site) site.radii.add(Math.round(circle.r));
      else sites.push({ x: circle.x, y: circle.y, radii: new Set([Math.round(circle.r)]) });
    }
  }

  return sites.map((site) => ({
    lat: site.y / NM_PER_DEGREE,
    lon: site.x / kx,
    arcRadiiNm: [...site.radii].sort((a, b) => a - b),
  }));
}
