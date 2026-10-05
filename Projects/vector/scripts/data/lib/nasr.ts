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

// ---- ARTCC boundaries (ARB.txt) ------------------------------------------------

export interface ArtccBoundary {
  /** ARTCC identifier, e.g. 'ZNY'. */
  artcc: string;
  /** ARTCC name, e.g. 'NEW YORK'. */
  name: string;
  /** Low (below FL180) or high altitude stratum. */
  level: 'low' | 'high';
  /** Closed ring of [lon, lat] points. */
  ring: [number, number][];
}

/** '39-41-00.0N' -> 39.6833, '073-10-00.0W' -> -73.1667. */
export function parseDmsCoordinate(value: string): number {
  const match = /^(\d{2,3})-(\d{2})-(\d{2}(?:\.\d+)?)([NSEW])$/.exec(value.trim());
  if (!match) throw new Error(`Bad coordinate "${value}"`);
  const [, d, m, s, hemisphere] = match;
  const degrees = Number(d) + Number(m) / 60 + Number(s) / 3600;
  return hemisphere === 'S' || hemisphere === 'W' ? -degrees : degrees;
}

/**
 * ARTCC boundaries from the NASR ARB file for the given centers. Each record
 * is one boundary point, in order; "POINT OF BEGINNING" closes a ring. Only
 * the low and high strata are kept (not oceanic or FIR-only boundaries).
 */
export function parseArtccBoundaries(content: string, artccs: readonly string[]): ArtccBoundary[] {
  const wanted = new Set(artccs);
  const boundaries: ArtccBoundary[] = [];
  let current: ArtccBoundary | undefined;
  for (const line of content.split(/\r?\n/)) {
    const artcc = line.slice(0, 3);
    const stratum = line.slice(52, 62).trim();
    if (!wanted.has(artcc) || (stratum !== 'LOW' && stratum !== 'HIGH')) continue;
    const level = stratum === 'LOW' ? 'low' : 'high';
    if (!current || current.artcc !== artcc || current.level !== level) {
      current = { artcc, name: line.slice(12, 52).trim(), level, ring: [] };
      boundaries.push(current);
    }
    const point: [number, number] = [
      Math.round(parseDmsCoordinate(line.slice(76, 90)) * 1e5) / 1e5,
      Math.round(parseDmsCoordinate(line.slice(62, 76)) * 1e5) / 1e5,
    ];
    current.ring.push(point);
    if (line.slice(90).includes('POINT OF BEGINNING')) {
      current.ring.push([...current.ring[0]!]);
      current = undefined;
    }
  }
  return boundaries.filter((boundary) => boundary.ring.length >= 4);
}

// ---- Radars (RDR.csv) ---------------------------------------------------------

export interface RadarRecord {
  /** FAA identifier of the facility, e.g. 'PHL'. */
  facility: string;
  facilityType: string;
  radarType: string;
}

/** RDR.csv: radars by facility (no positions; ASRs sit at their airports). */
export function parseRadars(csv: string): RadarRecord[] {
  const [header, ...lines] = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const columns = csvFields(header!);
  const [facility, type, radar] = ['FACILITY_ID', 'FACILITY_TYPE', 'RADAR_TYPE'].map((name) => {
    const i = columns.indexOf(name);
    if (i === -1) throw new Error(`RDR.csv has no ${name} column`);
    return i;
  }) as [number, number, number];
  return lines.map((line) => {
    const f = csvFields(line);
    return { facility: f[facility]!, facilityType: f[type]!, radarType: f[radar]! };
  });
}

// ---- Holding patterns (HPF CSV) -----------------------------------------------------

export interface HoldRecord {
  fix: string;
  inboundCourseDeg: number;
  turn: 'left' | 'right';
  legNm?: number;
  maxSpeedKts?: number;
  minAltitudeFt?: number;
  maxAltitudeFt?: number;
  chart: string;
}

/** Rows of a CSV file as objects keyed by its header. */
function csvRows(csv: string): Record<string, string>[] {
  const [header, ...lines] = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const columns = csvFields(header!);
  return lines.map((line) => {
    const fields = csvFields(line);
    return Object.fromEntries(columns.map((column, i) => [column, fields[i] ?? '']));
  });
}

/** Charts a hold is published on, most useful first for a terminal area. */
const CHART_PREFERENCE = ['STAR', 'ENROUTE LOW', 'ENROUTE HIGH', 'SID', 'IAP'];

/**
 * Published holding patterns at fixes, from NASR's HPF CSV files: base data
 * (fix, inbound course, turns, leg length), speeds and altitudes, and the
 * charts each appears on. Where a fix has several holds, the one charted on
 * a STAR (then enroute) is kept.
 */
export function parseHolds(
  baseCsv: string,
  speedAltitudeCsv: string,
  chartCsv: string,
): HoldRecord[] {
  const key = (row: Record<string, string>) => `${row.HP_NAME}#${row.HP_NO}`;
  const charts = new Map<string, string[]>();
  for (const row of csvRows(chartCsv)) {
    const list = charts.get(key(row)) ?? [];
    list.push(row.CHARTING_TYPE_DESC!);
    charts.set(key(row), list);
  }
  const limits = new Map<string, { speed?: number; minFt?: number; maxFt?: number }>();
  for (const row of csvRows(speedAltitudeCsv)) {
    const current = limits.get(key(row)) ?? {};
    const speed = Number(row.SPEED_RANGE);
    // Altitudes in hundreds of feet: '50/175' is 5,000 to 17,500 ft.
    const [min, max] = (row.ALTITUDE ?? '').split('/').map((v) => Number(v) * 100);
    limits.set(key(row), {
      ...(Number.isFinite(speed) && speed > 0
        ? { speed: Math.min(speed, current.speed ?? Infinity) }
        : {}),
      ...(Number.isFinite(min) ? { minFt: Math.min(min!, current.minFt ?? Infinity) } : {}),
      ...(Number.isFinite(max) ? { maxFt: Math.max(max!, current.maxFt ?? -Infinity) } : {}),
    });
  }
  const byFix = new Map<string, { record: HoldRecord; rank: number }>();
  for (const row of csvRows(baseCsv)) {
    const fix = row.FIX_ID;
    const course = Number(row.COURSE_INBOUND_DEG);
    if (
      !fix ||
      !Number.isFinite(course) ||
      (row.TURN_DIRECTION !== 'L' && row.TURN_DIRECTION !== 'R')
    )
      continue;
    const chartList = charts.get(key(row)) ?? [];
    const rank = Math.min(
      ...chartList.map((c) => {
        const i = CHART_PREFERENCE.findIndex((p) => c.startsWith(p));
        return i === -1 ? CHART_PREFERENCE.length : i;
      }),
      CHART_PREFERENCE.length,
    );
    const limit = limits.get(key(row)) ?? {};
    const leg = Number(row.LEG_LENGTH_DIST);
    const record: HoldRecord = {
      fix,
      inboundCourseDeg: course % 360 || 360,
      turn: row.TURN_DIRECTION === 'L' ? 'left' : 'right',
      ...(Number.isFinite(leg) && leg > 0 ? { legNm: leg } : {}),
      ...(limit.speed !== undefined ? { maxSpeedKts: limit.speed } : {}),
      ...(limit.minFt !== undefined && Number.isFinite(limit.minFt)
        ? { minAltitudeFt: limit.minFt }
        : {}),
      ...(limit.maxFt !== undefined && Number.isFinite(limit.maxFt)
        ? { maxAltitudeFt: limit.maxFt }
        : {}),
      chart: chartList[0] ?? 'OTHER',
    };
    const best = byFix.get(fix);
    if (!best || rank < best.rank)
      byFix.set(fix, {
        record: {
          ...record,
          chart: chartList.find((c) => c.startsWith(CHART_PREFERENCE[rank] ?? '#')) ?? record.chart,
        },
        rank,
      });
  }
  return [...byFix.values()].map((v) => v.record);
}
