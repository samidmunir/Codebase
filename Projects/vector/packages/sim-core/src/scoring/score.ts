import { z } from 'zod';

// RP (reputation points): earned for moving traffic well, lost for unsafe or
// sloppy control. Every value comes from the session's scoring settings.

export const scoreKindSchema = z.enum([
  'landing',
  'departureHandoff',
  'transitHandoff',
  'separationLoss',
  'nearMidAir',
  'goAround',
  'leftWithoutHandoff',
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
});
export type ScoreState = z.infer<typeof scoreStateSchema>;

export const emptyScoreState = (): ScoreState => ({
  total: 0,
  tally: {},
  events: [],
  nextEventNumber: 1,
  nearMidAirViolations: [],
});

/** Adds an event to the score. Returns the recorded event. */
export function recordScore(state: ScoreState, event: Omit<ScoreEvent, 'id'>): ScoreEvent {
  const recorded = { ...event, id: `S${state.nextEventNumber++}` };
  state.total += recorded.rp;
  const tally = state.tally[recorded.kind] ?? { count: 0, rp: 0 };
  state.tally[recorded.kind] = { count: tally.count + 1, rp: tally.rp + recorded.rp };
  state.events.push(recorded);
  if (state.events.length > MAX_SCORE_EVENTS) state.events.shift();
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
