// Builds a detailed shoreline from US Census TIGER/Line water polygons.
//
// TIGER water polygons are split at county lines, and counties extend 3 NM out
// to sea. Shared edges (county seams through water) cancel out, and edges with
// water on both sides (offshore county limits) are dropped using the Census
// 1:500k county outlines, which are clipped to the shoreline, as the land mask.
import { cachedDownload, onlyFile, unzipMatching } from './download';
import {
  boxesIntersect,
  chainEdges,
  clipLines,
  landTester,
  leftOfEdge,
  lineLengthMeters,
  ringBox,
  roundLine,
  simplify,
  unsharedEdges,
  type Box,
  type Line,
} from './geometry';
import { readShapefile, type Ring, type ShapeRecord } from './shapefile';

const TIGER_YEAR = 2024;

/** Oceans, bays/estuaries/sounds and rivers seed the shoreline. */
const SEED_TYPES = new Set(['H2051', 'H2053', 'H3010']);

/**
 * Water that joins the shoreline when it touches seeded water. TIGER codes
 * some tidal water as lakes or reservoirs (e.g. Grassy Bay and Mill Basin in
 * Jamaica Bay); isolated inland lakes and reservoirs never touch seeded water,
 * so they stay off the map, as on real video maps.
 */
const CONNECTABLE_TYPES = new Set([...SEED_TYPES, 'H2030', 'H2040', 'H3020']);

export interface ShorelineOptions {
  box: Box;
  /** Water polygons smaller than this are ignored (square meters). */
  minWaterAreaM2: number;
  simplifyToleranceMeters: number;
  minLineLengthMeters: number;
}

async function readZippedShapefile(
  url: string,
  cachePath: string,
  name: string,
): Promise<ShapeRecord[]> {
  const files = unzipMatching(await cachedDownload(url, cachePath), /\.(shp|dbf)$/);
  return readShapefile(
    onlyFile(files, new RegExp(`${name}\\.shp$`)),
    onlyFile(files, new RegExp(`${name}\\.dbf$`)),
  );
}

export async function buildShoreline(
  options: ShorelineOptions,
): Promise<{ lines: Line[]; counties: string[] }> {
  const { box } = options;
  const countyName = `cb_${TIGER_YEAR}_us_county_500k`;
  const counties = await readZippedShapefile(
    `https://www2.census.gov/geo/tiger/GENZ${TIGER_YEAR}/shp/${countyName}.zip`,
    `census/${countyName}.zip`,
    countyName,
  );
  const nearby = counties.filter((county) =>
    county.rings.some((ring) => boxesIntersect(ringBox(ring), box)),
  );
  const landRings: Ring[] = nearby.flatMap((county) => county.rings);

  const features: ShapeRecord[] = [];
  for (const county of nearby) {
    const geoid = county.attributes['GEOID']!;
    const name = `tl_${TIGER_YEAR}_${geoid}_areawater`;
    const water = await readZippedShapefile(
      `https://www2.census.gov/geo/tiger/TIGER${TIGER_YEAR}/AREAWATER/${name}.zip`,
      `tiger/${name}.zip`,
      name,
    );
    features.push(
      ...water.filter(
        (feature) =>
          CONNECTABLE_TYPES.has(feature.attributes['MTFCC']!) &&
          feature.rings.some((ring) => boxesIntersect(ringBox(ring), box)),
      ),
    );
  }
  const waterRings = connectedWater(features, options.minWaterAreaM2).flatMap(
    (feature) => feature.rings,
  );

  const isLand = landTester(landRings, 400);
  const shoreEdges = unsharedEdges(waterRings).filter(([a, b]) => isLand(leftOfEdge(a, b, 60)));

  const lines = clipLines(chainEdges(shoreEdges), box)
    .map((line) => simplify(line, options.simplifyToleranceMeters))
    .filter((line) => lineLengthMeters(line) >= options.minLineLengthMeters)
    .map((line) => roundLine(line));

  return { lines, counties: nearby.map((county) => county.attributes['GEOID']!) };
}

/** Seed water features plus every connectable feature linked to them through shared edges. */
function connectedWater(features: readonly ShapeRecord[], minSeedAreaM2: number): ShapeRecord[] {
  const byEdge = new Map<string, number[]>();
  features.forEach((feature, index) => {
    for (const key of featureEdgeKeys(feature)) {
      const owners = byEdge.get(key);
      if (owners) owners.push(index);
      else byEdge.set(key, [index]);
    }
  });

  const included = new Uint8Array(features.length);
  const queue = features.flatMap((feature, index) =>
    SEED_TYPES.has(feature.attributes['MTFCC']!) &&
    Number(feature.attributes['AWATER']) >= minSeedAreaM2
      ? [index]
      : [],
  );
  for (const index of queue) included[index] = 1;

  while (queue.length > 0) {
    const index = queue.pop()!;
    for (const key of featureEdgeKeys(features[index]!)) {
      for (const neighbor of byEdge.get(key)!) {
        if (!included[neighbor]) {
          included[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
  }
  return features.filter((_, index) => included[index]);
}

function featureEdgeKeys(feature: ShapeRecord): string[] {
  const keys: string[] = [];
  for (const ring of feature.rings) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const a = `${ring[i]![0].toFixed(7)},${ring[i]![1].toFixed(7)}`;
      const b = `${ring[i + 1]![0].toFixed(7)},${ring[i + 1]![1].toFixed(7)}`;
      keys.push(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
  }
  return keys;
}
