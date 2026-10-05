import type { AirspaceId } from '@vector/shared';
import {
  AirspacePack,
  airlinesFileSchema,
  parsePerformanceCatalog,
  type Airline,
  type AirspacePackFiles,
  type PerformanceCatalog,
} from '@vector/sim-core';
import performanceData from '../../../../data/aircraft-types/performance.json';
import airlineData from '../../../../data/airlines/airlines.json';
import chicagoAirports from '../../../../data/airspaces/chicago/airports.json';
import chicagoAirspace from '../../../../data/airspaces/chicago/airspace.json';
import chicagoNavdata from '../../../../data/airspaces/chicago/navdata.json';
import chicagoProcedures from '../../../../data/airspaces/chicago/procedures.json';
import chicagoTraffic from '../../../../data/airspaces/chicago/traffic.json';
import chicagoVideoMap from '../../../../data/airspaces/chicago/video-map.json';
import dallasAirports from '../../../../data/airspaces/dallas/airports.json';
import dallasAirspace from '../../../../data/airspaces/dallas/airspace.json';
import dallasNavdata from '../../../../data/airspaces/dallas/navdata.json';
import dallasProcedures from '../../../../data/airspaces/dallas/procedures.json';
import dallasTraffic from '../../../../data/airspaces/dallas/traffic.json';
import dallasVideoMap from '../../../../data/airspaces/dallas/video-map.json';
import newYorkAirports from '../../../../data/airspaces/new-york/airports.json';
import newYorkAirspace from '../../../../data/airspaces/new-york/airspace.json';
import newYorkNavdata from '../../../../data/airspaces/new-york/navdata.json';
import newYorkProcedures from '../../../../data/airspaces/new-york/procedures.json';
import newYorkTraffic from '../../../../data/airspaces/new-york/traffic.json';
import newYorkVideoMap from '../../../../data/airspaces/new-york/video-map.json';

// The simulator's static data, for replaying sessions on the server: the same
// files the client plays with, bundled into the server build.

const PACK_FILES: Record<AirspaceId, AirspacePackFiles> = {
  'new-york': {
    airspace: newYorkAirspace,
    airports: newYorkAirports,
    navdata: newYorkNavdata,
    procedures: newYorkProcedures,
    videoMap: newYorkVideoMap,
    traffic: newYorkTraffic,
  },
  chicago: {
    airspace: chicagoAirspace,
    airports: chicagoAirports,
    navdata: chicagoNavdata,
    procedures: chicagoProcedures,
    videoMap: chicagoVideoMap,
    traffic: chicagoTraffic,
  },
  dallas: {
    airspace: dallasAirspace,
    airports: dallasAirports,
    navdata: dallasNavdata,
    procedures: dallasProcedures,
    videoMap: dallasVideoMap,
    traffic: dallasTraffic,
  },
};

const packs = new Map<string, AirspacePack>();
let performance: PerformanceCatalog | undefined;
let airlines: readonly Airline[] | undefined;

/** Everything a replay of a session in this airspace needs (parsed once, on first use). */
export function simData(
  airspaceId: string,
):
  | { performance: PerformanceCatalog; airspace: AirspacePack; airlines: readonly Airline[] }
  | undefined {
  const files = PACK_FILES[airspaceId as AirspaceId];
  if (!files) return undefined;
  performance ??= parsePerformanceCatalog(performanceData);
  airlines ??= airlinesFileSchema.parse(airlineData).airlines;
  let pack = packs.get(airspaceId);
  if (!pack) {
    pack = AirspacePack.parse(files);
    packs.set(airspaceId, pack);
  }
  return { performance, airspace: pack, airlines };
}
