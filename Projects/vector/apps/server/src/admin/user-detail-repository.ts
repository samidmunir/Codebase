import type { AdminUserDetail, SessionDifficulty, Verification } from '@vector/shared';
import type { Database } from '../platform/database';

/** How many recent results and posts a user's admin page shows. */
const RECENT = 10;

const excerpt = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 140 ? `${flat.slice(0, 137)}…` : flat;
};

/** What a user has played and posted, for their admin page (hidden things included). */
export function userDetailRepository(db: Database) {
  return {
    async results(userId: string): Promise<AdminUserDetail['results']> {
      const [{ rows }, count] = await Promise.all([
        db.query<{
          id: string;
          airspace_id: string;
          difficulty: SessionDifficulty | null;
          rp: number;
          sim_time_sec: number;
          verification: Verification;
          hidden: boolean;
          created_at: Date;
        }>(
          `SELECT id, airspace_id, difficulty, rp, sim_time_sec, verification, hidden, created_at
           FROM session_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
          [userId, RECENT],
        ),
        db.query<{ total: number }>(
          'SELECT count(*)::int AS total FROM session_results WHERE user_id = $1',
          [userId],
        ),
      ]);
      return {
        total: count.rows[0]!.total,
        recent: rows.map((row) => ({
          id: row.id,
          airspaceId: row.airspace_id,
          difficulty: row.difficulty,
          rp: row.rp,
          simTimeSec: row.sim_time_sec,
          verification: row.verification,
          hidden: row.hidden,
          playedAt: row.created_at.toISOString(),
        })),
      };
    },

    async posts(userId: string): Promise<AdminUserDetail['posts']> {
      const [{ rows }, count] = await Promise.all([
        db.query<{
          id: string;
          thread_id: string;
          title: string;
          body: string;
          hidden_at: Date | null;
          created_at: Date;
        }>(
          `SELECT p.id, p.thread_id, t.title, p.body, p.hidden_at, p.created_at
           FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id
           WHERE p.author_id = $1 ORDER BY p.created_at DESC LIMIT $2`,
          [userId, RECENT],
        ),
        db.query<{ total: number }>(
          'SELECT count(*)::int AS total FROM forum_posts WHERE author_id = $1',
          [userId],
        ),
      ]);
      return {
        total: count.rows[0]!.total,
        recent: rows.map((row) => ({
          id: Number(row.id),
          threadId: Number(row.thread_id),
          threadTitle: row.title,
          excerpt: excerpt(row.body),
          hidden: row.hidden_at !== null,
          createdAt: row.created_at.toISOString(),
        })),
      };
    },
  };
}

export type UserDetailRepository = ReturnType<typeof userDetailRepository>;
