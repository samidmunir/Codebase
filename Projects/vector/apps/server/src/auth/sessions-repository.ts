import type { Database } from '../platform/database';

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  /** Set when a refresh replaced this token with a new one. */
  rotatedAt: Date | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  rotated_at: Date | null;
}

const COLUMNS = 'id, user_id, expires_at, revoked_at, rotated_at';

const toRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  userId: row.user_id,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  rotatedAt: row.rotated_at,
});

export function sessionsRepository(db: Database) {
  return {
    async create(
      userId: string,
      refreshTokenHash: string,
      expiresAt: Date,
    ): Promise<SessionRecord> {
      const { rows } = await db.query<SessionRow>(
        `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
        [userId, refreshTokenHash, expiresAt],
      );
      return toRecord(rows[0]!);
    },

    async findByTokenHash(refreshTokenHash: string): Promise<SessionRecord | undefined> {
      const { rows } = await db.query<SessionRow>(
        `SELECT ${COLUMNS} FROM auth_sessions WHERE refresh_token_hash = $1`,
        [refreshTokenHash],
      );
      return rows[0] ? toRecord(rows[0]) : undefined;
    },

    /**
     * Marks an active session rotated. Returns false if it was already rotated
     * or revoked (e.g. a concurrent refresh won), so only one refresh succeeds.
     */
    async markRotated(sessionId: string): Promise<boolean> {
      const { rowCount } = await db.query(
        `UPDATE auth_sessions SET rotated_at = now(), last_used_at = now()
         WHERE id = $1 AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
        [sessionId],
      );
      return rowCount === 1;
    },

    async revoke(sessionId: string): Promise<void> {
      await db.query(
        'UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
        [sessionId],
      );
    },

    async revokeAllForUser(userId: string): Promise<void> {
      await db.query(
        'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId],
      );
    },
  };
}

export type SessionsRepository = ReturnType<typeof sessionsRepository>;
