import { boxAround } from './lib/geometry';
import { buildShoreline } from './lib/shoreline';
import { writeFileSync } from 'node:fs';
const box = boxAround({ lat: 40.72, lon: -73.95 }, 60);
const t = Date.now();
const { lines } = await buildShoreline({
  box,
  minWaterAreaM2: 150_000,
  simplifyToleranceMeters: 15,
  minLineLengthMeters: 400,
});
console.log(
  'lines',
  lines.length,
  'points',
  lines.reduce((a, l) => a + l.length, 0),
  'ms',
  Date.now() - t,
  'heapMB',
  Math.round(process.memoryUsage().heapUsed / 1e6),
);
writeFileSync(process.argv[2]!, JSON.stringify(lines));
