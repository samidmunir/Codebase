import { randomInt } from 'node:crypto';
import type { FeedbackItem, FeedbackList, InviteCode, WaitlistEntry } from '@vector/shared';
import type { Database } from '../platform/database';

/** Letters and digits that can't be mistaken for each other (no 0/O, 1/I/L). */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** A code people can read out: VEC-7KQ2-M9XD. */
export function newInviteCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `VEC-${part()}-${part()}`;
}

export class InviteCodeTakenError extends Error {
  constructor() {
    super('A code like that already exists');
    this.name = 'InviteCodeTakenError';
  }
}

/** Why a code doesn't work now, or undefined if it does. */
function problem(row: {
  revoked_at: Date | null;
  expires_at: Date | null;
  uses: number;
  max_uses: number;
}): string | undefined {
  if (row.revoked_at) return 'That invite code has been withdrawn';
  if (row.expires_at && row.expires_at.getTime() <= Date.now())
    return 'That invite code has expired';
  if (row.uses >= row.max_uses) return 'That invite code has been used up';
  return undefined;
}

interface InviteRow {
  id: string;
  code: string;
  note: string;
  max_uses: number;
  uses: number;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_by: string | null;
  created_at: Date;
  used_by: { id: string; handle: string; at: string }[] | null;
}

const toInvite = (row: InviteRow): InviteCode => ({
  id: row.id,
  code: row.code,
  note: row.note,
  maxUses: row.max_uses,
  uses: row.uses,
  expiresAt: row.expires_at?.toISOString() ?? null,
  revokedAt: row.revoked_at?.toISOString() ?? null,
  createdBy: row.created_by,
  createdAt: row.created_at.toISOString(),
  usedBy: (row.used_by ?? []).map((user) => ({
    ...user,
    at: new Date(user.at).toISOString(),
  })),
});

const INVITE_SELECT = `
  SELECT i.id, i.code, i.note, i.max_uses, i.uses, i.expires_at, i.revoked_at,
    c.email AS created_by, i.created_at,
    (SELECT json_agg(json_build_object('id', u.id, 'handle', u.handle, 'at', u.created_at)
                     ORDER BY u.created_at DESC)
       FROM users u WHERE u.invite_code_id = i.id) AS used_by
  FROM invite_codes i LEFT JOIN users c ON c.id = i.created_by`;

/** Invite codes, the waitlist, and feedback. */
export function betaRepository(db: Database) {
  return {
    // ---- Invite codes --------------------------------------------------------------

    async createInvite(input: {
      code: string;
      note: string;
      maxUses: number;
      expiresInDays?: number | undefined;
      createdBy: string;
    }): Promise<InviteCode> {
      try {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO invite_codes (code, note, max_uses, expires_at, created_by)
           VALUES ($1, $2, $3,
             CASE WHEN $4::int IS NULL THEN NULL ELSE now() + make_interval(days => $4::int) END, $5)
           RETURNING id`,
          [input.code, input.note, input.maxUses, input.expiresInDays ?? null, input.createdBy],
        );
        return (await this.invite(rows[0]!.id))!;
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new InviteCodeTakenError();
        throw error;
      }
    },

    async invite(id: string): Promise<InviteCode | undefined> {
      const { rows } = await db.query<InviteRow>(`${INVITE_SELECT} WHERE i.id = $1`, [id]);
      return rows[0] ? toInvite(rows[0]) : undefined;
    },

    async invites(): Promise<InviteCode[]> {
      const { rows } = await db.query<InviteRow>(`${INVITE_SELECT} ORDER BY i.created_at DESC`);
      return rows.map(toInvite);
    },

    async revokeInvite(id: string): Promise<InviteCode | undefined> {
      await db.query(
        'UPDATE invite_codes SET revoked_at = coalesce(revoked_at, now()) WHERE id = $1',
        [id],
      );
      return this.invite(id);
    },

    /** Whether a code works now: undefined if so, else why not. */
    async check(code: string): Promise<string | undefined> {
      const { rows } = await db.query<{
        revoked_at: Date | null;
        expires_at: Date | null;
        uses: number;
        max_uses: number;
      }>('SELECT revoked_at, expires_at, uses, max_uses FROM invite_codes WHERE code = $1', [code]);
      if (!rows[0]) return 'That isn’t an invite code we know';
      return problem(rows[0]);
    },

    /** Takes one use of a code, if it has one left (atomically). Returns its id, or why not. */
    async take(code: string): Promise<{ id: string } | { problem: string }> {
      const { rows } = await db.query<{ id: string }>(
        `UPDATE invite_codes SET uses = uses + 1
         WHERE code = $1 AND revoked_at IS NULL AND uses < max_uses
           AND (expires_at IS NULL OR expires_at > now())
         RETURNING id`,
        [code],
      );
      if (rows[0]) return { id: rows[0].id };
      return { problem: (await this.check(code)) ?? 'That invite code can’t be used' };
    },

    /** Gives a use back (the account it was for wasn't created). */
    async giveBack(id: string): Promise<void> {
      await db.query('UPDATE invite_codes SET uses = greatest(uses - 1, 0) WHERE id = $1', [id]);
    },

    async attach(userId: string, inviteId: string): Promise<void> {
      await db.query('UPDATE users SET invite_code_id = $2 WHERE id = $1', [userId, inviteId]);
    },

    // ---- Waitlist ------------------------------------------------------------------

    /** Adds someone (once: asking again changes nothing). */
    async join(email: string, note: string): Promise<void> {
      await db.query(
        'INSERT INTO waitlist (email, note) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        [email, note],
      );
    },

    async waitlist(): Promise<{ entries: WaitlistEntry[]; total: number }> {
      const { rows } = await db.query<{
        id: string;
        email: string;
        note: string;
        created_at: Date;
        invited_at: Date | null;
        joined: boolean;
      }>(
        `SELECT w.id, w.email, w.note, w.created_at, w.invited_at,
           EXISTS (SELECT 1 FROM users u WHERE u.email = w.email) AS joined
         FROM waitlist w ORDER BY w.invited_at IS NOT NULL, w.created_at`,
      );
      return {
        total: rows.length,
        entries: rows.map((row) => ({
          id: row.id,
          email: row.email,
          note: row.note,
          createdAt: row.created_at.toISOString(),
          invitedAt: row.invited_at?.toISOString() ?? null,
          joined: row.joined,
        })),
      };
    },

    async waitlistEntry(id: string): Promise<{ email: string } | undefined> {
      const { rows } = await db.query<{ email: string }>(
        'SELECT email FROM waitlist WHERE id = $1',
        [id],
      );
      return rows[0];
    },

    async markInvited(id: string, inviteId: string): Promise<void> {
      await db.query('UPDATE waitlist SET invited_at = now(), invite_code_id = $2 WHERE id = $1', [
        id,
        inviteId,
      ]);
    },

    async removeFromWaitlist(id: string): Promise<string | undefined> {
      const { rows } = await db.query<{ email: string }>(
        'DELETE FROM waitlist WHERE id = $1 RETURNING email',
        [id],
      );
      return rows[0]?.email;
    },

    // ---- Feedback ------------------------------------------------------------------

    async addFeedback(input: {
      userId: string;
      kind: FeedbackItem['kind'];
      message: string;
      page: string;
      device: string;
    }): Promise<void> {
      await db.query(
        'INSERT INTO feedback (user_id, kind, message, page, device) VALUES ($1, $2, $3, $4, $5)',
        [input.userId, input.kind, input.message, input.page, input.device],
      );
    },

    /** Feedback sent in the last hour by one pilot (to limit it). */
    async recentFeedback(userId: string): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM feedback
         WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
        [userId],
      );
      return rows[0]!.count;
    },

    async feedback(status: FeedbackItem['status'] | undefined): Promise<FeedbackList> {
      const [{ rows }, counts] = await Promise.all([
        db.query<{
          id: string;
          kind: FeedbackItem['kind'];
          message: string;
          page: string;
          device: string;
          status: FeedbackItem['status'];
          created_at: Date;
          user_id: string | null;
          handle: string | null;
          email: string | null;
        }>(
          `SELECT f.id, f.kind, f.message, f.page, f.device, f.status, f.created_at,
             f.user_id, u.handle, u.email
           FROM feedback f LEFT JOIN users u ON u.id = f.user_id
           ${status ? 'WHERE f.status = $1' : ''}
           ORDER BY f.created_at DESC LIMIT 200`,
          status ? [status] : [],
        ),
        db.query<{ status: FeedbackItem['status']; count: number }>(
          'SELECT status, count(*)::int AS count FROM feedback GROUP BY status',
        ),
      ]);
      const byStatus = Object.fromEntries(counts.rows.map((row) => [row.status, row.count]));
      return {
        counts: { new: byStatus.new ?? 0, read: byStatus.read ?? 0, done: byStatus.done ?? 0 },
        items: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          message: row.message,
          page: row.page,
          device: row.device,
          status: row.status,
          createdAt: row.created_at.toISOString(),
          from:
            row.user_id && row.handle && row.email
              ? { id: row.user_id, handle: row.handle, email: row.email }
              : null,
        })),
      };
    },

    async setFeedbackStatus(id: string, status: FeedbackItem['status']): Promise<boolean> {
      const { rowCount } = await db.query('UPDATE feedback SET status = $2 WHERE id = $1', [
        id,
        status,
      ]);
      return (rowCount ?? 0) > 0;
    },
  };
}

export type BetaRepository = ReturnType<typeof betaRepository>;
