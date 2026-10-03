import { z } from 'zod';
import { flightKindSchema, flightTimerSchema, timingStatsSchema, type FlightKind } from './timing';

/** RP earned and lost by one flight. */
export const flightScoreSchema = z.object({
  kind: flightKindSchema.optional(),
  rp: z.number().int(),
  events: z.number().int().min(0),
  /** What it last scored for, e.g. 'landed JFK 22L'. */
  lastDetail: z.string().optional(),
  /** Its costliest event: what it lost the most RP for. */
  worstRp: z.number().int().optional(),
  worstDetail: z.string().optional(),
});
export type FlightScore = z.infer<typeof flightScoreSchema>;

// RP (reputation points): earned for moving traffic well, lost for unsafe or
// sloppy control. Every value comes from the session's scoring settings.

export const scoreKindSchema = z.enum([
  'landing',
  'departureHandoff',
  'transitHandoff',
  'separationLoss',
  'wakeLoss',
  'nearMidAir',
  'goAround',
  'leftWithoutHandoff',
  'onTime',
  'late',
]);
export type ScoreKind = z.infer<typeof scoreKindSchema>;

export const scoreEventSchema = z.object({
  id: z.string(),
  tick: z.number().int().min(0),
  kind: scoreKindSchema,
  /** RP gained (positive) or lost (negative). */
  rp: z.number().int(),
  callsigns: z.array(z.string()),
  /** Short explanation, e.g. 'landed 22L' or '2.1 NM, 400 ft'. */
  detail: z.string(),
});
export type ScoreEvent = z.infer<typeof scoreEventSchema>;

/** Recent score events kept in the session (older ones stay in the tally). */
export const MAX_SCORE_EVENTS = 200;

export const scoreStateSchema = z.object({
  total: z.number().int(),
  /** Count and RP per kind, for the breakdown. */
  tally: z.record(z.string(), z.object({ count: z.number().int(), rp: z.number().int() })),
  events: z.array(scoreEventSchema),
  nextEventNumber: z.number().int().positive(),
  /** Violations already scored as near midair collisions (not also as losses of separation). */
  nearMidAirViolations: z.array(z.string()),
  /** Target times of the flights the player is working, by aircraft id. */
  timers: z.record(z.string(), flightTimerSchema).default({}),
  /** Handling times of finished flights, by kind. */
  timing: z.partialRecord(flightKindSchema, timingStatsSchema).default({}),
  /** The RP total after each change, as [tick, total] (thinned out in long sessions). */
  rpHistory: z.array(z.tuple([z.number().int().min(0), z.number().int()])).default([]),
  /** RP per flight, by callsign, for the best and worst flights of the session. */
  flights: z.record(z.string(), flightScoreSchema).default({}),
});
export type ScoreState = z.infer<typeof scoreStateSchema>;

export const emptyScoreState = (): ScoreState => ({
  total: 0,
  tally: {},
  events: [],
  nextEventNumber: 1,
  nearMidAirViolations: [],
  timers: {},
  timing: {},
  rpHistory: [],
  flights: {},
});

/** RP history points kept; beyond this every other point is dropped. */
const MAX_RP_HISTORY = 720;
/** Flights whose RP is kept (the oldest go first). */
const MAX_FLIGHT_SCORES = 1_500;

/**
 * Adds an event to the score. Returns the recorded event. `kindOf` says what
 * kind of flight each callsign is, for the per-flight record.
 */
export function recordScore(
  state: ScoreState,
  event: Omit<ScoreEvent, 'id'>,
  kindOf?: (callsign: string) => FlightKind | undefined,
): ScoreEvent {
  const recorded = { ...event, id: `S${state.nextEventNumber++}` };
  state.total += recorded.rp;
  const tally = state.tally[recorded.kind] ?? { count: 0, rp: 0 };
  state.tally[recorded.kind] = { count: tally.count + 1, rp: tally.rp + recorded.rp };
  state.events.push(recorded);
  if (state.events.length > MAX_SCORE_EVENTS) state.events.shift();

  state.rpHistory.push([recorded.tick, state.total]);
  if (state.rpHistory.length > MAX_RP_HISTORY) {
    const last = state.rpHistory.at(-1)!;
    state.rpHistory = state.rpHistory.filter((_, i) => i % 2 === 0);
    if (state.rpHistory.at(-1) !== last) state.rpHistory.push(last);
  }
  for (const callsign of recorded.callsigns) {
    const flight = state.flights[callsign] ?? {
      rp: 0,
      events: 0,
      ...(kindOf?.(callsign) ? { kind: kindOf(callsign)! } : {}),
    };
    flight.rp += recorded.rp;
    flight.events++;
    flight.lastDetail = recorded.detail;
    if (recorded.rp < 0 && recorded.rp < (flight.worstRp ?? 0)) {
      flight.worstRp = recorded.rp;
      flight.worstDetail = recorded.detail;
    }
    // Re-inserted so the most recently scored flights are kept longest.
    delete state.flights[callsign];
    state.flights[callsign] = flight;
  }
  const callsigns = Object.keys(state.flights);
  for (let i = 0; i < callsigns.length - MAX_FLIGHT_SCORES; i++)
    delete state.flights[callsigns[i]!];
  return recorded;
}

/**
 * RP lost for a loss of separation: the base penalty, scaled up to double the
 * closer the aircraft came. Nothing at or beyond the penalty distance.
 */
export function separationPenalty(
  closestLateralNm: number,
  basePenaltyRp: number,
  penaltyMaxLateralNm: number,
): number {
  if (closestLateralNm >= penaltyMaxLateralNm) return 0;
  const severity = 1 - closestLateralNm / penaltyMaxLateralNm;
  return Math.round(basePenaltyRp * (1 + severity));
}

/** A session's flight and safety numbers, from its score (the shape of the saved-session stats). */
export function scoreStats(score: Readonly<ScoreState>) {
  const count = (kind: ScoreKind) => score.tally[kind]?.count ?? 0;
  const timing = Object.values(score.timing);
  return {
    arrivals: count('landing'),
    departures: count('departureHandoff'),
    overflights: count('transitHandoff'),
    onTime: timing.reduce((n, t) => n + (t?.onTime ?? 0), 0),
    timed: timing.reduce((n, t) => n + (t?.count ?? 0), 0),
    separationLosses: count('separationLoss'),
    wakeLosses: count('wakeLoss'),
    nearMidAirs: count('nearMidAir'),
    goArounds: count('goAround'),
  };
}
