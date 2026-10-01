import { z } from 'zod';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { Airline } from '../airspace/schema';
import { bearingTrue, distanceNm, trueToMagnetic, type LatLon } from '../math/geo';
import type { SeededRandom } from '../random/seeded-random';
import { atisSchema } from '../weather/atis';
import { requestedCruiseAltitude } from './cruise-levels';
import {
  generateWinds,
  liveWeatherReportSchema,
  manualWinds,
  type LiveWeatherReport,
  selectRunwayConfig,
  windSchema,
  type Wind,
} from '../weather/wind';

// Airport operations: wind, active runways and departure queues. Kept in the
// sim state so saved sessions resume exactly.

export const departureEntrySchema = z.object({
  id: z.string(),
  callsign: z.string(),
  telephony: z.string().optional(),
  aircraftType: z.string(),
  squawk: z.string().regex(/^[0-7]{4}$/),
  airport: z.string(),
  destination: z.string(),
  /** Exit fix of the departure gate, e.g. 'MERIT'. */
  gateFix: z.string(),
  /** Cruising altitude the flight filed for. */
  requestedAltitudeFt: z.number().int().positive().optional(),
  readyAtTick: z.number().int().min(0),
  /** 'waiting' for a runway; 'cleared' for takeoff (lining up or waiting for the runway). */
  status: z.enum(['waiting', 'cleared']),
  runway: z.string().optional(),
  readbackAtTick: z.number().int().optional(),
  takeoffAtTick: z.number().int().optional(),
});

export type DepartureEntry = z.infer<typeof departureEntrySchema>;

export const activeRunwaysSchema = z.object({
  configId: z.string(),
  arrivals: z.array(z.string()).min(1),
  departures: z.array(z.string()).min(1),
  /** The player picked this configuration: the wind doesn't change it. */
  chosenByPlayer: z.boolean().optional(),
});

export type ActiveRunways = z.infer<typeof activeRunwaysSchema>;

export const operationsStateSchema = z.object({
  /** Wind at each airport now (changes over the session with wind variation). */
  winds: z.record(z.string(), windSchema),
  /** Wind at each airport when the session started, which the wind varies around. */
  baseWinds: z.record(z.string(), windSchema).optional(),
  /** Seed for how the wind varies, fixed for the session. */
  windSeed: z.number().int().min(0).optional(),
  /** Latest live weather report per airport (live wind mode). */
  liveWeather: z.record(z.string(), liveWeatherReportSchema).optional(),
  /** Each airport's current ATIS broadcast. */
  atis: z.record(z.string(), atisSchema).optional(),
  runways: z.record(z.string(), activeRunwaysSchema),
  /** Runway changes announced for when the wind no longer suits the runways, by airport. */
  pendingRunwayChanges: z
    .record(z.string(), activeRunwaysSchema.extend({ atTick: z.number().int().min(0) }))
    .default({}),
  /** When each airport last changed runways (to avoid changing back and forth). */
  lastRunwayChangeTick: z.record(z.string(), z.number().int()).default({}),
  departureQueue: z.array(departureEntrySchema),
  /** Departures ready but held at the gate because the queue is full, per airport. */
  gateHolds: z.record(z.string(), z.number().int().min(0)),
  nextDepartureTick: z.record(z.string(), z.number().int()),
  nextArrivalTick: z.record(z.string(), z.number().int()).default({}),
  nextTransitTick: z.number().int().default(0),
  /** Earliest tick each runway ('KJFK:22R') is free for the next takeoff. */
  runwayFreeTick: z.record(z.string(), z.number().int()),
  nextDepartureNumber: z.number().int().positive(),
});

export type OperationsState = z.infer<typeof operationsStateSchema>;

/**
 * Live winds from weather reports: METAR winds are true, the sim's are magnetic
 * (like an ATIS), to the nearest 10°. Variable or calm wind has no direction.
 */
export function liveWinds(
  reports: readonly LiveWeatherReport[],
  airports: readonly string[],
  magneticVariationDeg: number,
): Record<string, Wind> {
  const winds: Record<string, Wind> = {};
  for (const report of reports) {
    if (!airports.includes(report.icao)) continue;
    const directionDeg =
      report.windDirectionTrueDeg === null || report.windSpeedKts <= 0
        ? 0
        : Math.round(trueToMagnetic(report.windDirectionTrueDeg, magneticVariationDeg) / 10) * 10 ||
          360;
    const speedKts = Math.round(report.windSpeedKts);
    // Gusts as the report gives them (the station decides when they are worth reporting).
    winds[report.icao] =
      report.gustKts !== undefined && report.gustKts > speedKts && directionDeg !== 0
        ? { directionDeg, speedKts, gustKts: Math.round(report.gustKts) }
        : { directionDeg, speedKts };
  }
  return winds;
}

/** Initial departures waiting at each airport when a session starts. */
const INITIAL_QUEUE = 2;
const MAX_GATE_HOLDS = 99;

export interface OperationsSettings {
  windMode: 'live' | 'random' | 'manual';
  manualWind: Wind;
  /** Live mode: the latest reports (airports without one get a random wind). */
  liveWeather?: readonly LiveWeatherReport[];
  magneticVariationDeg?: number;
  maxTailwindKts: number;
  maxCrosswindKts: number;
  departureRatePerHour: number;
  maxDepartureQueue: number;
  /** Runway configuration ids chosen by the player, by airport; otherwise the wind decides. */
  runwayConfigs?: Readonly<Record<string, string>>;
}

/** Picks from weighted options. */
export function weightedPick<T extends { weight: number }>(
  random: SeededRandom,
  options: readonly T[],
): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let pick = random.range(0, total);
  for (const option of options) {
    pick -= option.weight;
    if (pick < 0) return option;
  }
  return options[options.length - 1]!;
}

export function initialOperations(
  pack: AirspacePack,
  random: SeededRandom,
  settings: OperationsSettings,
  tick: number,
): OperationsState {
  const airports = pack.airspace.airports;
  const winds =
    settings.windMode === 'manual'
      ? manualWinds(airports, settings.manualWind)
      : generateWinds(random, airports);
  if (settings.windMode === 'live' && settings.liveWeather)
    Object.assign(
      winds,
      liveWinds(settings.liveWeather, airports, settings.magneticVariationDeg ?? 0),
    );
  const runways: Record<string, ActiveRunways> = {};
  for (const icao of airports) {
    const configs = pack.traffic.airports[icao]!.runwayConfigs;
    const chosen = configs.find((config) => config.id === settings.runwayConfigs?.[icao]);
    const config =
      chosen ??
      selectRunwayConfig(
        configs,
        (runway) => pack.runway(icao, runway).magneticHeadingDeg,
        winds[icao]!,
        { maxTailwindKts: settings.maxTailwindKts, maxCrosswindKts: settings.maxCrosswindKts },
      );
    runways[icao] = {
      configId: config.id,
      arrivals: [...config.arrivals],
      departures: [...config.departures],
      ...(chosen ? { chosenByPlayer: true } : {}),
    };
  }
  return {
    winds,
    baseWinds: Object.fromEntries(Object.entries(winds).map(([icao, wind]) => [icao, { ...wind }])),
    // From the generator's state without drawing from it, so traffic is unchanged.
    windSeed: (random.getState() ^ 0x5bd1e995) >>> 0,
    ...(settings.windMode === 'live' && settings.liveWeather
      ? {
          liveWeather: Object.fromEntries(
            settings.liveWeather
              .filter((report) => airports.includes(report.icao))
              .map((report) => [report.icao, { ...report }]),
          ),
        }
      : {}),
    runways,
    pendingRunwayChanges: {},
    lastRunwayChangeTick: {},
    departureQueue: [],
    gateHolds: Object.fromEntries(airports.map((icao) => [icao, 0])),
    nextDepartureTick: Object.fromEntries(airports.map((icao) => [icao, tick])),
    nextArrivalTick: Object.fromEntries(airports.map((icao) => [icao, tick])),
    nextTransitTick: tick,
    runwayFreeTick: {},
    nextDepartureNumber: 1,
  };
}

/** "Never" for spawn scheduling: about 30 years of 1-second ticks. */
export const NEVER_TICKS = 1_000_000_000;

/** Ticks until the next departure is ready at an airport, around the configured rate. */
export function departureInterval(
  random: SeededRandom,
  ratePerHour: number,
  tickSeconds: number,
): number {
  // Off: far in the future, but small enough to add to any tick and still be a safe
  // integer in a saved session (turning the rate back on reschedules at once).
  if (ratePerHour <= 0) return NEVER_TICKS;
  const meanSeconds = 3600 / ratePerHour;
  return Math.max(1, Math.round((meanSeconds * random.range(0.6, 1.4)) / tickSeconds));
}

export interface NewDepartureContext {
  pack: AirspacePack;
  airlines: ReadonlyMap<string, Airline>;
  random: SeededRandom;
  /** Callsigns already in use (on the scope or in a queue). */
  callsignsInUse: ReadonlySet<string>;
  hasPerformance: (aircraftType: string) => boolean;
  /** Certified ceiling of an aircraft type. */
  ceilingFt: (aircraftType: string) => number;
  /** 'varied' evens out the airline mix so smaller carriers show up more often. */
  fleetMix: FleetMix;
}

export type FleetMix = 'realistic' | 'varied';

/** How strongly 'varied' flattens airline weights (1 would keep them as they are). */
const VARIED_WEIGHT_EXPONENT = 0.3;

/** Airline weights for a fleet mix. */
export function airlineMix<T extends { weight: number }>(
  airlines: readonly T[],
  mix: FleetMix,
): T[] {
  return mix === 'varied'
    ? airlines.map((airline) => ({ ...airline, weight: airline.weight ** VARIED_WEIGHT_EXPONENT }))
    : [...airlines];
}

/** A new departure for an airport, with a realistic airline, type, destination and exit gate. */
export function newDepartureEntry(
  context: NewDepartureContext,
  operations: OperationsState,
  airport: string,
  tick: number,
): DepartureEntry {
  const { pack, random } = context;
  const traffic = pack.traffic.airports[airport]!;

  const airline = weightedPick(random, airlineMix(traffic.airlines, context.fleetMix));
  const types = airline.types.filter(context.hasPerformance);
  const info = context.airlines.get(airline.icao);
  const [low, high] = info?.flightNumbers ?? [100, 2999];
  let callsign = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    callsign = `${airline.icao}${random.int(low, high)}`;
    if (!context.callsignsInUse.has(callsign)) break;
  }

  const served = airline.destinations
    ? traffic.destinations.filter((d) => airline.destinations!.includes(d.icao))
    : traffic.destinations;
  const destination = weightedPick(random, served.length > 0 ? served : traffic.destinations);
  const gateFix = random.pick(pack.traffic.departureGates[destination.gate]!);

  const aircraftType = random.pick(types.length > 0 ? types : airline.types);
  const trip = tripBetween(pack, pack.airport(airport).position, destination.icao);
  return {
    id: `D${operations.nextDepartureNumber++}`,
    callsign,
    ...(info ? { telephony: info.telephony } : {}),
    aircraftType,
    squawk: departureSquawk(random),
    airport,
    destination: destination.icao,
    gateFix,
    requestedAltitudeFt: requestedCruiseAltitude(
      random,
      trip.distanceNm,
      trueToMagnetic(trip.courseDeg, pack.airspace.magneticVariationDeg),
      context.ceilingFt(aircraftType),
    ),
    readyAtTick: tick,
    status: 'waiting',
  };
}

/** Typical trip when a city's position isn't in the traffic profile. */
const DEFAULT_TRIP_NM = 600;

/** Great-circle distance and initial true course from a position to a city in the traffic profile. */
export function tripBetween(
  pack: AirspacePack,
  from: LatLon,
  city: string,
): { distanceNm: number; courseDeg: number } {
  const to = pack.traffic.cityPositions[city];
  if (!to) return { distanceNm: DEFAULT_TRIP_NM, courseDeg: 0 };
  return { distanceNm: distanceNm(from, to), courseDeg: bearingTrue(from, to) };
}

/** A discrete transponder code, avoiding VFR (1200) and emergency codes. */
function departureSquawk(random: SeededRandom): string {
  for (;;) {
    const code = `${random.int(1, 6)}${random.int(0, 7)}${random.int(0, 7)}${random.int(0, 7)}`;
    if (code !== '1200') return code;
  }
}

export const queuedAt = (operations: OperationsState, airport: string) =>
  operations.departureQueue.filter((entry) => entry.airport === airport).length;

export { INITIAL_QUEUE, MAX_GATE_HOLDS };
