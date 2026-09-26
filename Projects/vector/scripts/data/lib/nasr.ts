// Parsers for FAA NASR (National Airspace System Resources) files.
import type { LatLon } from './cifp';

export interface FrequencyRecord {
  facility: string;
  servicedFacility: string;
  callsign: string;
  frequencyMhz: number;
  sectorization: string;
  use: string;
}

/** Parses one CSV line with double-quoted fields. */
function csvFields(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') quoted = false;
      else current += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      fields.push(current);
      current = '';
    } else current += c;
  }
  fields.push(current);
  return fields;
}

/** FRQ.csv: frequencies for towers, approach controls and other facilities. */
export function parseFrequencies(csv: string): FrequencyRecord[] {
  const [header, ...lines] = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const columns = csvFields(header!);
  const index = (name: string) => {
    const i = columns.indexOf(name);
    if (i === -1) throw new Error(`FRQ.csv has no ${name} column`);
    return i;
  };
  const [facility, served, call, freq, sector, use] = [
    'FACILITY',
    'SERVICED_FACILITY',
    'TOWER_OR_COMM_CALL',
    'FREQ',
    'SECTORIZATION',
    'FREQ_USE',
  ].map(index) as [number, number, number, number, number, number];

  return lines.map((line) => {
    const f = csvFields(line);
    return {
      facility: f[facility]!,
      servicedFacility: f[served]!,
      callsign: f[call]!,
      frequencyMhz: Number(f[freq]),
      sectorization: f[sector]!,
      use: f[use]!,
    };
  });
}

export interface CenterSite {
  artcc: string;
  site: string;
  position: LatLon;
  frequencies: { frequencyMhz: number; altitude: 'low' | 'high' | 'low/high' }[];
}

/** '39-44-58.420N' -> 39.749561 */
function dms(value: string): number {
  const match = /^(\d+)-(\d+)-([\d.]+)([NSEW])$/.exec(value.trim());
  if (!match) throw new Error(`Bad DMS "${value}"`);
  const degrees = Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
  return match[4] === 'S' || match[4] === 'W' ? -degrees : degrees;
}

/**
 * AFF.txt: ARTCC remote radio sites (AFF1 records hold the site position,
 * AFF3 records its frequencies). Only civil VHF frequencies are kept.
 */
export function parseCenterSites(content: string, artcc: string): CenterSite[] {
  const sites = new Map<string, CenterSite>();

  for (const line of content.split(/\r?\n/)) {
    if (line.slice(4, 8).trim() !== artcc) continue;
    const type = line.slice(0, 4);

    // AFF1: site name at 48-77, facility type at 128. AFF3: site name at 8-37, type at 38.
    if (type === 'AFF1' && line.slice(128, 132) === 'RCAG') {
      const coordinates = /(\d{2,3}-\d{2}-[\d.]+[NS])\s+\S+\s*(\d{2,3}-\d{2}-[\d.]+[EW])/.exec(
        line,
      );
      if (!coordinates) throw new Error(`AFF1 record without coordinates: ${line.slice(0, 60)}`);
      const site = line.slice(48, 78).trim();
      sites.set(site, {
        artcc,
        site,
        position: { lat: dms(coordinates[1]!), lon: dms(coordinates[2]!) },
        frequencies: [],
      });
    } else if (type === 'AFF3' && line.slice(38, 42) === 'RCAG') {
      const site = sites.get(line.slice(8, 38).trim());
      const frequencyMhz = Number(line.slice(42, 50));
      const altitude = line.slice(50, 60).trim().toLowerCase();
      // Skip UHF (military) and emergency frequencies.
      if (!site || frequencyMhz >= 137 || frequencyMhz === 121.5) continue;
      if (altitude !== 'low' && altitude !== 'high' && altitude !== 'low/high') continue;
      if (!site.frequencies.some((f) => f.frequencyMhz === frequencyMhz)) {
        site.frequencies.push({ frequencyMhz, altitude });
      }
    }
  }
  return [...sites.values()].filter((site) => site.frequencies.length > 0);
}
