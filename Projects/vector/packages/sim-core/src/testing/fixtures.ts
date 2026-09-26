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
