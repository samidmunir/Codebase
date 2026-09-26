// Renders an airspace pack to an SVG for visually checking the data.
//
//   npm run data:preview -- new-york [centerLat centerLon radiusNm]
//
// Writes data/.cache/preview-<id>.svg
import { readFileSync, writeFileSync } from 'node:fs';
import { AirspacePack, destinationPoint, magneticToTrue, normalizeHeading } from '@vector/sim-core';
import { CACHE_DIR } from './lib/download';

const [id = 'new-york', latArg, lonArg, radiusArg] = process.argv.slice(2);
const dir = new URL(`../../data/airspaces/${id}/`, import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, dir), 'utf8')) as unknown;
const pack = AirspacePack.parse({
  airspace: read('airspace.json'),
  airports: read('airports.json'),
  navdata: read('navdata.json'),
  procedures: read('procedures.json'),
  videoMap: read('video-map.json'),
});

const center =
  latArg && lonArg ? { lat: Number(latArg), lon: Number(lonArg) } : pack.airspace.center;
const radiusNm = radiusArg ? Number(radiusArg) : 50;
const SIZE = 1400;
const dLat = radiusNm / 60;
const dLon = dLat / Math.cos((center.lat * Math.PI) / 180);
const project = (lon: number, lat: number) =>
  `${(((lon - (center.lon - dLon)) / (2 * dLon)) * SIZE).toFixed(1)},${(((center.lat + dLat - lat) / (2 * dLat)) * SIZE).toFixed(1)}`;
const polyline = (points: [number, number][], style: string) =>
  `<polyline fill="none" ${style} points="${points.map(([lon, lat]) => project(lon, lat)).join(' ')}"/>`;

const layers: string[] = [];
const variation = pack.airspace.magneticVariationDeg;

layers.push(
  polyline(
    pack.airspace.boundary.ring,
    'stroke="#5a7cff" stroke-width="1.5" stroke-dasharray="8 6"',
  ),
);
for (const area of pack.videoMap.classB)
  layers.push(polyline(area.ring, 'stroke="#7a4fbf" stroke-width="1"'));
for (const line of pack.videoMap.shoreline)
  layers.push(polyline(line, 'stroke="#2c5b4b" stroke-width="1"'));

// Arrival routes (common routes), in amber.
for (const arrival of pack.arrivals) {
  for (const segment of arrival.commonRoutes) {
    const points = segment.legs.flatMap((leg) => {
      const fix = leg.fix ? pack.fix(leg.fix) : undefined;
      return fix ? [[fix.position.lon, fix.position.lat] as [number, number]] : [];
    });
    if (points.length >= 2)
      layers.push(polyline(points, 'stroke="#ffb547" stroke-width="1" stroke-opacity="0.6"'));
  }
}

for (const airport of pack.airports) {
  for (const runway of airport.runways) {
    const opposite = airport.runways.find((r) => r.id === runway.oppositeId)!;
    layers.push(
      polyline(
        [
          [runway.threshold.lon, runway.threshold.lat],
          [opposite.threshold.lon, opposite.threshold.lat],
        ],
        'stroke="#e3efe9" stroke-width="3"',
      ),
    );
    if (runway.ils) {
      // Final approach course: 15 NM out from the threshold, opposite the localizer course.
      const outbound = normalizeHeading(magneticToTrue(runway.ils.courseDeg, variation) + 180);
      const end = destinationPoint(runway.threshold, outbound, 15);
      layers.push(
        polyline(
          [
            [runway.threshold.lon, runway.threshold.lat],
            [end.lon, end.lat],
          ],
          'stroke="#4cf2a0" stroke-width="1" stroke-dasharray="4 4"',
        ),
      );
    }
  }
  const [x, y] = project(airport.position.lon, airport.position.lat).split(',');
  layers.push(
    `<text x="${Number(x) + 10}" y="${Number(y) - 10}" fill="#e3efe9" font-family="monospace" font-size="16">${airport.icao}</text>`,
  );
}

for (const fix of pack.fixes) {
  const [x, y] = project(fix.position.lon, fix.position.lat).split(',');
  const color = fix.kind === 'vor' ? '#5ac8ff' : fix.kind === 'ndb' ? '#c08aff' : '#7d938a';
  layers.push(`<circle cx="${x}" cy="${y}" r="2" fill="${color}"/>`);
  if (radiusNm <= 25) {
    layers.push(
      `<text x="${Number(x) + 4}" y="${Number(y) - 4}" fill="${color}" font-family="monospace" font-size="10">${fix.ident}</text>`,
    );
  }
}

const out = `${CACHE_DIR}preview-${id}.svg`;
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="#05080b"/>${layers.join('')}</svg>`,
);
console.log(`Wrote ${out}`);
