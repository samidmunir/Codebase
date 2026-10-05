import { describeUserAgent, type SignIn } from '@vector/shared';
import type { Database } from '../platform/database';

/** The device a sign-in comes from: its browser's User-Agent and its IP address. */
export interface ClientInfo {
  userAgent: string | undefined;
  ip: string | undefined;
}

/** User-Agents are capped: they're only for telling devices apart. */
const MAX_USER_AGENT = 400;

export interface SessionRecord {
  id: string;
  userId: string;
  /** The sign-in this token belongs to (it stays the same across refreshes). */
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  /** Set when a refresh replaced this token with a new one. */
  rotatedAt: Date | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  rotated_at: Date | null;
}

const COLUMNS = 'id, user_id, family_id, expires_at, revoked_at, rotated_at';

const toRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  userId: row.user_id,
  familyId: row.family_id,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  rotatedAt: row.rotated_at,
});

export function sessionsRepository(db: Database) {
  return {
    /** A new token: a new sign-in, or the next in a sign-in's family (a refresh). */
    async create(
      userId: string,
      refreshTokenHash: string,
      expiresAt: Date,
      options: { familyId?: string; client?: ClientInfo } = {},
    ): Promise<SessionRecord> {
      const { rows } = await db.query<SessionRow>(
        `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at, family_id, user_agent, ip)
         SELECT id, $1, $2, $3, coalesce($4::uuid, id), $5, $6::inet
         FROM (SELECT gen_random_uuid() AS id) fresh
         RETURNING ${COLUMNS}`,
        [
          userId,
          refreshTokenHash,
          expiresAt,
          options.familyId ?? null,
          options.client?.userAgent?.slice(0, MAX_USER_AGENT) ?? null,
          validIp(options.client?.ip),
        ],
      );
      return toRecord(rows[0]!);
    },

    /** A pilot's sign-ins that haven't ended, one per device, latest first. */
    async listActive(userId: string): Promise<Omit<SignIn, 'current'>[]> {
      const { rows } = await db.query<{
        family_id: string;
        user_agent: string | null;
        ip: string | null;
        signed_in_at: Date;
        last_used_at: Date;
      }>(
        `SELECT live.family_id, live.user_agent, host(live.ip) AS ip, live.last_used_at,
           (SELECT min(f.created_at) FROM auth_sessions f WHERE f.family_id = live.family_id)
             AS signed_in_at
         FROM auth_sessions live
         WHERE live.user_id = $1 AND live.revoked_at IS NULL AND live.rotated_at IS NULL
           AND live.expires_at > now()
         ORDER BY live.last_used_at DESC`,
        [userId],
      );
      return rows.map((row) => ({
        id: row.family_id,
        device: describeUserAgent(row.user_agent),
        ip: row.ip,
        signedInAt: row.signed_in_at.toISOString(),
        lastUsedAt: row.last_used_at.toISOString(),
      }));
    },

    /** Ends one sign-in (every token in its family). Returns false if it wasn't theirs or live. */
    async revokeFamily(userId: string, familyId: string): Promise<boolean> {
      const { rowCount } = await db.query(
        `UPDATE auth_sessions SET revoked_at = now(), user_agent = NULL, ip = NULL
         WHERE user_id = $1 AND family_id = $2 AND revoked_at IS NULL`,
        [userId, familyId],
      );
      return (rowCount ?? 0) > 0;
    },

    /** Forgets the device of sign-ins that have run out (the rest are cleared as they end). */
    async forgetEndedDevices(): Promise<number> {
      const { rowCount } = await db.query(
        `UPDATE auth_sessions SET user_agent = NULL, ip = NULL
         WHERE (ip IS NOT NULL OR user_agent IS NOT NULL) AND expires_at <= now()`,
      );
      return rowCount ?? 0;
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
        `UPDATE auth_sessions SET rotated_at = now(), last_used_at = now(), user_agent = NULL, ip = NULL
         WHERE id = $1 AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
        [sessionId],
      );
      return rowCount === 1;
    },

    async revoke(sessionId: string): Promise<void> {
      await db.query(
        `UPDATE auth_sessions SET revoked_at = now(), user_agent = NULL, ip = NULL
         WHERE id = $1 AND revoked_at IS NULL`,
        [sessionId],
      );
    },

    /** Ends every sign-in but one (this device's). */
    async revokeOthers(userId: string, keepSessionId: string): Promise<void> {
      await db.query(
        `UPDATE auth_sessions SET revoked_at = now(), user_agent = NULL, ip = NULL
         WHERE user_id = $1 AND family_id <> (SELECT family_id FROM auth_sessions WHERE id = $2)
           AND revoked_at IS NULL`,
        [userId, keepSessionId],
      );
    },

    async countActive(userId: string): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM auth_sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at > now()`,
        [userId],
      );
      return rows[0]!.count;
    },

    async revokeAllForUser(userId: string): Promise<void> {
      await db.query(
        `UPDATE auth_sessions SET revoked_at = now(), user_agent = NULL, ip = NULL
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
    },
  };
}

export type SessionsRepository = ReturnType<typeof sessionsRepository>;

/** An address Postgres's inet will take, or null. */
function validIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const bare = ip.replace(/^::ffff:/, '');
  return /^[\d.]+$|^[\da-f:]+$/i.test(bare) ? bare : null;
}
