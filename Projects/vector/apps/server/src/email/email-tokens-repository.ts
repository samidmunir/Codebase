import type { Database } from '../platform/database';

export type EmailTokenPurpose = 'verify' | 'reset' | 'change' | 'revert';

export interface ConsumedToken {
  userId: string;
  newEmail: string | null;
}

/** Emailed links' tokens. Only their SHA-256 hashes are stored. */
export function emailTokensRepository(db: Database) {
  return {
    /** A new link, replacing any unused one of the same kind. */
    async replace(input: {
      userId: string;
      purpose: EmailTokenPurpose;
      tokenHash: string;
      hours: number;
      newEmail?: string;
    }): Promise<void> {
      await db.query(
        'DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
        [input.userId, input.purpose],
      );
      await db.query(
        `INSERT INTO email_tokens (user_id, purpose, token_hash, new_email, expires_at)
         VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5))`,
        [input.userId, input.purpose, input.tokenHash, input.newEmail ?? null, input.hours],
      );
    },

    /** When the latest link of this kind was sent to this user, if any. */
    async lastSentAt(userId: string, purpose: EmailTokenPurpose): Promise<Date | undefined> {
      const { rows } = await db.query<{ created_at: Date }>(
        `SELECT max(created_at) AS created_at FROM email_tokens WHERE user_id = $1 AND purpose = $2`,
        [userId, purpose],
      );
      return rows[0]?.created_at ?? undefined;
    },

    /** Uses a link once: undefined if it's unknown, used or expired. */
    async consume(
      tokenHash: string,
      purpose: EmailTokenPurpose,
    ): Promise<ConsumedToken | undefined> {
      const { rows } = await db.query<{ user_id: string; new_email: string | null }>(
        `UPDATE email_tokens SET used_at = now()
         WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
         RETURNING user_id, new_email`,
        [tokenHash, purpose],
      );
      return rows[0] ? { userId: rows[0].user_id, newEmail: rows[0].new_email } : undefined;
    },

    /** Drops a user's unused links of one kind. */
    async discard(userId: string, purpose: EmailTokenPurpose): Promise<void> {
      await db.query(
        'DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
        [userId, purpose],
      );
    },

    /** The address a pending email change moves to. */
    async pendingEmail(userId: string): Promise<string | null> {
      const { rows } = await db.query<{ new_email: string }>(
        `SELECT new_email FROM email_tokens
         WHERE user_id = $1 AND purpose = 'change' AND used_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      return rows[0]?.new_email ?? null;
    },
  };
}

export type EmailTokensRepository = ReturnType<typeof emailTokensRepository>;
