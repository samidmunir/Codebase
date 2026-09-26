import { resolveSettings } from '@vector/shared';
import { z } from 'zod';
import { aircraftStateSchema } from '../aircraft/aircraft';
import { simConfigSchema, worldSchema } from '../engine/config';

/**
 * Increment when the snapshot shape changes, and add a migration from the
 * previous version so older saved sessions keep loading.
 */
export const SNAPSHOT_SCHEMA_VERSION = 1;

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
