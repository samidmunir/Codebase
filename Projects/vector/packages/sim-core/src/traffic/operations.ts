import { z } from 'zod';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { Airline } from '../airspace/schema';
import type { SeededRandom } from '../random/seeded-random';
import {
  generateWinds,
  manualWinds,
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
});

export type ActiveRunways = z.infer<typeof activeRunwaysSchema>;

export const operationsStateSchema = z.object({
  winds: z.record(z.string(), windSchema),
  runways: z.record(z.string(), activeRunwaysSchema),
  departureQueue: z.array(departureEntrySchema),
  /** Departures ready but held at the gate because the queue is full, per airport. */
  gateHolds: z.record(z.string(), z.number().int().min(0)),
  nextDepartureTick: z.record(z.string(), z.number().int()),
  nextArrivalTick: z.record(z.string(), z.number().int()).default({}),
  /** Earliest tick each runway ('KJFK:22R') is free for the next takeoff. */
  runwayFreeTick: z.record(z.string(), z.number().int()),
  nextDepartureNumber: z.number().int().positive(),
});

export type OperationsState = z.infer<typeof operationsStateSchema>;

/** Initial departures waiting at each airport when a session starts. */
const INITIAL_QUEUE = 2;
const MAX_GATE_HOLDS = 99;

export interface OperationsSettings {
  windMode: 'random' | 'manual';
  manualWind: Wind;
  maxTailwindKts: number;
  maxCrosswindKts: number;
  departureRatePerHour: number;
  maxDepartureQueue: number;
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
  const runways: Record<string, ActiveRunways> = {};
  for (const icao of airports) {
    const config = selectRunwayConfig(
      pack.traffic.airports[icao]!.runwayConfigs,
      (runway) => pack.runway(icao, runway).magneticHeadingDeg,
      winds[icao]!,
      { maxTailwindKts: settings.maxTailwindKts, maxCrosswindKts: settings.maxCrosswindKts },
    );
    runways[icao] = {
      configId: config.id,
      arrivals: [...config.arrivals],
      departures: [...config.departures],
    };
  }
  return {
    winds,
    runways,
    departureQueue: [],
    gateHolds: Object.fromEntries(airports.map((icao) => [icao, 0])),
    nextDepartureTick: Object.fromEntries(airports.map((icao) => [icao, tick])),
    nextArrivalTick: Object.fromEntries(airports.map((icao) => [icao, tick])),
    runwayFreeTick: {},
    nextDepartureNumber: 1,
  };
}

/** Ticks until the next departure is ready at an airport, around the configured rate. */
export function departureInterval(
  random: SeededRandom,
  ratePerHour: number,
  tickSeconds: number,
): number {
  if (ratePerHour <= 0) return Number.MAX_SAFE_INTEGER;
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

  const airline = weightedPick(random, traffic.airlines);
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

  return {
    id: `D${operations.nextDepartureNumber++}`,
    callsign,
    ...(info ? { telephony: info.telephony } : {}),
    aircraftType: random.pick(types.length > 0 ? types : airline.types),
    squawk: departureSquawk(random),
    airport,
    destination: destination.icao,
    gateFix,
    readyAtTick: tick,
    status: 'waiting',
  };
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
