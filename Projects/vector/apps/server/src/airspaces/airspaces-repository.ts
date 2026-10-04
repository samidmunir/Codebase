import { AIRSPACE_IDS, type AdminAirspace, type AirspaceStatus } from '@vector/shared';
import type { Database } from '../platform/database';

/** Thrown for an airspace an admin has closed to players. */
export class AirspaceDisabledError extends Error {
  constructor() {
    super('That airspace is closed right now. Try another one.');
    this.name = 'AirspaceDisabledError';
  }
}

export class AirspaceNotFoundError extends Error {
  constructor() {
    super('There is no such airspace');
    this.name = 'AirspaceNotFoundError';
  }
}

interface AdminAirspaceRow {
  id: string;
  enabled: boolean;
  updated_at: Date;
  updated_by: string | null;
  saved_sessions: number;
}

/** Which airspaces players can fly. Only the airspaces the simulator ships with are listed. */
export function airspacesRepository(db: Database) {
  const known = [...AIRSPACE_IDS];
  return {
    /** Adds a row (enabled) for every airspace the simulator ships with that has none yet. */
    async ensureKnown(): Promise<void> {
      await db.query(
        'INSERT INTO airspaces (id) SELECT unnest($1::text[]) ON CONFLICT (id) DO NOTHING',
        [known],
      );
    },

    async list(): Promise<AirspaceStatus[]> {
      await this.ensureKnown();
      const { rows } = await db.query<{ id: string; enabled: boolean }>(
        'SELECT id, enabled FROM airspaces WHERE id = ANY($1)',
        [known],
      );
      return known.map((id) => ({
        id,
        enabled: rows.find((row) => row.id === id)?.enabled ?? true,
      }));
    },

    /** Throws unless the airspace exists and is open to players. */
    async requireEnabled(id: string): Promise<void> {
      if (!(known as string[]).includes(id)) throw new AirspaceNotFoundError();
      const { rows } = await db.query<{ enabled: boolean }>(
        'SELECT enabled FROM airspaces WHERE id = $1',
        [id],
      );
      if (rows[0] && !rows[0].enabled) throw new AirspaceDisabledError();
    },

    async adminList(): Promise<AdminAirspace[]> {
      await this.ensureKnown();
      const { rows } = await db.query<AdminAirspaceRow>(
        `SELECT a.id, a.enabled, a.updated_at, u.email AS updated_by,
           (SELECT count(*)::int FROM saved_sessions s WHERE s.airspace_id = a.id) AS saved_sessions
         FROM airspaces a LEFT JOIN users u ON u.id = a.updated_by
         WHERE a.id = ANY($1)`,
        [known],
      );
      return known.flatMap((id) => {
        const row = rows.find((r) => r.id === id);
        return row
          ? [
              {
                id: row.id,
                enabled: row.enabled,
                updatedAt: row.updated_at.toISOString(),
                updatedBy: row.updated_by,
                savedSessions: row.saved_sessions,
              },
            ]
          : [];
      });
    },

    /** Opens or closes an airspace. Returns whether it was enabled before. */
    async setEnabled(id: string, enabled: boolean, adminId: string): Promise<boolean> {
      if (!(known as string[]).includes(id)) throw new AirspaceNotFoundError();
      await this.ensureKnown();
      const { rows } = await db.query<{ was: boolean }>(
        `UPDATE airspaces a SET enabled = $2, updated_at = now(), updated_by = $3
         FROM (SELECT enabled AS was FROM airspaces WHERE id = $1) before
         WHERE a.id = $1 RETURNING before.was`,
        [id, enabled, adminId],
      );
      return rows[0]!.was;
    },
  };
}

export type AirspacesRepository = ReturnType<typeof airspacesRepository>;
