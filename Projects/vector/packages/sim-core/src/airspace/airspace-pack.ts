import { z } from 'zod';
import { headingDifference, normalizeHeading } from '../math/angles';
import {
  airportsFileSchema,
  airspaceFileSchema,
  navdataFileSchema,
  proceduresFileSchema,
  videoMapFileSchema,
  type Airport,
  type AirspaceFile,
  type Fix,
  type IlsApproach,
  type ProcedureLeg,
  type Runway,
  type TerminalProcedure,
  type VideoMap,
} from './schema';

/** Raw contents of the files in data/airspaces/<id>/. */
export interface AirspacePackFiles {
  airspace: unknown;
  airports: unknown;
  navdata: unknown;
  procedures: unknown;
  videoMap: unknown;
}

export class AirspaceDataError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid airspace data:\n- ${problems.join('\n- ')}`);
    this.name = 'AirspaceDataError';
  }
}

/** Largest allowed difference between an ILS course and its runway heading. */
const MAX_LOCALIZER_OFFSET_DEG = 5;
/** Largest allowed difference between a runway's true heading and magnetic heading + variation. */
const MAX_RUNWAY_HEADING_ERROR_DEG = 3;

/** A validated, cross-checked airspace pack with lookups. */
export class AirspacePack {
  private readonly airportsByIcao: ReadonlyMap<string, Airport>;
  private readonly fixesByIdent: ReadonlyMap<string, Fix>;

  private constructor(
    readonly airspace: AirspaceFile,
    readonly airports: readonly Airport[],
    readonly fixes: readonly Fix[],
    readonly arrivals: readonly TerminalProcedure[],
    readonly departures: readonly TerminalProcedure[],
    readonly approaches: readonly IlsApproach[],
    readonly videoMap: VideoMap,
  ) {
    this.airportsByIcao = new Map(airports.map((airport) => [airport.icao, airport]));
    this.fixesByIdent = new Map(fixes.map((fix) => [fix.ident, fix]));
  }

  static parse(files: AirspacePackFiles): AirspacePack {
    const parse = <T>(name: string, schema: z.ZodType<T>, data: unknown): T => {
      const result = schema.safeParse(data);
      if (!result.success)
        throw new AirspaceDataError([`${name}: ${z.prettifyError(result.error)}`]);
      return result.data;
    };
    const airspace = parse('airspace.json', airspaceFileSchema, files.airspace);
    const { airports } = parse('airports.json', airportsFileSchema, files.airports);
    const { fixes } = parse('navdata.json', navdataFileSchema, files.navdata);
    const procedures = parse('procedures.json', proceduresFileSchema, files.procedures);
    const videoMap = parse('video-map.json', videoMapFileSchema, files.videoMap);

    const pack = new AirspacePack(
      airspace,
      airports,
      fixes,
      procedures.arrivals,
      procedures.departures,
      procedures.approaches,
      videoMap,
    );
    const problems = pack.crossCheck();
    if (problems.length > 0) throw new AirspaceDataError(problems);
    return pack;
  }

  airport(icao: string): Airport {
    const airport = this.airportsByIcao.get(icao);
    if (!airport) throw new Error(`Unknown airport "${icao}"`);
    return airport;
  }

  runway(icao: string, id: string): Runway {
    const runway = this.airport(icao).runways.find((candidate) => candidate.id === id);
    if (!runway) throw new Error(`Unknown runway ${icao} ${id}`);
    return runway;
  }

  fix(ident: string): Fix | undefined {
    return this.fixesByIdent.get(ident);
  }

  ilsApproaches(icao: string, runway: string): IlsApproach[] {
    return this.approaches.filter(
      (approach) => approach.airport === icao && approach.runway === runway,
    );
  }

  private crossCheck(): string[] {
    const problems: string[] = [];
    const declared = new Set(this.airspace.airports);

    for (const icao of declared) {
      if (!this.airportsByIcao.has(icao))
        problems.push(`Airport ${icao} is declared but has no data`);
    }
    for (const airport of this.airports) {
      if (!declared.has(airport.icao))
        problems.push(`Airport ${airport.icao} is not declared in airspace.json`);
      problems.push(...checkRunways(airport));
    }

    const checkLegs = (where: string, airport: string, legs: readonly ProcedureLeg[]) => {
      for (const leg of legs) {
        if (leg.fix && !this.fixesByIdent.has(leg.fix))
          problems.push(`${where}: unknown fix ${leg.fix}`);
        if (
          leg.runway &&
          !this.airportsByIcao.get(airport)?.runways.some((r) => r.id === leg.runway)
        ) {
          problems.push(`${where}: unknown runway ${leg.runway}`);
        }
      }
    };

    for (const procedure of [...this.arrivals, ...this.departures]) {
      const where = `${procedure.airport} ${procedure.id}`;
      if (!declared.has(procedure.airport)) problems.push(`${where}: airport not in this airspace`);
      for (const segment of [
        ...procedure.enrouteTransitions,
        ...procedure.commonRoutes,
        ...procedure.runwayTransitions,
      ]) {
        checkLegs(`${where} ${segment.name}`, procedure.airport, segment.legs);
      }
    }

    for (const approach of this.approaches) {
      const where = `${approach.airport} ${approach.id}`;
      const runway = this.airportsByIcao
        .get(approach.airport)
        ?.runways.find((r) => r.id === approach.runway);
      if (!runway) {
        problems.push(`${where}: unknown runway ${approach.runway}`);
        continue;
      }
      if (runway.ils?.ident !== approach.localizer) {
        problems.push(
          `${where}: localizer ${approach.localizer} does not match runway ILS ${runway.ils?.ident}`,
        );
      }
      for (const segment of approach.transitions)
        checkLegs(`${where} ${segment.name}`, approach.airport, segment.legs);
      checkLegs(`${where} final`, approach.airport, approach.final);
      checkLegs(`${where} missed approach`, approach.airport, approach.missedApproach);
    }
    return problems;
  }
}

function checkRunways(airport: Airport): string[] {
  const problems: string[] = [];
  for (const runway of airport.runways) {
    const where = `${airport.icao} runway ${runway.id}`;
    if (!airport.runways.some((candidate) => candidate.id === runway.oppositeId)) {
      problems.push(`${where}: opposite end ${runway.oppositeId} missing`);
    }
    const expectedTrue = normalizeHeading(runway.magneticHeadingDeg + airport.magneticVariationDeg);
    if (
      Math.abs(headingDifference(expectedTrue, runway.trueHeadingDeg)) >
      MAX_RUNWAY_HEADING_ERROR_DEG
    ) {
      problems.push(
        `${where}: true heading ${runway.trueHeadingDeg} disagrees with magnetic heading`,
      );
    }
    if (
      runway.ils &&
      Math.abs(headingDifference(runway.magneticHeadingDeg, runway.ils.courseDeg)) >
        MAX_LOCALIZER_OFFSET_DEG
    ) {
      problems.push(`${where}: ILS course ${runway.ils.courseDeg} is not aligned with the runway`);
    }
  }
  return problems;
}
