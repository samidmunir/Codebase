import { z } from 'zod';
import { airspaceIdSchema } from './airspaces';
import { DIFFICULTY_LEVELS } from './settings/difficulty';

// Leaderboards (/api/records), shared by the server and client. Only verified
// results count.

export const RECORD_BOARDS = ['career', 'best', 'landings', 'safety', 'onTime'] as const;
export const recordBoardSchema = z.enum(RECORD_BOARDS);
export type RecordBoard = z.infer<typeof recordBoardSchema>;

export const RECORD_PERIODS = ['all', 'month', 'week'] as const;
export const recordPeriodSchema = z.enum(RECORD_PERIODS);
export type RecordPeriod = z.infer<typeof recordPeriodSchema>;

/** What a pilot needs in the period to be ranked on each board. */
export const RECORD_MINIMUMS = {
  /** Best session: sessions at least this long (sim time). */
  bestSessionSec: 30 * 60,
  /** Safety: at least this many flights finished. */
  safetyFlights: 200,
  /** On time: at least this many timed flights. */
  onTimeFlights: 100,
} as const;

export const RECORDS_LIMIT = 50;

export const recordsQuerySchema = z.object({
  board: recordBoardSchema.default('career'),
  period: recordPeriodSchema.default('all'),
  airspace: airspaceIdSchema.optional(),
  difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
});
export type RecordsQuery = z.input<typeof recordsQuerySchema>;

export const recordEntrySchema = z.object({
  rank: z.number().int().positive(),
  handle: z.string(),
  displayName: z.string(),
  /** RP, landings, losses per 100 flights or an on-time percentage, by board. */
  value: z.number(),
  /** Sessions that counted. */
  sessions: z.number().int().min(0),
  /** The best session itself, on the best session board. */
  resultId: z.uuid().optional(),
});
export type RecordEntry = z.infer<typeof recordEntrySchema>;

export const recordsSchema = z.object({
  board: recordBoardSchema,
  period: recordPeriodSchema,
  entries: z.array(recordEntrySchema),
  /** The signed-in pilot's place, when they're ranked (in or below the top). */
  you: recordEntrySchema.nullable(),
});
export type Records = z.infer<typeof recordsSchema>;
