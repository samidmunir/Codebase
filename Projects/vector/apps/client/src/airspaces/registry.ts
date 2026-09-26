import { AirspacePack, parsePerformanceCatalog, type PerformanceCatalog } from '@vector/sim-core';
import performanceData from '../../../../data/aircraft-types/performance.json';
import newYorkAirports from '../../../../data/airspaces/new-york/airports.json?url';
import newYorkAirspace from '../../../../data/airspaces/new-york/airspace.json?url';
import newYorkNavdata from '../../../../data/airspaces/new-york/navdata.json?url';
import newYorkProcedures from '../../../../data/airspaces/new-york/procedures.json?url';
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

/**
 * Airspaces the player can choose from. Each pack's data files are served as
 * static assets and validated when loaded.
 */
export const AIRSPACES: AirspaceEntry[] = [
  {
    id: 'new-york',
    name: 'New York',
    facility: 'N90',
    airports: ['KJFK', 'KLGA', 'KEWR'],
    available: true,
    load: async () => {
      const [airspace, airports, navdata, procedures, videoMap] = await Promise.all(
        [newYorkAirspace, newYorkAirports, newYorkNavdata, newYorkProcedures, newYorkVideoMap].map(
          fetchJson,
        ),
      );
      return AirspacePack.parse({ airspace, airports, navdata, procedures, videoMap });
    },
  },
];

export function findAirspace(id: string): AirspaceEntry | undefined {
  return AIRSPACES.find((entry) => entry.id === id);
}

export const performanceCatalog: PerformanceCatalog = parsePerformanceCatalog(performanceData);
