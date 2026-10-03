// Builds an airspace pack from public FAA and US Census data:
//
//   npm run data:airspace -- <id>       e.g. new-york, chicago
import { newYork } from './airspaces/new-york';
import { buildAirspace, type AirspaceBuildConfig } from './lib/build-airspace';

const AIRSPACES: Record<string, AirspaceBuildConfig> = { [newYork.id]: newYork };

const id = process.argv[2];
const airspace = id ? AIRSPACES[id] : undefined;
if (!airspace) {
  console.error(`Usage: npm run data:airspace -- <${Object.keys(AIRSPACES).join('|')}>`);
  process.exit(1);
}
await buildAirspace(airspace);
