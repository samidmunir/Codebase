import { resolveSettings } from '@vector/shared';
import { z } from 'zod';
import { atcCommandSchema } from '../commands/commands';
import { simConfigSchema, worldSchema } from '../engine/config';
import { liveWeatherReportSchema } from '../weather/wind';

// A session's replay: how it started and every input the player gave, each at its
// tick. The engine is deterministic, so replaying these on a fresh engine gives
// the same session, tick for tick, which is how results can be verified.

/**
 * Increment whenever a change to sim-core changes how a session plays out
 * (physics, traffic, scoring, pilots…), so replays from an older engine aren't
 * judged by the new one.
 */
export const SIM_ENGINE_VERSION = '1';

const tick = z.number().int().min(0);

/** An input the player gave, and the tick (before stepping) it was given at. */
export const replayInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('instruction'),
    tick,
    aircraftId: z.string(),
    commands: z.array(atcCommandSchema).min(1),
  }),
  z.object({ type: z.literal('release'), tick, entryId: z.string(), runway: z.string() }),
  z.object({ type: z.literal('liveWeather'), tick, reports: z.array(liveWeatherReportSchema) }),
  z.object({ type: z.literal('traffic'), tick, patch: z.record(z.string(), z.unknown()) }),
]);
export type ReplayInput = z.infer<typeof replayInputSchema>;

/** Everything SimEngine.create was given (apart from the static data). */
export const replayStartSchema = z.object({
  seed: z.number(),
  startTimeUtc: z.iso.datetime(),
  world: worldSchema,
  config: simConfigSchema,
  settings: z.unknown().transform((stored) => resolveSettings('session', stored).values),
  playerId: z.string(),
  runwayConfigs: z.record(z.string(), z.string()).default({}),
  liveWeather: z.array(liveWeatherReportSchema).default([]),
});

export const replaySchema = z.object({
  /** Identifies the session for good: a saved and resumed session keeps it. */
  sessionId: z.string().min(1).max(64),
  engineVersion: z.string(),
  start: replayStartSchema,
  inputs: z.array(replayInputSchema),
});
export type Replay = z.infer<typeof replaySchema>;
