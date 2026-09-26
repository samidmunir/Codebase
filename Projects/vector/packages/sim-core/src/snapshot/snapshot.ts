import { resolveSettings } from '@vector/shared';
import { z } from 'zod';
import { aircraftStateSchema } from '../aircraft/aircraft';
import { atcCommandSchema } from '../commands/commands';
import { operationsStateSchema } from '../traffic/operations';
import { simConfigSchema, worldSchema } from '../engine/config';

/**
 * Increment when the snapshot shape changes, and add a migration from the
 * previous version so older saved sessions keep loading.
 */
export const SNAPSHOT_SCHEMA_VERSION = 1;

export const commsEntrySchema = z.object({
  id: z.string(),
  tick: z.number().int().min(0),
  speaker: z.enum(['controller', 'pilot']),
  aircraftId: z.string().optional(),
  callsign: z.string().optional(),
  /** Facility that transmitted, when not the player's (e.g. 'JFK TWR'). */
  facility: z.string().optional(),
  text: z.string(),
});

export type CommsEntry = z.infer<typeof commsEntrySchema>;

export const simStateSchema = z.object({
  tick: z.number().int().min(0),
  startTimeUtc: z.iso.datetime(),
  speed: z.number().positive(),
  paused: z.boolean(),
  rngState: z.number().int().min(0).max(0xffffffff),
  nextAircraftNumber: z.number().int().positive(),
  world: worldSchema,
  config: simConfigSchema,
  /**
   * Session settings, resolved leniently so snapshots saved before a setting
   * existed still load (the new setting gets its default).
   */
  settings: z.unknown().transform((stored) => resolveSettings('session', stored).values),
  aircraft: z.array(aircraftStateSchema),
  /** Controller the player works as. Only their aircraft accept instructions. */
  playerId: z.string().min(1).default('N90'),
  /** Instructions transmitted but not yet acted on (pilot response delay). */
  pendingInstructions: z
    .array(
      z.object({
        id: z.string(),
        aircraftId: z.string(),
        commands: z.array(atcCommandSchema).min(1),
        executeAtTick: z.number().int().min(0),
      }),
    )
    .default([]),
  /** Radio transmissions, oldest first. */
  comms: z.array(commsEntrySchema).default([]),
  nextMessageNumber: z.number().int().positive().default(1),
  /** Wind, active runways and departure queues (sessions with an airspace). */
  operations: operationsStateSchema.optional(),
});

export type SimState = z.infer<typeof simStateSchema>;

export const simSnapshotSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  state: simStateSchema,
});

export type SimSnapshot = z.infer<typeof simSnapshotSchema>;

/** Validates an untrusted snapshot, e.g. one loaded from the server. */
export function parseSnapshot(data: unknown): SimSnapshot {
  const result = simSnapshotSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid simulation snapshot:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
