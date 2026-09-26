// Builds the New York (N90) airspace pack in data/airspaces/new-york/ from
// public FAA and US Census data. Downloads are cached in data/.cache/.
//
//   npm run data:new-york
import { mkdirSync, writeFileSync } from 'node:fs';
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
import { boxAround } from './lib/geometry';
import { parseMva } from './lib/mva';
import { parseCenterSites, parseFrequencies } from './lib/nasr';
import { buildShoreline } from './lib/shoreline';

// ---- Configuration -------------------------------------------------------------

/** FAA 28-day AIRAC cycle to build from. Update both together. */
const CIFP_CYCLE = '260903';
const NASR_EDITION = '2026-09-03';
const NASR_CSV_EDITION = '03_Sep_2026';

const AIRPORTS = ['KJFK', 'KLGA', 'KEWR'] as const;
const CENTER = { lat: 40.72, lon: -73.95 };
/** Radius of the playable area (see printBoundaryDiagnostics). */
const BOUNDARY_RADIUS_NM = 45;
const BOUNDARY_CEILING_FT = 17_000;
/** Radius of video map geography. */
const MAP_RADIUS_NM = 60;
/** Center radio sites farther than this are left out. */
const CENTER_SITE_RADIUS_NM = 110;

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

  console.log('- FAA Class B airspace');
  const classB = JSON.parse(
    text(
      await cachedDownload(
        'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Class_Airspace/FeatureServer/0/query' +
          "?where=NAME+LIKE+'NEW+YORK%25'+AND+CLASS%3D'B'&outFields=NAME,LOWER_VAL,UPPER_VAL&f=geojson",
        'faa/classb-new-york.geojson',
      ),
    ),
  ) as {
    features: {
      properties: { LOWER_VAL: number; UPPER_VAL: number };
      geometry: { coordinates: number[][][] };
    }[];
  };

  console.log('- FAA minimum vectoring altitudes (N90)');
  const mva = parseMva(
    text(
      await cachedDownload(
        'https://aeronav.faa.gov/MVA_Charts/aixm/N90_MVA_FUS3.xml',
        'faa/N90_MVA_FUS3.xml',
      ),
    ),
  );

  console.log('- US Census TIGER shoreline');
  const shoreline = await buildShoreline({
    box: boxAround(CENTER, MAP_RADIUS_NM),
    minWaterAreaM2: 150_000,
    simplifyToleranceMeters: 15,
    minLineLengthMeters: 400,
  });

  const round = ([lon, lat]: number[]): [number, number] => [
    Math.round(lon! * 1e5) / 1e5,
    Math.round(lat! * 1e5) / 1e5,
  ];
  const centerSites = parseCenterSites(artccText, 'ZNY')
    .filter((site) => distanceNm(CENTER, site.position) <= CENTER_SITE_RADIUS_NM)
    .map((site) => ({
      name: titleCase(site.site),
      position: site.position,
      frequencies: site.frequencies,
    }));

  const jfk = airports.find((a) => a.icao === 'KJFK')!;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  write('airspace.json', {
    schemaVersion: AIRSPACE_SCHEMA_VERSION,
    id: 'new-york',
    name: 'New York',
    facility: 'N90',
    description: 'New York TRACON: arrivals and departures for Kennedy, LaGuardia and Newark.',
    center: CENTER,
    magneticVariationDeg: jfk.magneticVariationDeg,
    boundary: { ring: circleRing(CENTER, BOUNDARY_RADIUS_NM), ceilingFt: BOUNDARY_CEILING_FT },
    airports: [...AIRPORTS],
    controllers: {
      approach: {
        id: 'N90',
        approachCallsign: 'New York Approach',
        departureCallsign: 'New York Departure',
      },
      center: { id: 'ZNY', callsign: 'New York Center', sites: centerSites },
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
        usedFor: 'Tower frequencies and New York Center radio sites',
      },
      {
        name: 'FAA Class Airspace',
        url: 'https://adds-faa.opendata.arcgis.com/',
        edition: 'Retrieved with this build',
        usedFor: 'New York Class B airspace',
      },
      {
        name: 'FAA Minimum Vectoring Altitude charts',
        url: 'https://aeronav.faa.gov/MVA_Charts/',
        edition: 'N90 FUS3',
        usedFor: 'Minimum vectoring altitudes',
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
      classB: classB.features.map((f) => ({
        floorFt: f.properties.LOWER_VAL,
        ceilingFt: f.properties.UPPER_VAL,
        ring: f.geometry.coordinates[0]!.map(round),
      })),
      minimumVectoringAltitudes: mva.map((sector) => ({
        name: sector.name,
        minimumAltitudeFt: sector.minimumAltitudeFt,
        exterior: sector.exterior.map(round),
        holes: sector.holes.map((hole) => hole.map(round)),
      })),
    },
    false,
  );

  console.log(
    `\n  ${airports.length} airports, ${airports.reduce((n, a) => n + a.runways.length, 0)} runway ends, ` +
      `${arrivals.length} arrivals, ${departures.length} departures, ${approaches.length} ILS approaches, ` +
      `${fixes.length} fixes, ${classB.features.length} Class B areas, ${mva.length} MVA sectors, ` +
      `${shoreline.lines.length} shoreline lines, ${centerSites.length} Center sites`,
  );
  printBoundaryDiagnostics(arrivals, fixes);
}

await main();
