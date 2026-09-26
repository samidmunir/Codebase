import { z } from 'zod';
import { DIFFICULTY_LEVELS } from './settings/difficulty';

// Saved session API contracts, shared by the server and client. The snapshot
// itself is validated by sim-core; here it is opaque JSON.

export const SESSION_NAME_MAX_LENGTH = 60;
/** How many saved sessions one account can keep. */
export const MAX_SAVED_SESSIONS = 25;
/** Largest snapshot the server accepts, in bytes of JSON. */
export const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;

const name = z.string().trim().min(1, 'Enter a name').max(SESSION_NAME_MAX_LENGTH);
export const sessionDifficultySchema = z.enum([...DIFFICULTY_LEVELS, 'custom']);
export type SessionDifficulty = z.infer<typeof sessionDifficultySchema>;

export const createSavedSessionRequestSchema = z.object({
  name,
  airspaceId: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Unknown airspace'),
  difficulty: sessionDifficultySchema.nullable().default(null),
  snapshot: z.unknown(),
});
export type CreateSavedSessionRequest = z.input<typeof createSavedSessionRequestSchema>;

/** Overwrites a saved session with a newer snapshot. */
export const replaceSavedSessionRequestSchema = z.object({
  difficulty: sessionDifficultySchema.nullable().default(null),
  snapshot: z.unknown(),
});
export type ReplaceSavedSessionRequest = z.input<typeof replaceSavedSessionRequestSchema>;

export const renameSavedSessionRequestSchema = z.object({ name });
export type RenameSavedSessionRequest = z.input<typeof renameSavedSessionRequestSchema>;

export const savedSessionSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  airspaceId: z.string(),
  difficulty: sessionDifficultySchema.nullable(),
  /** Simulated time elapsed in the session, in seconds. */
  simTimeSec: z.number().min(0),
  aircraftCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SavedSessionSummary = z.infer<typeof savedSessionSummarySchema>;

export const savedSessionSchema = savedSessionSummarySchema.extend({ snapshot: z.unknown() });
export type SavedSession = z.infer<typeof savedSessionSchema>;

export const savedSessionListSchema = z.object({
  sessions: z.array(savedSessionSummarySchema),
  limit: z.number().int().positive(),
});
export type SavedSessionList = z.infer<typeof savedSessionListSchema>;
