import performanceData from '../../../../data/aircraft-types/performance.json';
import type { NewAircraft } from '../aircraft/aircraft';
import { parsePerformanceCatalog } from '../performance/performance';

export const performance = parsePerformanceCatalog(performanceData);

export const NEW_YORK_WORLD = { magneticVariationDeg: -13 };

export const JFK = { lat: 40.6398, lon: -73.7789 };

export function newAircraft(overrides: Partial<NewAircraft> = {}): NewAircraft {
  return {
    callsign: 'JBU1024',
    aircraftType: 'A320',
    squawk: '4521',
    flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [] },
    phase: 'enroute',
    owner: 'N90',
    position: JFK,
    altitudeFt: 5_000,
    headingDeg: 360,
    iasKts: 220,
    ...overrides,
  } as NewAircraft;
}

// ---- New York airspace, for operations tests -----------------------------------
import airlineData from '../../../../data/airlines/airlines.json';
import nyAirports from '../../../../data/airspaces/new-york/airports.json';
import nyAirspace from '../../../../data/airspaces/new-york/airspace.json';
import nyNavdata from '../../../../data/airspaces/new-york/navdata.json';
import nyProcedures from '../../../../data/airspaces/new-york/procedures.json';
import nyTraffic from '../../../../data/airspaces/new-york/traffic.json';
import nyVideoMap from '../../../../data/airspaces/new-york/video-map.json';
import { AirspacePack } from '../airspace/airspace-pack';
import { airlinesFileSchema } from '../airspace/schema';

export const newYork = AirspacePack.parse({
  airspace: nyAirspace,
  airports: nyAirports,
  navdata: nyNavdata,
  procedures: nyProcedures,
  videoMap: nyVideoMap,
  traffic: nyTraffic,
});

export const airlines = airlinesFileSchema.parse(airlineData).airlines;
