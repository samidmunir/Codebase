import type { SavedSession, SavedSessionSummary, SessionDifficulty } from '@vector/shared';
import type { Database } from '../platform/database';

/** Thrown for a session that doesn't exist or belongs to someone else. */
export class SavedSessionNotFoundError extends Error {
  constructor() {
    super('That saved session no longer exists');
    this.name = 'SavedSessionNotFoundError';
  }
}

/** Thrown when an account already has the maximum number of saved sessions. */
export class SavedSessionLimitError extends Error {
  constructor(limit: number) {
    super(`You can keep up to ${limit} saved sessions. Delete one to save another.`);
    this.name = 'SavedSessionLimitError';
  }
}

export interface SnapshotRecord {
  snapshot: unknown;
  snapshotVersion: number;
  simTimeSec: number;
  aircraftCount: number;
  difficulty: SessionDifficulty | null;
}

interface SummaryRow {
  id: string;
  name: string;
  airspace_id: string;
  difficulty: SessionDifficulty | null;
  sim_time_sec: number;
  aircraft_count: number;
  created_at: Date;
  updated_at: Date;
}

const SUMMARY_COLUMNS =
  'id, name, airspace_id, difficulty, sim_time_sec, aircraft_count, created_at, updated_at';

const toSummary = (row: SummaryRow): SavedSessionSummary => ({
  id: row.id,
  name: row.name,
  airspaceId: row.airspace_id,
  difficulty: row.difficulty,
  simTimeSec: row.sim_time_sec,
  aircraftCount: row.aircraft_count,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

/** Every query is scoped to the owner, so one user can never read or change another's sessions. */
export function savedSessionsRepository(db: Database) {
  return {
    async list(userId: string): Promise<SavedSessionSummary[]> {
      const { rows } = await db.query<SummaryRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM saved_sessions WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId],
      );
      return rows.map(toSummary);
    },

    async get(userId: string, id: string): Promise<SavedSession> {
      const { rows } = await db.query<SummaryRow & { snapshot: unknown }>(
        `SELECT ${SUMMARY_COLUMNS}, snapshot FROM saved_sessions WHERE user_id = $1 AND id = $2`,
        [userId, id],
      );
      const row = rows[0];
      if (!row) throw new SavedSessionNotFoundError();
      return { ...toSummary(row), snapshot: row.snapshot };
    },

    async create(
      userId: string,
      input: { name: string; airspaceId: string } & SnapshotRecord,
      limit: number,
    ): Promise<SavedSessionSummary> {
      const { rows } = await db.query<SummaryRow>(
        `INSERT INTO saved_sessions
           (user_id, name, airspace_id, snapshot, snapshot_version, sim_time_sec, aircraft_count, difficulty)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8
         WHERE (SELECT count(*) FROM saved_sessions WHERE user_id = $1) < $9
         RETURNING ${SUMMARY_COLUMNS}`,
        [
          userId,
          input.name,
          input.airspaceId,
          JSON.stringify(input.snapshot),
          input.snapshotVersion,
          input.simTimeSec,
          input.aircraftCount,
          input.difficulty,
          limit,
        ],
      );
      const row = rows[0];
      if (!row) throw new SavedSessionLimitError(limit);
      return toSummary(row);
    },

    async replace(userId: string, id: string, input: SnapshotRecord): Promise<SavedSessionSummary> {
      const { rows } = await db.query<SummaryRow>(
        `UPDATE saved_sessions SET snapshot = $3, snapshot_version = $4, sim_time_sec = $5,
           aircraft_count = $6, difficulty = $7, updated_at = now()
         WHERE user_id = $1 AND id = $2
         RETURNING ${SUMMARY_COLUMNS}`,
        [
          userId,
          id,
          JSON.stringify(input.snapshot),
          input.snapshotVersion,
          input.simTimeSec,
          input.aircraftCount,
          input.difficulty,
        ],
      );
      const row = rows[0];
      if (!row) throw new SavedSessionNotFoundError();
      return toSummary(row);
    },

    async rename(userId: string, id: string, name: string): Promise<SavedSessionSummary> {
      const { rows } = await db.query<SummaryRow>(
        `UPDATE saved_sessions SET name = $3, updated_at = now()
         WHERE user_id = $1 AND id = $2 RETURNING ${SUMMARY_COLUMNS}`,
        [userId, id, name],
      );
      const row = rows[0];
      if (!row) throw new SavedSessionNotFoundError();
      return toSummary(row);
    },

    async delete(userId: string, id: string): Promise<void> {
      const { rowCount } = await db.query(
        'DELETE FROM saved_sessions WHERE user_id = $1 AND id = $2',
        [userId, id],
      );
      if (!rowCount) throw new SavedSessionNotFoundError();
    },
  };
}

export type SavedSessionsRepository = ReturnType<typeof savedSessionsRepository>;
