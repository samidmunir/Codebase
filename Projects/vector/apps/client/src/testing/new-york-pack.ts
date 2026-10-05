import { AirspacePack } from '@vector/sim-core';
import airports from '../../../../data/airspaces/new-york/airports.json';
import airspace from '../../../../data/airspaces/new-york/airspace.json';
import navdata from '../../../../data/airspaces/new-york/navdata.json';
import procedures from '../../../../data/airspaces/new-york/procedures.json';
import traffic from '../../../../data/airspaces/new-york/traffic.json';
import videoMap from '../../../../data/airspaces/new-york/video-map.json';

/** The real New York airspace pack, for tests. */
export const newYorkPack = AirspacePack.parse({
  airspace,
  airports,
  navdata,
  procedures,
  videoMap,
  traffic,
});
