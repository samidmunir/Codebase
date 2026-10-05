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

// ---- Chicago airspace -----------------------------------------------------------
import chiAirports from '../../../../data/airspaces/chicago/airports.json';
import chiAirspace from '../../../../data/airspaces/chicago/airspace.json';
import chiNavdata from '../../../../data/airspaces/chicago/navdata.json';
import chiProcedures from '../../../../data/airspaces/chicago/procedures.json';
import chiTraffic from '../../../../data/airspaces/chicago/traffic.json';
import chiVideoMap from '../../../../data/airspaces/chicago/video-map.json';

export const chicago = AirspacePack.parse({
  airspace: chiAirspace,
  airports: chiAirports,
  navdata: chiNavdata,
  procedures: chiProcedures,
  videoMap: chiVideoMap,
  traffic: chiTraffic,
});

// ---- Dallas–Fort Worth airspace --------------------------------------------------
import dfwAirports from '../../../../data/airspaces/dallas/airports.json';
import dfwAirspace from '../../../../data/airspaces/dallas/airspace.json';
import dfwNavdata from '../../../../data/airspaces/dallas/navdata.json';
import dfwProcedures from '../../../../data/airspaces/dallas/procedures.json';
import dfwTraffic from '../../../../data/airspaces/dallas/traffic.json';
import dfwVideoMap from '../../../../data/airspaces/dallas/video-map.json';

export const dallas = AirspacePack.parse({
  airspace: dfwAirspace,
  airports: dfwAirports,
  navdata: dfwNavdata,
  procedures: dfwProcedures,
  videoMap: dfwVideoMap,
  traffic: dfwTraffic,
});

/** Every airspace pack, for tests that hold for all of them. */
export const allAirspaces = [newYork, chicago, dallas] as const;

export const airlines = airlinesFileSchema.parse(airlineData).airlines;
