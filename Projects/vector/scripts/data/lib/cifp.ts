// Parser for the FAA CIFP (ARINC 424-18, 132-column records).
// Only the record types Vector uses are parsed. Column numbers in comments are
// 1-based, as in the ARINC 424 specification.

export interface LatLon {
  lat: number;
  lon: number;
}

/** Characters `start` to `end` (1-based, inclusive). */
const col = (line: string, start: number, end = start) => line.slice(start - 1, end);
const trimmed = (line: string, start: number, end = start) => col(line, start, end).trim();

function optionalNumber(value: string, scale = 1): number | undefined {
  const t = value.trim();
  if (t === '') return undefined;
  const n = Number(t);
  if (Number.isNaN(n)) throw new Error(`Not a number: "${value}"`);
  return n / scale;
}

/** 'N40372318' -> 40.623106 (hemisphere, DD, MM, SS.ss). */
export function parseLatitude(value: string): number {
  const match = /^([NS])(\d{2})(\d{2})(\d{4})$/.exec(value);
  if (!match) throw new Error(`Bad latitude "${value}"`);
  const [, hemisphere, d, m, s] = match;
  const degrees = Number(d) + Number(m) / 60 + Number(s) / 100 / 3600;
  return hemisphere === 'S' ? -degrees : degrees;
}

/** 'W073470505' -> -73.784847 (hemisphere, DDD, MM, SS.ss). */
export function parseLongitude(value: string): number {
  const match = /^([EW])(\d{3})(\d{2})(\d{4})$/.exec(value);
  if (!match) throw new Error(`Bad longitude "${value}"`);
  const [, hemisphere, d, m, s] = match;
  const degrees = Number(d) + Number(m) / 60 + Number(s) / 100 / 3600;
  return hemisphere === 'W' ? -degrees : degrees;
}

function position(line: string, latStart: number): LatLon {
  return {
    lat: parseLatitude(col(line, latStart, latStart + 8)),
    lon: parseLongitude(col(line, latStart + 9, latStart + 18)),
  };
}

/** 'W0130' -> -13 (east positive). */
export function parseVariation(value: string): number {
  const match = /^([EW])(\d{4})$/.exec(value);
  if (!match) throw new Error(`Bad magnetic variation "${value}"`);
  const degrees = Number(match[2]) / 10;
  return match[1] === 'W' ? -degrees : degrees;
}

/** '18000' -> 18000, 'FL190' -> 19000, blank -> undefined. */
export function parseAltitude(value: string): number | undefined {
  const t = value.trim();
  if (t === '') return undefined;
  if (t.startsWith('FL')) return Number(t.slice(2)) * 100;
  const n = Number(t);
  if (Number.isNaN(n)) throw new Error(`Bad altitude "${value}"`);
  return n;
}

// ---- Record classification ---------------------------------------------------

/** Two-letter section/subsection code, e.g. 'PG' (runway), 'EA' (enroute waypoint). */
export function sectionCode(line: string): string {
  const section = col(line, 5);
  // Airport (P) and heliport (H) records keep their subsection in column 13.
  return section === 'P' || section === 'H' ? section + col(line, 13) : section + col(line, 6);
}

/** Primary records only; continuation records (column 22 or 39 >= 2) hold extra data we don't use. */
function isPrimary(line: string, continuationColumn: number): boolean {
  const c = col(line, continuationColumn);
  return c === '0' || c === '1';
}

// ---- Airports, runways, localizers --------------------------------------------

export interface CifpAirport {
  icao: string;
  name: string;
  position: LatLon;
  magneticVariationDeg: number;
  elevationFt: number;
}

export function parseAirport(line: string): CifpAirport {
  return {
    icao: trimmed(line, 7, 10),
    name: trimmed(line, 94, 123),
    position: position(line, 33),
    magneticVariationDeg: parseVariation(col(line, 52, 56)),
    elevationFt: Number(col(line, 57, 61)),
  };
}

export interface CifpRunway {
  airport: string;
  /** '04L' */
  id: string;
  lengthFt: number;
  magneticBearingDeg: number;
  /** Landing threshold point. */
  threshold: LatLon;
  thresholdElevationFt: number;
  displacedThresholdFt: number;
  thresholdCrossingHeightFt: number | undefined;
  widthFt: number;
  localizer: string | undefined;
}

export function parseRunway(line: string): CifpRunway {
  return {
    airport: trimmed(line, 7, 10),
    id: trimmed(line, 16, 18),
    lengthFt: Number(col(line, 23, 27)),
    magneticBearingDeg: Number(col(line, 28, 31)) / 10,
    threshold: position(line, 33),
    thresholdElevationFt: Number(col(line, 67, 71)),
    displacedThresholdFt: optionalNumber(col(line, 72, 75)) ?? 0,
    thresholdCrossingHeightFt: optionalNumber(col(line, 76, 77)),
    widthFt: Number(col(line, 78, 80)),
    localizer: trimmed(line, 82, 85) || undefined,
  };
}

export interface CifpLocalizer {
  airport: string;
  ident: string;
  category: string;
  frequencyMhz: number;
  runway: string;
  position: LatLon;
  /** Localizer course, magnetic. */
  courseDeg: number;
  glideslope:
    | { position: LatLon; angleDeg: number; thresholdCrossingHeightFt: number | undefined }
    | undefined;
}

export function parseLocalizer(line: string): CifpLocalizer {
  const hasGlideslope = col(line, 56, 64).trim() !== '';
  return {
    airport: trimmed(line, 7, 10),
    ident: trimmed(line, 14, 17),
    category: col(line, 18),
    frequencyMhz: Number(col(line, 23, 27)) / 100,
    runway: trimmed(line, 30, 32),
    position: position(line, 33),
    courseDeg: Number(col(line, 52, 55)) / 10,
    glideslope: hasGlideslope
      ? {
          position: position(line, 56),
          angleDeg: Number(col(line, 88, 90)) / 100,
          thresholdCrossingHeightFt: optionalNumber(col(line, 96, 97)),
        }
      : undefined,
  };
}

// ---- Fixes -------------------------------------------------------------------

export type FixKind = 'waypoint' | 'vor' | 'ndb';

export interface CifpFix {
  ident: string;
  /** Section code the fix was defined in ('EA', 'PC', 'D ', 'DB', 'PN'). */
  section: string;
  /** Airport for terminal fixes. */
  airport: string | undefined;
  kind: FixKind;
  position: LatLon;
  name: string | undefined;
  frequencyMhz: number | undefined;
  /** VHF navaid class (column 28): 'V' for VORs; blank for DME-only, TACAN and ILS/DME stations. */
  navaidClass: string | undefined;
}

export function parseWaypoint(line: string): CifpFix {
  const section = sectionCode(line);
  return {
    ident: trimmed(line, 14, 18),
    section,
    airport: section === 'PC' ? trimmed(line, 7, 10) : undefined,
    kind: 'waypoint',
    position: position(line, 33),
    name: trimmed(line, 99, 123) || undefined,
    frequencyMhz: undefined,
    navaidClass: undefined,
  };
}

export function parseVhfNavaid(line: string): CifpFix {
  // DME-only stations have no VOR position; use the DME position instead.
  const hasVor = col(line, 33, 41).trim() !== '';
  return {
    ident: trimmed(line, 14, 17),
    section: 'D ',
    airport: undefined,
    kind: 'vor',
    position: position(line, hasVor ? 33 : 56),
    name: trimmed(line, 94, 123) || undefined,
    frequencyMhz: Number(col(line, 23, 27)) / 100,
    navaidClass: col(line, 28, 32),
  };
}

export function parseNdb(line: string): CifpFix {
  const section = sectionCode(line);
  return {
    ident: trimmed(line, 14, 17),
    section,
    airport: section === 'PN' ? trimmed(line, 7, 10) : undefined,
    kind: 'ndb',
    position: position(line, 33),
    name: trimmed(line, 94, 123) || undefined,
    frequencyMhz: Number(col(line, 23, 27)) / 10,
    navaidClass: col(line, 28, 32),
  };
}

// ---- Procedures --------------------------------------------------------------

export type AltitudeConstraint =
  | { type: 'at'; ft: number }
  | { type: 'atOrAbove'; ft: number }
  | { type: 'atOrBelow'; ft: number }
  | { type: 'between'; minFt: number; maxFt: number };

export type SpeedConstraint = { type: 'at' | 'atOrAbove' | 'atOrBelow'; kts: number };

export interface CifpLeg {
  sequence: number;
  /** ARINC path and terminator, e.g. 'TF', 'CF', 'VA', 'HM'. */
  pathTerminator: string;
  fix: string | undefined;
  /** Section code of the fix ('EA', 'PC', 'D ', 'PG' for runways, ...). */
  fixSection: string | undefined;
  turnDirection: 'left' | 'right' | undefined;
  courseDeg: number | undefined;
  distanceNm: number | undefined;
  /** Hold leg time in minutes (instead of distance). */
  holdMinutes: number | undefined;
  recommendedNavaid: string | undefined;
  altitude: AltitudeConstraint | undefined;
  /** Glideslope intercept altitude (approach legs). */
  glideslopeInterceptFt: number | undefined;
  speed: SpeedConstraint | undefined;
  verticalAngleDeg: number | undefined;
  flyover: boolean;
  role: 'iaf' | 'if' | 'faf' | 'map' | undefined;
  /** First leg of the missed approach. */
  startsMissedApproach: boolean;
}

export interface CifpProcedureRecord {
  airport: string;
  /** 'D' SID, 'E' STAR, 'F' approach. */
  kind: 'D' | 'E' | 'F';
  id: string;
  routeType: string;
  transition: string;
  leg: CifpLeg;
}

function parseAltitudeConstraint(line: string): {
  altitude: AltitudeConstraint | undefined;
  glideslopeInterceptFt: number | undefined;
} {
  const description = col(line, 83);
  const first = parseAltitude(col(line, 85, 89));
  const second = parseAltitude(col(line, 90, 94));
  if (first === undefined) return { altitude: undefined, glideslopeInterceptFt: undefined };

  switch (description) {
    case '+':
      return { altitude: { type: 'atOrAbove', ft: first }, glideslopeInterceptFt: undefined };
    case '-':
      return { altitude: { type: 'atOrBelow', ft: first }, glideslopeInterceptFt: undefined };
    case 'B':
      return {
        altitude: {
          type: 'between',
          minFt: Math.min(first, second ?? first),
          maxFt: Math.max(first, second ?? first),
        },
        glideslopeInterceptFt: undefined,
      };
    case 'C':
      return {
        altitude: { type: 'atOrAbove', ft: second ?? first },
        glideslopeInterceptFt: undefined,
      };
    // G/I: at altitude 1, glideslope intercept at altitude 2. H/J: at or above altitude 1.
    case 'G':
    case 'I':
      return { altitude: { type: 'at', ft: first }, glideslopeInterceptFt: second };
    case 'H':
    case 'J':
      return { altitude: { type: 'atOrAbove', ft: first }, glideslopeInterceptFt: second };
    case ' ':
    case '@':
      return { altitude: { type: 'at', ft: first }, glideslopeInterceptFt: undefined };
    default:
      return { altitude: { type: 'atOrAbove', ft: first }, glideslopeInterceptFt: undefined };
  }
}

function parseSpeedConstraint(line: string): SpeedConstraint | undefined {
  const kts = optionalNumber(col(line, 100, 102));
  if (kts === undefined) return undefined;
  const description = col(line, 118);
  const type = description === '+' ? 'atOrAbove' : description === '-' ? 'atOrBelow' : 'at';
  return { type, kts };
}

const ROLES: Record<string, CifpLeg['role']> = {
  A: 'iaf',
  B: 'if',
  C: 'iaf',
  D: 'iaf',
  I: 'if',
  F: 'faf',
  M: 'map',
};

export function parseProcedureRecord(line: string): CifpProcedureRecord {
  const fix = trimmed(line, 30, 34) || undefined;
  const turn = col(line, 44);
  const distanceField = col(line, 75, 78);
  const isTime = distanceField.startsWith('T');
  const { altitude, glideslopeInterceptFt } = parseAltitudeConstraint(line);
  const verticalAngle = optionalNumber(col(line, 103, 106), 100);

  return {
    airport: trimmed(line, 7, 10),
    kind: col(line, 13) as 'D' | 'E' | 'F',
    id: trimmed(line, 14, 19),
    routeType: col(line, 20),
    transition: trimmed(line, 21, 25),
    leg: {
      sequence: Number(col(line, 27, 29)),
      pathTerminator: col(line, 48, 49),
      fix,
      fixSection: fix ? col(line, 37, 38) : undefined,
      turnDirection: turn === 'L' ? 'left' : turn === 'R' ? 'right' : undefined,
      courseDeg: optionalNumber(col(line, 71, 74), 10),
      distanceNm: isTime ? undefined : optionalNumber(distanceField, 10),
      holdMinutes: isTime ? optionalNumber(distanceField.slice(1), 10) : undefined,
      recommendedNavaid: trimmed(line, 51, 54) || undefined,
      altitude,
      glideslopeInterceptFt,
      speed: parseSpeedConstraint(line),
      verticalAngleDeg: verticalAngle,
      flyover: col(line, 41) === 'Y' || col(line, 41) === 'B',
      role: ROLES[col(line, 43)],
      startsMissedApproach: col(line, 42) === 'M',
    },
  };
}

// ---- Whole file --------------------------------------------------------------

export interface CifpData {
  airports: CifpAirport[];
  runways: CifpRunway[];
  localizers: CifpLocalizer[];
  fixes: CifpFix[];
  procedures: CifpProcedureRecord[];
}

/** Parses the records Vector needs, for the given airports' terminal data plus all enroute fixes and navaids. */
export function parseCifp(content: string, airports: readonly string[]): CifpData {
  const wanted = new Set(airports);
  const data: CifpData = { airports: [], runways: [], localizers: [], fixes: [], procedures: [] };

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith('S')) continue;
    const section = sectionCode(line);

    if (section === 'EA' && isPrimary(line, 22)) data.fixes.push(parseWaypoint(line));
    else if (section === 'D ' && isPrimary(line, 22)) data.fixes.push(parseVhfNavaid(line));
    else if (section === 'DB' && isPrimary(line, 22)) data.fixes.push(parseNdb(line));

    if (!section.startsWith('P') || !wanted.has(trimmed(line, 7, 10))) continue;

    if (section === 'PA' && isPrimary(line, 22)) data.airports.push(parseAirport(line));
    else if (section === 'PG' && isPrimary(line, 22)) data.runways.push(parseRunway(line));
    else if (section === 'PI' && isPrimary(line, 22)) data.localizers.push(parseLocalizer(line));
    else if (section === 'PC' && isPrimary(line, 22)) data.fixes.push(parseWaypoint(line));
    else if (section === 'PN' && isPrimary(line, 22)) data.fixes.push(parseNdb(line));
    else if ((section === 'PD' || section === 'PE' || section === 'PF') && isPrimary(line, 39)) {
      data.procedures.push(parseProcedureRecord(line));
    }
  }
  return data;
}
