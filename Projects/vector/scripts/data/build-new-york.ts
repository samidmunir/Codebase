// Builds the New York (N90) airspace pack in data/airspaces/new-york/ from
// public FAA and US Census data. Downloads are cached in data/.cache/.
//
//   npm run data:new-york
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AIRSPACE_SCHEMA_VERSION,
  bearingTrue,
  destinationPoint,
  distanceNm,
  type Airport,
  type IlsApproach,
  type ProcedureLeg,
  type RouteSegment,
  type TerminalProcedure,
} from '@vector/sim-core';
import {
  parseCifp,
  type CifpData,
  type CifpFix,
  type CifpLeg,
  type CifpProcedureRecord,
} from './lib/cifp';
import { cachedDownload, onlyFile, text, unzipMatching } from './lib/download';
import { boxAround, inBox, simplify } from './lib/geometry';
import { parseMva } from './lib/mva';
import { findRadarSites } from './lib/radar-sites';
import { parseArtccBoundaries, parseCenterSites, parseFrequencies, parseRadars } from './lib/nasr';
import { buildShoreline } from './lib/shoreline';

// ---- Configuration -------------------------------------------------------------

/** FAA 28-day AIRAC cycle to build from. Update both together. */
const CIFP_CYCLE = '260903';
const NASR_EDITION = '2026-09-03';
const NASR_CSV_EDITION = '03_Sep_2026';

const AIRPORTS = ['KJFK', 'KLGA', 'KEWR'] as const;
const CENTER = { lat: 40.72, lon: -73.95 };
/**
 * Radius of the playable area: the New York TRACON plus the surrounding
 * Center airspace, far enough out that arrivals enter on their STARs at
 * cruise levels (see printBoundaryDiagnostics).
 */
const BOUNDARY_RADIUS_NM = 150;
const BOUNDARY_CEILING_FT = 45_000;
/** Radius of video map geography (a little beyond the boundary). */
const MAP_RADIUS_NM = 165;
/** Detailed shoreline this close to the center; coarser beyond. */
const DETAILED_SHORELINE_RADIUS_NM = 60;
/** Simplification tolerance for Class B and C outlines. */
const CLASS_AIRSPACE_TOLERANCE_M = 40;
/** Other airports shown on the map need a runway at least this long. */
const MIN_MAP_AIRPORT_RUNWAY_FT = 5_000;
/** The owning Center and its neighbors in the region. */
const HOME_CENTER = 'ZNY';
const ADJACENT_CENTERS = ['ZBW', 'ZDC', 'ZOB'] as const;
const CENTER_NAMES: Record<string, string> = {
  ZNY: 'New York Center',
  ZBW: 'Boston Center',
  ZDC: 'Washington Center',
  ZOB: 'Cleveland Center',
};
/** TRACON MVA charts (FUS3) and Center MIA charts in the region. */
const MVA_CHARTS = ['N90_MVA_FUS3', 'PHL_MVA_FUS3'] as const;
const MIA_CHARTS = ['ZNY_TAV', 'ZBW_TAV', 'ZDC_TAV', 'ZOB_TAV'] as const;
/**
 * The terminal radars that feed the scope: the New York TRACON's own sites plus
 * Philadelphia. (NASR lists many more ASRs in the region; beyond these, the
 * modeled long-range coverage fills in above its floor.)
 */
const MAIN_RADARS = ['JFK', 'EWR', 'ISP', 'HPN', 'PHL'] as const;
/** Standard ASR-9/ASR-11 instrumented range, and its antenna height above the field. */
const ASR_RANGE_NM = 60;
const ASR_ANTENNA_HEIGHT_FT = 50;
/** ASR sites farther than this from the center are left out (their coverage doesn't reach). */
const RADAR_SITE_RADIUS_NM = BOUNDARY_RADIUS_NM + ASR_RANGE_NM;
/** A chart arc center this close to an airport is that airport's ASR antenna. */
const RADAR_AIRPORT_MATCH_NM = 4;
/** MVA arcs at least this large are radar range arcs, not obstacle clearance circles. */
const RADAR_MIN_ARC_NM = 20;
/** Center radio sites farther than this are left out. */
const CENTER_SITE_RADIUS_NM = 260;

/** Radio names that don't title-case cleanly. */
const TOWER_NAMES: Record<string, string> = { LAGUARDIA: 'LaGuardia' };

const OUTPUT_DIR = fileURLToPath(new URL('../../data/airspaces/new-york/', import.meta.url));

// ---- Helpers -------------------------------------------------------------------

const titleCase = (value: string) =>
  TOWER_NAMES[value] ?? value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Drops undefined properties so JSON output stays clean. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function oppositeRunway(id: string): string {
  const number = Number(id.slice(0, 2));
  const side = id.slice(2);
  const opposite = ((number + 17) % 36) + 1;
  const swapped = side === 'L' ? 'R' : side === 'R' ? 'L' : side;
  return `${String(opposite).padStart(2, '0')}${swapped}`;
}

/** 'RW04B' -> ['04L', '04R'], 'RW13' -> ['13'], 'ALL' -> every runway. */
function runwaysFor(transition: string, runwayIds: readonly string[]): string[] | undefined {
  if (transition === 'ALL') return [...runwayIds];
  const match = /^RW(\d{2})([LRCB]?)$/.exec(transition);
  if (!match) return undefined;
  const [, number, side] = match;
  if (side === 'B') return runwayIds.filter((id) => id.startsWith(number!));
  return [`${number}${side}`];
}

// ---- Airports ------------------------------------------------------------------

function buildAirports(cifp: CifpData, frequencyCsv: string): Airport[] {
  const frequencies = parseFrequencies(frequencyCsv);

  return AIRPORTS.map((icao) => {
    const airport = cifp.airports.find((a) => a.icao === icao);
    if (!airport) throw new Error(`${icao} not found in CIFP`);
    const faaId = icao.slice(1);

    const towers = frequencies.filter(
      (f) =>
        f.facility === faaId &&
        f.servicedFacility === faaId &&
        f.use.startsWith('LCL') &&
        f.frequencyMhz < 137, // VHF only
    );
    const primary = towers.find((f) => f.use === 'LCL/P');
    if (!primary) throw new Error(`No primary tower frequency for ${icao}`);
    const towerFrequencyFor = (runway: string) =>
      towers.find((f) => f.sectorization.split(/[ ,/]+/).includes(runway))?.frequencyMhz ??
      primary.frequencyMhz;

    const runwayRecords = cifp.runways.filter((r) => r.airport === icao);
    const runways = runwayRecords.map((runway) => {
      const opposite = runwayRecords.find((r) => r.id === oppositeRunway(runway.id));
      if (!opposite) throw new Error(`${icao} runway ${runway.id} has no opposite end`);
      const localizer = cifp.localizers.find((l) => l.airport === icao && l.runway === runway.id);

      return compact({
        id: runway.id,
        oppositeId: opposite.id,
        threshold: runway.threshold,
        thresholdElevationFt: runway.thresholdElevationFt,
        displacedThresholdFt: runway.displacedThresholdFt,
        lengthFt: runway.lengthFt,
        widthFt: runway.widthFt,
        magneticHeadingDeg: runway.magneticBearingDeg,
        trueHeadingDeg: Math.round(bearingTrue(runway.threshold, opposite.threshold) * 100) / 100,
        towerFrequencyMhz: towerFrequencyFor(runway.id),
        ils:
          localizer?.glideslope === undefined
            ? undefined
            : compact({
                ident: localizer.ident,
                frequencyMhz: localizer.frequencyMhz,
                category: localizer.category,
                courseDeg: localizer.courseDeg,
                localizerPosition: localizer.position,
                glideslopeAngleDeg: localizer.glideslope.angleDeg,
                thresholdCrossingHeightFt: localizer.glideslope.thresholdCrossingHeightFt,
              }),
      });
    });

    return {
      icao,
      name: airport.name,
      position: airport.position,
      elevationFt: airport.elevationFt,
      magneticVariationDeg: airport.magneticVariationDeg,
      towerCallsign: `${titleCase(primary.callsign)} Tower`,
      runways: runways.sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
}

// ---- Procedures ----------------------------------------------------------------

function toLeg(leg: CifpLeg): ProcedureLeg {
  const isRunway = leg.fixSection === 'PG' && leg.fix?.startsWith('RW');
  // Vector legs at the end of some STARs name the airport as a reference only.
  const isAirportReference = leg.fixSection === 'PA';
  return compact({
    pathTerminator: leg.pathTerminator as ProcedureLeg['pathTerminator'],
    fix: isRunway || isAirportReference ? undefined : leg.fix,
    runway: isRunway ? leg.fix!.slice(2) : undefined,
    courseDeg: leg.courseDeg,
    turnDirection: leg.turnDirection,
    distanceNm: leg.distanceNm,
    holdMinutes: leg.holdMinutes,
    altitude: leg.altitude,
    glideslopeInterceptFt: leg.glideslopeInterceptFt,
    speed: leg.speed,
    verticalAngleDeg: leg.verticalAngleDeg,
    flyover: leg.flyover,
    role: leg.role,
  });
}

type Route = { routeType: string; transition: string; legs: CifpLeg[] };

function groupRoutes(
  records: readonly CifpProcedureRecord[],
): Map<string, { airport: string; routes: Route[] }> {
  const procedures = new Map<string, { airport: string; routes: Map<string, Route> }>();
  for (const record of records) {
    const key = `${record.airport}|${record.id}`;
    const procedure = procedures.get(key) ?? { airport: record.airport, routes: new Map() };
    procedures.set(key, procedure);
    const routeKey = `${record.routeType}|${record.transition}`;
    const route = procedure.routes.get(routeKey) ?? {
      routeType: record.routeType,
      transition: record.transition,
      legs: [],
    };
    procedure.routes.set(routeKey, route);
    route.legs.push(record.leg);
  }
  return new Map(
    [...procedures].map(([key, { airport, routes }]) => [
      key,
      {
        airport,
        routes: [...routes.values()].map((route) => ({
          ...route,
          legs: route.legs.sort((a, b) => a.sequence - b.sequence),
        })),
      },
    ]),
  );
}

// ARINC 424 route types.
const STAR_ROUTE_TYPES = { enroute: '147', common: '258', runway: '369', rnav: '456' };
const SID_ROUTE_TYPES = { runway: '14T', common: '25', enroute: '36V', rnav: '456' };

function buildTerminalProcedures(
  records: readonly CifpProcedureRecord[],
  types: { enroute: string; common: string; runway: string; rnav: string },
  runwayIds: (airport: string) => string[],
): TerminalProcedure[] {
  return [...groupRoutes(records)].map(([key, { airport, routes }]) => {
    const segment = (route: Route): RouteSegment =>
      compact({
        name: route.transition,
        runways: runwaysFor(route.transition, runwayIds(airport)),
        legs: route.legs.map(toLeg),
      });
    const ofType = (typeCodes: string) =>
      routes.filter((r) => typeCodes.includes(r.routeType)).map(segment);

    return {
      id: key.split('|')[1]!,
      airport,
      rnav: routes.some((r) => types.rnav.includes(r.routeType)),
      enrouteTransitions: ofType(types.enroute),
      commonRoutes: ofType(types.common),
      runwayTransitions: ofType(types.runway),
    };
  });
}

function buildIlsApproaches(records: readonly CifpProcedureRecord[]): IlsApproach[] {
  const approaches: IlsApproach[] = [];
  for (const [key, { airport, routes }] of groupRoutes(records)) {
    const id = key.split('|')[1]!;
    const final = routes.find((r) => r.routeType === 'I');
    const match = /^I(\d{2}[LRC]?)-?([A-Z])?$/.exec(id);
    if (!final || !match) continue; // ILS approaches only

    const missedStart = final.legs.findIndex((leg) => leg.startsMissedApproach);
    const finalLegs = missedStart === -1 ? final.legs : final.legs.slice(0, missedStart);
    const missedLegs = missedStart === -1 ? [] : final.legs.slice(missedStart);
    const localizer = final.legs.find((leg) => leg.recommendedNavaid)?.recommendedNavaid;
    if (!localizer) throw new Error(`${airport} ${id} has no localizer`);

    approaches.push(
      compact({
        id,
        airport,
        runway: match[1]!,
        variant: match[2],
        localizer,
        transitions: routes
          .filter((r) => r.routeType === 'A')
          .map((r) => ({ name: r.transition, legs: r.legs.map(toLeg) })),
        final: finalLegs.map(toLeg),
        missedApproach: missedLegs.map(toLeg),
      }),
    );
  }
  return approaches;
}

// ---- Navdata -----------------------------------------------------------------

function buildNavdata(cifp: CifpData, procedures: readonly CifpProcedureRecord[]) {
  const fixKey = (ident: string, section: string, airport?: string) =>
    section === 'PC' || section === 'PN' ? `${ident}|${section}|${airport}` : `${ident}|${section}`;
  const index = new Map<string, CifpFix>();
  for (const fix of cifp.fixes) index.set(fixKey(fix.ident, fix.section, fix.airport), fix);

  const selected = new Map<string, CifpFix>();
  const add = (fix: CifpFix) => {
    const existing = selected.get(fix.ident);
    if (existing && distanceNm(existing.position, fix.position) > 0.5) {
      throw new Error(`Fix ident ${fix.ident} is ambiguous in this airspace`);
    }
    if (!existing) selected.set(fix.ident, fix);
  };

  for (const { airport, leg } of procedures) {
    if (!leg.fix || leg.fixSection === 'PG' || leg.fixSection === 'PA') continue;
    const fix = index.get(fixKey(leg.fix, leg.fixSection!, airport));
    if (!fix) throw new Error(`Procedure fix ${leg.fix} (${leg.fixSection}) not found`);
    add(fix);
  }
  // Departure gate fixes from the hand-authored traffic profile.
  const traffic = JSON.parse(readFileSync(`${OUTPUT_DIR}traffic.json`, 'utf8')) as {
    departureGates: Record<string, string[]>;
  };
  for (const ident of Object.values(traffic.departureGates).flat()) {
    const fix =
      index.get(fixKey(ident, 'EA')) ??
      index.get(fixKey(ident, 'D ')) ??
      index.get(fixKey(ident, 'DB'));
    if (!fix) throw new Error(`Departure gate fix ${ident} not found`);
    add(fix);
  }

  // Fixes on high-altitude airways (Jet and Q routes) in the region, so
  // aircraft can be sent direct to them at altitude.
  const airwayFixes = new Set(
    cifp.airways
      .filter((point) => /^[JQ]/.test(point.route))
      .map((p) => `${p.fix}|${p.fixSection}`),
  );
  for (const key of airwayFixes) {
    const [ident, section] = key.split('|') as [string, string];
    const fix = index.get(fixKey(ident, section));
    if (fix && !selected.has(fix.ident) && distanceNm(CENTER, fix.position) <= MAP_RADIUS_NM) {
      selected.set(fix.ident, fix);
    }
  }

  // Nearby VORs and NDBs for direct-to menus (not DME-only, TACAN or ILS/DME
  // stations). Procedure fixes take precedence, and VORs over NDBs where two
  // stations share an ident.
  for (const kind of ['vor', 'ndb'] as const) {
    for (const fix of cifp.fixes) {
      const isVorOrNdb = kind === 'ndb' || fix.navaidClass?.startsWith('V');
      if (
        fix.kind === kind &&
        isVorOrNdb &&
        !selected.has(fix.ident) &&
        distanceNm(CENTER, fix.position) <= MAP_RADIUS_NM
      ) {
        selected.set(fix.ident, fix);
      }
    }
  }

  return [...selected.values()]
    .sort((a, b) => a.ident.localeCompare(b.ident))
    .map((fix) =>
      compact({
        ident: fix.ident,
        kind: fix.kind,
        position: fix.position,
        name: fix.name,
        frequencyMhz: fix.frequencyMhz,
      }),
    );
}

// ---- Airways and other airports --------------------------------------------------

type Point = [number, number];
const toPoint = (p: { lat: number; lon: number }): Point => [
  Math.round(p.lon * 1e5) / 1e5,
  Math.round(p.lat * 1e5) / 1e5,
];

/** Airway lines in the map area: each continuous stretch, cut to the pieces near the region. */
function buildAirways(cifp: CifpData) {
  const index = new Map<string, CifpFix>();
  for (const fix of cifp.fixes) {
    if (fix.section === 'EA' || fix.section === 'D ' || fix.section === 'DB')
      index.set(`${fix.ident}|${fix.section}`, fix);
  }
  const byRoute = new Map<string, typeof cifp.airways>();
  for (const point of cifp.airways) {
    if (!/^[JQVT]\d/.test(point.route)) continue;
    byRoute.set(point.route, [...(byRoute.get(point.route) ?? []), point]);
  }
  const airways: { id: string; level: 'high' | 'low'; line: Point[] }[] = [];
  for (const [route, points] of byRoute) {
    const level = /^[JQ]/.test(route) ? 'high' : 'low';
    let stretch: Point[] = [];
    const flush = () => {
      if (stretch.length >= 2) airways.push({ id: route, level, line: stretch });
      stretch = [];
    };
    for (const point of points.sort((a, b) => a.sequence - b.sequence)) {
      const fix = index.get(`${point.fix}|${point.fixSection}`);
      const near = fix && distanceNm(CENTER, fix.position) <= MAP_RADIUS_NM + 40;
      if (near) stretch.push(toPoint(fix.position));
      else flush();
      if (point.endsSegment) flush();
    }
    flush();
  }
  return airways;
}

/** Airports in the region with a runway long enough for jets, drawn for orientation. */
function buildMapAirports(cifp: CifpData) {
  const controlled = new Set<string>(AIRPORTS);
  return cifp.allAirports
    .filter(
      (airport) =>
        !controlled.has(airport.icao) &&
        // Public airports with ICAO identifiers (not private strips like '3NY8').
        /^K[A-Z]{3}$/.test(airport.icao) &&
        distanceNm(CENTER, airport.position) <= BOUNDARY_RADIUS_NM &&
        cifp.allRunways.some(
          (r) => r.airport === airport.icao && r.lengthFt >= MIN_MAP_AIRPORT_RUNWAY_FT,
        ),
    )
    .map((airport) => {
      const runways = cifp.allRunways.filter((r) => r.airport === airport.icao);
      const pairs: [Point, Point][] = [];
      for (const runway of runways) {
        const opposite = runways.find((r) => r.id === oppositeRunway(runway.id));
        // Each pair once, from the lower-numbered end.
        if (opposite && runway.id < opposite.id)
          pairs.push([toPoint(runway.threshold), toPoint(opposite.threshold)]);
      }
      return {
        icao: airport.icao,
        name: titleCase(airport.name),
        position: airport.position,
        runways: pairs,
      };
    })
    .sort((a, b) => a.icao.localeCompare(b.icao));
}

// ---- Radars ----------------------------------------------------------------------

interface ArcSite {
  lat: number;
  lon: number;
  arcRadiiNm: number[];
}

/**
 * Terminal radar (ASR) sites in the region. Where a TRACON's MVA chart has
 * range arcs, their center is the antenna; other ASRs listed in NASR sit at
 * their airport's reference point (within about a mile of the real antenna).
 */
function buildRadarSites(cifp: CifpData, arcSites: readonly ArcSite[], rdrCsv: string) {
  const airportOf = (faaId: string) => cifp.allAirports.find((a) => a.icao === `K${faaId}`);
  const sites: {
    id: string;
    name: string;
    kind: 'asr';
    position: { lat: number; lon: number };
    antennaElevationFt: number;
    rangeNm: number;
    source: 'chart' | 'airport';
  }[] = [];
  const asrAirports = [
    ...new Set(
      parseRadars(rdrCsv)
        .filter((r) => r.radarType === 'ASR' && r.facilityType === 'AIRPORT')
        .map((r) => r.facility),
    ),
  ];
  for (const faaId of asrAirports.filter((id) => (MAIN_RADARS as readonly string[]).includes(id))) {
    const airport = airportOf(faaId);
    if (!airport || distanceNm(CENTER, airport.position) > RADAR_SITE_RADIUS_NM) continue;
    // Arc centers near this airport: average them (several arcs can fit slightly apart).
    const arcs = arcSites.filter(
      (site) =>
        distanceNm(site, airport.position) < RADAR_AIRPORT_MATCH_NM &&
        Math.max(...site.arcRadiiNm) >= ASR_RANGE_NM - 5,
    );
    const position =
      arcs.length > 0
        ? {
            lat: arcs.reduce((sum, a) => sum + a.lat, 0) / arcs.length,
            lon: arcs.reduce((sum, a) => sum + a.lon, 0) / arcs.length,
          }
        : airport.position;
    sites.push({
      id: faaId,
      name: `${faaId} ASR`,
      kind: 'asr',
      position: {
        lat: Math.round(position.lat * 1e5) / 1e5,
        lon: Math.round(position.lon * 1e5) / 1e5,
      },
      antennaElevationFt: airport.elevationFt + ASR_ANTENNA_HEIGHT_FT,
      rangeNm: ASR_RANGE_NM,
      source: arcs.length > 0 ? 'chart' : 'airport',
    });
  }
  return sites.sort((a, b) => distanceNm(CENTER, a.position) - distanceNm(CENTER, b.position));
}

// ---- Boundary ------------------------------------------------------------------

function circleRing(
  center: { lat: number; lon: number },
  radiusNm: number,
  points = 72,
): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const p = destinationPoint(center, (360 / points) * (i % points), radiusNm);
    ring.push([Math.round(p.lon * 1e5) / 1e5, Math.round(p.lat * 1e5) / 1e5]);
  }
  return ring;
}

function printBoundaryDiagnostics(
  arrivals: TerminalProcedure[],
  fixes: { ident: string; position: { lat: number; lon: number } }[],
) {
  const position = (ident: string) => fixes.find((f) => f.ident === ident)?.position;
  console.log('\n  Arrival common-route start distances from center:');
  for (const star of arrivals) {
    const first = star.commonRoutes[0]?.legs[0]?.fix ?? star.runwayTransitions[0]?.legs[0]?.fix;
    const p = first ? position(first) : undefined;
    const entries = star.enrouteTransitions.map((t) => t.legs[0]?.fix).filter(Boolean);
    console.log(
      `    ${star.airport} ${star.id.padEnd(7)} common starts ${first ?? '-'} @ ${p ? distanceNm(CENTER, p).toFixed(0) : '?'} NM; ` +
        `enroute entries: ${entries.map((e) => `${e}@${distanceNm(CENTER, position(e!)!).toFixed(0)}`).join(' ')}`,
    );
  }
}

// ---- Main --------------------------------------------------------------------

function write(name: string, data: unknown, pretty = true) {
  writeFileSync(`${OUTPUT_DIR}${name}`, `${JSON.stringify(data, null, pretty ? 2 : undefined)}\n`);
}

async function main() {
  console.log('Building New York airspace pack');

  console.log('- FAA CIFP', CIFP_CYCLE);
  const cifpZip = await cachedDownload(
    `https://aeronav.faa.gov/Upload_313-d/cifp/CIFP_${CIFP_CYCLE}.zip`,
    `cifp/CIFP_${CIFP_CYCLE}.zip`,
  );
  const cifp = parseCifp(
    text(onlyFile(unzipMatching(cifpZip, /FAACIFP18$/), /FAACIFP18$/)),
    AIRPORTS,
  );

  console.log('- FAA NASR', NASR_EDITION);
  const frequencyCsv = text(
    onlyFile(
      unzipMatching(
        await cachedDownload(
          `https://nfdc.faa.gov/webContent/28DaySub/extra/${NASR_CSV_EDITION}_FRQ_CSV.zip`,
          `nasr/${NASR_CSV_EDITION}_FRQ_CSV.zip`,
        ),
        /FRQ\.csv$/,
      ),
      /FRQ\.csv$/,
    ),
  );
  const artccText = text(
    onlyFile(
      unzipMatching(
        await cachedDownload(
          `https://nfdc.faa.gov/webContent/28DaySub/${NASR_EDITION}/AFF.zip`,
          `nasr/${NASR_EDITION}_AFF.zip`,
        ),
        /AFF\.txt$/,
      ),
      /AFF\.txt$/,
    ),
  );

  const airports = buildAirports(cifp, frequencyCsv);
  const runwayIds = (icao: string) =>
    airports.find((a) => a.icao === icao)!.runways.map((r) => r.id);

  const arrivals = buildTerminalProcedures(
    cifp.procedures.filter((p) => p.kind === 'E'),
    STAR_ROUTE_TYPES,
    runwayIds,
  );
  const departures = buildTerminalProcedures(
    cifp.procedures.filter((p) => p.kind === 'D'),
    SID_ROUTE_TYPES,
    runwayIds,
  );
  const approaches = buildIlsApproaches(cifp.procedures.filter((p) => p.kind === 'F'));
  const includedProcedureRecords = cifp.procedures.filter(
    (p) => p.kind !== 'F' || approaches.some((a) => a.airport === p.airport && a.id === p.id),
  );
  const fixes = buildNavdata(cifp, includedProcedureRecords);

  const round = ([lon, lat]: number[]): [number, number] => [
    Math.round(lon! * 1e5) / 1e5,
    Math.round(lat! * 1e5) / 1e5,
  ];
  const box = boxAround(CENTER, MAP_RADIUS_NM);

  console.log('- FAA Class B and C airspace');
  type ClassFeature = {
    properties: { NAME: string; CLASS: string; LOWER_VAL: number; UPPER_VAL: number };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  };
  const classAirspace = JSON.parse(
    text(
      await cachedDownload(
        'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Class_Airspace/FeatureServer/0/query' +
          `?where=${encodeURIComponent("CLASS IN ('B','C')")}` +
          `&geometry=${box.minLon},${box.minLat},${box.maxLon},${box.maxLat}` +
          '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects' +
          '&outFields=NAME,CLASS,LOWER_VAL,UPPER_VAL&outSR=4326&f=geojson',
        `faa/class-bc-${BOUNDARY_RADIUS_NM}nm.geojson`,
      ),
    ),
  ) as { features: ClassFeature[] };
  const classAreas = (cls: string) =>
    classAirspace.features
      .filter((f) => f.properties.CLASS === cls)
      .flatMap((f) => {
        // Polygons have one outer ring; multipolygons several.
        const rings =
          f.geometry.type === 'MultiPolygon'
            ? (f.geometry.coordinates as number[][][][]).map((polygon) => polygon[0]!)
            : [(f.geometry.coordinates as number[][][])[0]!];
        return rings.map((ring) => ({
          name: titleCase(f.properties.NAME.replace(/ CLASS [BC].*$/, '')),
          floorFt: Math.max(0, f.properties.LOWER_VAL),
          ceilingFt: f.properties.UPPER_VAL,
          // Arcs come densely sampled; a few meters' tolerance is invisible on the scope.
          ring: simplify(ring.map(round), CLASS_AIRSPACE_TOLERANCE_M),
        }));
      });

  console.log('- FAA minimum vectoring and minimum IFR altitudes');
  const altitudeCharts = async (charts: readonly string[], kind: 'mva' | 'mia') =>
    (
      await Promise.all(
        charts.map(async (chart) =>
          parseMva(
            text(
              await cachedDownload(
                `https://aeronav.faa.gov/MVA_Charts/aixm/${chart}.xml`,
                `faa/${chart}.xml`,
              ),
            ),
          ).map((sector) => ({ ...sector, kind, chart })),
        ),
      )
    ).flat();
  const mvaSectors = await altitudeCharts(MVA_CHARTS, 'mva');
  const miaSectors = await altitudeCharts(MIA_CHARTS, 'mia');
  const mva = mvaSectors.filter((sector) => sector.chart.startsWith('N90'));
  // Keep only sectors that reach into the map area.
  const nearMap = (sector: { exterior: number[][] }) =>
    sector.exterior.some(
      ([lon, lat]) => distanceNm(CENTER, { lat: lat!, lon: lon! }) <= MAP_RADIUS_NM,
    );
  const altitudeSectors = [...mvaSectors, ...miaSectors].filter(nearMap);

  console.log('- FAA NASR ARTCC boundaries');
  const artccBoundaries = parseArtccBoundaries(
    text(
      onlyFile(
        unzipMatching(
          await cachedDownload(
            `https://nfdc.faa.gov/webContent/28DaySub/${NASR_EDITION}/ARB.zip`,
            `nasr/${NASR_EDITION}_ARB.zip`,
          ),
          /ARB\.txt$/,
        ),
        /ARB\.txt$/,
      ),
    ),
    [HOME_CENTER, ...ADJACENT_CENTERS],
  );

  console.log('- US Census TIGER shoreline');
  // Full detail near the airports; farther out, only larger water bodies at a coarser tolerance.
  const detailedBox = boxAround(CENTER, DETAILED_SHORELINE_RADIUS_NM);
  const detailed = await buildShoreline({
    box: detailedBox,
    minWaterAreaM2: 150_000,
    simplifyToleranceMeters: 15,
    minLineLengthMeters: 400,
  });
  const regional = await buildShoreline({
    box,
    minWaterAreaM2: 10_000_000,
    simplifyToleranceMeters: 150,
    minLineLengthMeters: 5_000,
  });
  const shoreline = {
    lines: [
      ...detailed.lines,
      ...regional.lines.filter((line) => !line.every((point) => inBox(point, detailedBox))),
    ],
  };

  const centerController = (id: string) => ({
    id,
    callsign: CENTER_NAMES[id]!,
    sites: parseCenterSites(artccText, id)
      .filter((site) => distanceNm(CENTER, site.position) <= CENTER_SITE_RADIUS_NM)
      .map((site) => ({
        name: titleCase(site.site),
        position: site.position,
        frequencies: site.frequencies,
      })),
  });
  const homeCenter = centerController(HOME_CENTER);
  const adjacentCenters = ADJACENT_CENTERS.map(centerController).filter((c) => c.sites.length > 0);
  const airways = buildAirways(cifp);
  const mapAirports = buildMapAirports(cifp);

  const jfk = airports.find((a) => a.icao === 'KJFK')!;

  console.log('- FAA NASR radars');
  const rdrCsv = text(
    onlyFile(
      unzipMatching(
        await cachedDownload(
          `https://nfdc.faa.gov/webContent/28DaySub/extra/${NASR_CSV_EDITION}_RDR_CSV.zip`,
          `nasr/${NASR_CSV_EDITION}_RDR_CSV.zip`,
        ),
        /RDR\.csv$/,
      ),
      /RDR\.csv$/,
    ),
  );
  const arcSites = findRadarSites(
    mvaSectors.flatMap((sector) => [sector.exterior, ...sector.holes]),
    RADAR_MIN_ARC_NM,
    CENTER.lat,
  );
  const radars = buildRadarSites(cifp, arcSites, rdrCsv);

  // The JFK airport surveillance radar: the MVA chart's long range arcs are centered on it.
  const radarSite = findRadarSites(
    mva.flatMap((sector) => [sector.exterior, ...sector.holes]),
    RADAR_MIN_ARC_NM,
    CENTER.lat,
  ).find((site) => distanceNm(site, jfk.position) < 2);
  if (!radarSite) throw new Error('JFK radar site not found in the MVA chart');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  write('airspace.json', {
    schemaVersion: AIRSPACE_SCHEMA_VERSION,
    id: 'new-york',
    name: 'New York',
    facility: 'N90',
    description:
      'New York TRACON and the surrounding Center airspace: arrivals, departures and overflights for Kennedy, LaGuardia and Newark.',
    center: CENTER,
    magneticVariationDeg: jfk.magneticVariationDeg,
    radar: {
      name: 'JFK ASR',
      position: {
        lat: Math.round(radarSite.lat * 1e5) / 1e5,
        lon: Math.round(radarSite.lon * 1e5) / 1e5,
      },
      rangeNm: Math.max(...radarSite.arcRadiiNm),
    },
    radars: radars.map(({ source: _source, ...site }) => site),
    boundary: { ring: circleRing(CENTER, BOUNDARY_RADIUS_NM), ceilingFt: BOUNDARY_CEILING_FT },
    transitionAltitudeFt: 18_000,
    airports: [...AIRPORTS],
    controllers: {
      approach: {
        id: 'N90',
        approachCallsign: 'New York Approach',
        departureCallsign: 'New York Departure',
      },
      center: homeCenter,
      adjacentCenters,
    },
    sources: [
      {
        name: 'FAA Coded Instrument Flight Procedures (CIFP)',
        url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/',
        edition: `Cycle ${CIFP_CYCLE}`,
        usedFor: 'Airports, runways, ILS, fixes, arrival, departure and approach procedures',
      },
      {
        name: 'FAA National Airspace System Resources (NASR)',
        url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/',
        edition: NASR_EDITION,
        usedFor: 'Tower frequencies, Center radio sites, ARTCC boundaries and ASR radar sites',
      },
      {
        name: 'FAA Class Airspace',
        url: 'https://adds-faa.opendata.arcgis.com/',
        edition: 'Retrieved with this build',
        usedFor: 'Class B and C airspace',
      },
      {
        name: 'FAA Minimum Vectoring Altitude charts',
        url: 'https://aeronav.faa.gov/MVA_Charts/',
        edition: [...MVA_CHARTS, ...MIA_CHARTS].join(', '),
        usedFor:
          'Minimum vectoring and minimum IFR altitudes, and the JFK radar antenna position (center of its range arcs)',
      },
      {
        name: 'US Census Bureau TIGER/Line and cartographic boundary files',
        url: 'https://www.census.gov/geographies/mapping-files.html',
        edition: '2024',
        usedFor: 'Shoreline',
      },
    ],
  });
  write('airports.json', { schemaVersion: AIRSPACE_SCHEMA_VERSION, airports });
  write('navdata.json', { schemaVersion: AIRSPACE_SCHEMA_VERSION, fixes });
  write('procedures.json', {
    schemaVersion: AIRSPACE_SCHEMA_VERSION,
    arrivals,
    departures,
    approaches,
  });
  write(
    'video-map.json',
    {
      schemaVersion: AIRSPACE_SCHEMA_VERSION,
      shoreline: shoreline.lines,
      classB: classAreas('B'),
      classC: classAreas('C'),
      minimumVectoringAltitudes: altitudeSectors.map((sector) => ({
        name: sector.name,
        kind: sector.kind,
        minimumAltitudeFt: sector.minimumAltitudeFt,
        exterior: sector.exterior.map(round),
        holes: sector.holes.map((hole) => hole.map(round)),
      })),
      airways,
      airports: mapAirports,
      artccBoundaries: artccBoundaries.map(({ artcc, level, ring }) => ({ artcc, level, ring })),
    },
    false,
  );

  console.log(
    `\n  ${airports.length} airports, ${airports.reduce((n, a) => n + a.runways.length, 0)} runway ends, ` +
      `${arrivals.length} arrivals, ${departures.length} departures, ${approaches.length} ILS approaches, ` +
      `${fixes.length} fixes, ${classAreas('B').length} Class B and ${classAreas('C').length} Class C areas, ` +
      `${altitudeSectors.length} MVA/MIA sectors, ${airways.length} airway lines, ${mapAirports.length} other airports, ` +
      `${artccBoundaries.length} ARTCC boundaries, ${shoreline.lines.length} shoreline lines, ` +
      `${[homeCenter, ...adjacentCenters].map((c) => `${c.id} ${c.sites.length}`).join(', ')} Center sites`,
  );
  printBoundaryDiagnostics(arrivals, fixes);
}

await main();
