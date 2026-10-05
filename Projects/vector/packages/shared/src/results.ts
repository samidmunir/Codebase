import { z } from 'zod';
import { airspaceIdSchema } from './airspaces';
import { sessionDifficultySchema, sessionStatsSchema } from './sessions';

// Session results and pilot profiles (/api/results, /api/pilots), shared by the
// server and client. A result's report is validated by sim-core; here it is opaque.

/** Sessions shorter than this (sim time) aren't kept as results. */
export const MIN_RESULT_SIM_SEC = 60;
export const RESULTS_PAGE_SIZE = 20;

/**
 * Whether the server has replayed a result and got the same score: 'pending' until
 * it does, 'verified' or 'mismatch' after, and 'unverifiable' for sessions it can't
 * replay (saved before replays existed, or from an older engine).
 */
export const verificationSchema = z.enum(['pending', 'verified', 'mismatch', 'unverifiable']);
export type Verification = z.infer<typeof verificationSchema>;

/** Sent when a session ends (and from time to time while it runs). */
export const uploadResultRequestSchema = z.object({
  airspaceId: airspaceIdSchema,
  difficulty: sessionDifficultySchema.nullable().default(null),
  snapshot: z.unknown(),
});
export type UploadResultRequest = z.input<typeof uploadResultRequestSchema>;

export const resultSummarySchema = z.object({
  id: z.uuid(),
  airspaceId: z.string(),
  difficulty: sessionDifficultySchema.nullable(),
  simTimeSec: z.number().min(0),
  rp: z.number(),
  stats: sessionStatsSchema,
  verification: verificationSchema,
  /** When the session was first played, and last updated. */
  playedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ResultSummary = z.infer<typeof resultSummarySchema>;

export const pilotRefSchema = z.object({ handle: z.string(), displayName: z.string() });

export const resultDetailSchema = z.object({
  result: resultSummarySchema,
  pilot: pilotRefSchema,
  /** The session's report (sim-core's SessionReport). */
  report: z.unknown(),
});
export type ResultDetail = z.infer<typeof resultDetailSchema>;

export const resultPageSchema = z.object({
  results: z.array(resultSummarySchema),
  total: z.number().int().min(0),
});
export type ResultPage = z.infer<typeof resultPageSchema>;

export const careerTotalsSchema = z.object({
  sessions: z.number().int().min(0),
  simTimeSec: z.number().min(0),
  rp: z.number(),
  stats: sessionStatsSchema,
});
export type CareerTotals = z.infer<typeof careerTotalsSchema>;

export const pilotProfileSchema = z.discriminatedUnion('visibility', [
  z.object({
    visibility: z.literal('public'),
    pilot: pilotRefSchema.extend({
      joinedAt: z.iso.datetime(),
      /** The profile is public (always true for others; yours may be private). */
      isPublic: z.boolean(),
      isYou: z.boolean(),
    }),
    career: careerTotalsSchema,
    /** Place on the all-time career RP board, if ranked. */
    careerRank: z.number().int().positive().nullable(),
    byAirspace: z.array(careerTotalsSchema.extend({ airspaceId: z.string(), bestRp: z.number() })),
    /** Career RP after each session, oldest first. */
    history: z.array(z.object({ at: z.iso.datetime(), rp: z.number() })),
    recent: z.array(resultSummarySchema),
  }),
  z.object({ visibility: z.literal('private'), pilot: z.object({ handle: z.string() }) }),
]);
export type PilotProfile = z.infer<typeof pilotProfileSchema>;
