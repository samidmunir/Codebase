import { z } from 'zod';
import { violationSchema } from '../separation/separation';
import type { SimState } from '../snapshot/snapshot';
import { flightScoreSchema, scoreStats, type ScoreState } from './score';
import { flightKindSchema, timingStatsSchema } from './timing';

// What a finished session looked like: everything the debrief shows, compact
// enough to keep for every session a pilot plays.

/** Best and worst flights kept in a report, and losses of separation. */
export const REPORT_NOTABLE_FLIGHTS = 10;
export const REPORT_LOSSES = 20;

export const sessionReportSchema = z.object({
  sessionId: z.string(),
  startTimeUtc: z.iso.datetime(),
  tickSeconds: z.number().positive(),
  finalTick: z.number().int().min(0),
  /** The facility the player worked (N90, C90…). */
  playerId: z.string(),
  total: z.number(),
  tally: z.record(z.string(), z.object({ count: z.number().int(), rp: z.number() })),
  rpHistory: z.array(z.tuple([z.number().int().min(0), z.number()])),
  timing: z.partialRecord(flightKindSchema, timingStatsSchema),
  stats: z.object({
    arrivals: z.number().int(),
    departures: z.number().int(),
    overflights: z.number().int(),
    onTime: z.number().int(),
    timed: z.number().int(),
    separationLosses: z.number().int(),
    wakeLosses: z.number().int(),
    nearMidAirs: z.number().int(),
    goArounds: z.number().int(),
  }),
  best: z.array(flightScoreSchema.extend({ callsign: z.string() })),
  worst: z.array(flightScoreSchema.extend({ callsign: z.string() })),
  /** The closest losses of separation first. */
  losses: z.array(violationSchema),
});
export type SessionReport = z.infer<typeof sessionReportSchema>;

/** The flights that earned the most and lost the most RP. */
export function notableFlights(score: Readonly<ScoreState>, count = REPORT_NOTABLE_FLIGHTS) {
  const flights = Object.entries(score.flights).map(([callsign, flight]) => ({
    callsign,
    ...flight,
  }));
  return {
    best: flights
      .filter((f) => f.rp > 0)
      .sort((a, b) => b.rp - a.rp)
      .slice(0, count),
    worst: flights
      .filter((f) => f.rp < 0)
      .sort((a, b) => a.rp - b.rp)
      .slice(0, count),
  };
}

/** Losses of separation, the closest (relative to the minimum) first. */
export function closestLosses<T extends { closestLateralNm: number; requiredLateralNm: number }>(
  violations: readonly T[],
  count = REPORT_LOSSES,
): T[] {
  return [...violations]
    .sort(
      (a, b) => a.closestLateralNm / a.requiredLateralNm - b.closestLateralNm / b.requiredLateralNm,
    )
    .slice(0, count);
}

/** The report for a session, from its state (as in a snapshot). */
export function sessionReport(state: Readonly<SimState>): SessionReport {
  const { score } = state;
  return sessionReportSchema.parse({
    sessionId: state.replay?.sessionId ?? `seed-unknown-${state.startTimeUtc}`,
    startTimeUtc: state.startTimeUtc,
    tickSeconds: state.config.tickSeconds,
    finalTick: state.tick,
    playerId: state.playerId,
    total: score.total,
    tally: score.tally,
    rpHistory: score.rpHistory,
    timing: score.timing,
    stats: scoreStats(score),
    ...notableFlights(score),
    losses: closestLosses(state.separation.violations),
  });
}
