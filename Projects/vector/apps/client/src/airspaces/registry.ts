import {
  AirspacePack,
  airlinesFileSchema,
  parsePerformanceCatalog,
  type Airline,
  type PerformanceCatalog,
} from '@vector/sim-core';
import airlineData from '../../../../data/airlines/airlines.json';
import performanceData from '../../../../data/aircraft-types/performance.json';
import chicagoAirports from '../../../../data/airspaces/chicago/airports.json?url';
import chicagoAirspace from '../../../../data/airspaces/chicago/airspace.json?url';
import chicagoNavdata from '../../../../data/airspaces/chicago/navdata.json?url';
import chicagoProcedures from '../../../../data/airspaces/chicago/procedures.json?url';
import chicagoTraffic from '../../../../data/airspaces/chicago/traffic.json?url';
import chicagoVideoMap from '../../../../data/airspaces/chicago/video-map.json?url';
import dallasAirports from '../../../../data/airspaces/dallas/airports.json?url';
import dallasAirspace from '../../../../data/airspaces/dallas/airspace.json?url';
import dallasNavdata from '../../../../data/airspaces/dallas/navdata.json?url';
import dallasProcedures from '../../../../data/airspaces/dallas/procedures.json?url';
import dallasTraffic from '../../../../data/airspaces/dallas/traffic.json?url';
import dallasVideoMap from '../../../../data/airspaces/dallas/video-map.json?url';
import newYorkAirports from '../../../../data/airspaces/new-york/airports.json?url';
import newYorkAirspace from '../../../../data/airspaces/new-york/airspace.json?url';
import newYorkNavdata from '../../../../data/airspaces/new-york/navdata.json?url';
import newYorkProcedures from '../../../../data/airspaces/new-york/procedures.json?url';
import newYorkTraffic from '../../../../data/airspaces/new-york/traffic.json?url';
import newYorkVideoMap from '../../../../data/airspaces/new-york/video-map.json?url';

export interface AirspaceEntry {
  id: string;
  name: string;
  facility: string;
  airports: string[];
  available: boolean;
  load?: () => Promise<AirspacePack>;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json();
}

/** URLs of a pack's data files (served as static assets). */
interface PackUrls {
  airspace: string;
  airports: string;
  navdata: string;
  procedures: string;
  videoMap: string;
  traffic: string;
}

/** Loads a pack's data files and validates them. */
function packLoader(urls: PackUrls): () => Promise<AirspacePack> {
  return async () => {
    const [airspace, airports, navdata, procedures, videoMap, traffic] = await Promise.all(
      [
        urls.airspace,
        urls.airports,
        urls.navdata,
        urls.procedures,
        urls.videoMap,
        urls.traffic,
      ].map(fetchJson),
    );
    return AirspacePack.parse({ airspace, airports, navdata, procedures, videoMap, traffic });
  };
}

/** Airspaces the player can choose from. */
export const AIRSPACES: AirspaceEntry[] = [
  {
    id: 'new-york',
    name: 'New York',
    facility: 'N90',
    airports: ['KJFK', 'KLGA', 'KEWR'],
    available: true,
    load: packLoader({
      airspace: newYorkAirspace,
      airports: newYorkAirports,
      navdata: newYorkNavdata,
      procedures: newYorkProcedures,
      videoMap: newYorkVideoMap,
      traffic: newYorkTraffic,
    }),
  },
  {
    id: 'chicago',
    name: 'Chicago',
    facility: 'C90',
    airports: ['KORD', 'KMDW'],
    available: true,
    load: packLoader({
      airspace: chicagoAirspace,
      airports: chicagoAirports,
      navdata: chicagoNavdata,
      procedures: chicagoProcedures,
      videoMap: chicagoVideoMap,
      traffic: chicagoTraffic,
    }),
  },
  {
    id: 'dallas',
    name: 'Dallas–Fort Worth',
    facility: 'D10',
    airports: ['KDFW', 'KDAL'],
    available: true,
    load: packLoader({
      airspace: dallasAirspace,
      airports: dallasAirports,
      navdata: dallasNavdata,
      procedures: dallasProcedures,
      videoMap: dallasVideoMap,
      traffic: dallasTraffic,
    }),
  },
];

export function findAirspace(id: string): AirspaceEntry | undefined {
  return AIRSPACES.find((entry) => entry.id === id);
}

export const performanceCatalog: PerformanceCatalog = parsePerformanceCatalog(performanceData);

export const airlines: readonly Airline[] = airlinesFileSchema.parse(airlineData).airlines;
