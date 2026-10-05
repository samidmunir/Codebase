import {
  FORUM_NEW_THREAD_DAYS,
  threadSlug,
  type ForumAuthor,
  type ForumCategory,
  type ForumPost,
  type ForumReport,
  type ForumThreadSummary,
  type UserRole,
} from '@vector/shared';
import type { Database } from '../platform/database';

export class ForumCategoryNotFoundError extends Error {
  constructor() {
    super('There’s no such category');
    this.name = 'ForumCategoryNotFoundError';
  }
}

export class ForumThreadNotFoundError extends Error {
  constructor() {
    super('That thread doesn’t exist, or was deleted');
    this.name = 'ForumThreadNotFoundError';
  }
}

export class ForumPostNotFoundError extends Error {
  constructor() {
    super('That post doesn’t exist, or was deleted');
    this.name = 'ForumPostNotFoundError';
  }
}

const author = (
  handle: string | null,
  displayName: string | null,
  role: UserRole | null,
): ForumAuthor => (handle && displayName && role ? { handle, displayName, role } : null);

interface CategoryRow {
  id: string;
  name: string;
  description: string;
  admin_only: boolean;
  threads: number;
  posts: number;
  latest_id: string | null;
  latest_title: string | null;
  latest_at: Date | null;
}

const toCategory = (row: CategoryRow): ForumCategory => ({
  id: row.id,
  name: row.name,
  description: row.description,
  adminOnly: row.admin_only,
  threads: row.threads,
  posts: row.posts,
  latest:
    row.latest_id && row.latest_title && row.latest_at
      ? {
          threadId: Number(row.latest_id),
          title: row.latest_title,
          lastPostAt: row.latest_at.toISOString(),
        }
      : null,
});

const CATEGORY_SELECT = `
  SELECT c.id, c.name, c.description, c.admin_only,
    (SELECT count(*)::int FROM forum_threads t WHERE t.category_id = c.id) AS threads,
    (SELECT count(*)::int FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id
       WHERE t.category_id = c.id) AS posts,
    latest.id AS latest_id, latest.title AS latest_title, latest.last_post_at AS latest_at
  FROM forum_categories c
  LEFT JOIN LATERAL (
    SELECT t.id, t.title, t.last_post_at FROM forum_threads t
    WHERE t.category_id = c.id ORDER BY t.last_post_at DESC LIMIT 1
  ) latest ON true`;

interface ThreadRow {
  id: string;
  title: string;
  category_id: string;
  category_name: string;
  created_at: Date;
  last_post_at: Date;
  pinned: boolean;
  locked: boolean;
  view_count: number;
  result_id: string | null;
  replies: number;
  author_id: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_role: UserRole | null;
  last_handle: string | null;
  last_name: string | null;
  last_role: UserRole | null;
  unread: boolean;
  following: boolean;
}

export interface ThreadRecord extends ForumThreadSummary {
  categoryName: string;
  authorId: string | null;
  resultId: string | null;
  following: boolean;
}

const toThread = (row: ThreadRow): ThreadRecord => ({
  id: Number(row.id),
  slug: threadSlug(row.title),
  title: row.title,
  categoryId: row.category_id,
  categoryName: row.category_name,
  author: author(row.author_handle, row.author_name, row.author_role),
  authorId: row.author_id,
  createdAt: row.created_at.toISOString(),
  lastPostAt: row.last_post_at.toISOString(),
  lastPoster: author(row.last_handle, row.last_name, row.last_role),
  replies: row.replies,
  views: row.view_count,
  pinned: row.pinned,
  locked: row.locked,
  unread: row.unread,
  resultId: row.result_id,
  following: row.following,
});

/** Thread summaries; $1 is the viewer (or null). */
const THREAD_SELECT = `
  SELECT t.id, t.title, t.category_id, c.name AS category_name, t.created_at, t.last_post_at,
    t.pinned, t.locked, t.view_count, t.result_id, t.author_id,
    (SELECT count(*)::int - 1 FROM forum_posts p WHERE p.thread_id = t.id) AS replies,
    a.handle AS author_handle, a.display_name AS author_name, a.role AS author_role,
    lp.handle AS last_handle, lp.display_name AS last_name, lp.role AS last_role,
    CASE
      WHEN $1::uuid IS NULL THEN false
      WHEN r.last_read_at IS NOT NULL THEN t.last_post_at > r.last_read_at
      ELSE t.created_at > now() - make_interval(days => ${FORUM_NEW_THREAD_DAYS})
    END AS unread,
    EXISTS (SELECT 1 FROM forum_follows f WHERE f.thread_id = t.id AND f.user_id = $1::uuid)
      AS following
  FROM forum_threads t
  JOIN forum_categories c ON c.id = t.category_id
  LEFT JOIN users a ON a.id = t.author_id
  LEFT JOIN LATERAL (
    SELECT p.author_id FROM forum_posts p WHERE p.thread_id = t.id ORDER BY p.id DESC LIMIT 1
  ) last ON true
  LEFT JOIN users lp ON lp.id = last.author_id
  LEFT JOIN forum_reads r ON r.thread_id = t.id AND r.user_id = $1::uuid`;

interface PostRow {
  id: string;
  thread_id: string;
  body: string;
  created_at: Date;
  edited_at: Date | null;
  hidden_at: Date | null;
  author_id: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_role: UserRole | null;
  useful: number;
  useful_by_viewer: boolean;
  opening: boolean;
}

export interface PostRecord {
  id: number;
  threadId: number;
  authorId: string | null;
  author: ForumAuthor;
  body: string;
  hidden: boolean;
  createdAt: Date;
  editedAt: Date | null;
  useful: number;
  usefulByViewer: boolean;
  opening: boolean;
}

const toPost = (row: PostRow): PostRecord => ({
  id: Number(row.id),
  threadId: Number(row.thread_id),
  authorId: row.author_id,
  author: author(row.author_handle, row.author_name, row.author_role),
  body: row.body,
  hidden: row.hidden_at !== null,
  createdAt: row.created_at,
  editedAt: row.edited_at,
  useful: row.useful,
  usefulByViewer: row.useful_by_viewer,
  opening: row.opening,
});

/** Posts; $1 is the viewer (or null). */
const POST_SELECT = `
  SELECT p.id, p.thread_id, p.body, p.created_at, p.edited_at, p.hidden_at, p.author_id,
    a.handle AS author_handle, a.display_name AS author_name, a.role AS author_role,
    (SELECT count(*)::int FROM forum_reactions x WHERE x.post_id = p.id) AS useful,
    EXISTS (SELECT 1 FROM forum_reactions x WHERE x.post_id = p.id AND x.user_id = $1::uuid)
      AS useful_by_viewer,
    p.id = (SELECT min(f.id) FROM forum_posts f WHERE f.thread_id = p.thread_id) AS opening
  FROM forum_posts p
  LEFT JOIN users a ON a.id = p.author_id`;

/** Posts and the public view of them: hidden posts show no text unless asked to. */
export function publicPost(
  post: PostRecord,
  options: { viewerId: string | undefined; showHidden: boolean; editableUntil: Date },
): ForumPost {
  return {
    id: post.id,
    author: post.author,
    body: post.hidden && !options.showHidden ? null : post.body,
    hidden: post.hidden,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    useful: post.useful,
    usefulByYou: post.usefulByViewer,
    canEdit:
      options.viewerId !== undefined &&
      post.authorId === options.viewerId &&
      !post.hidden &&
      post.createdAt.getTime() > options.editableUntil.getTime(),
    opening: post.opening,
  };
}

/** The forum's tables. */
export function forumRepository(db: Database) {
  return {
    async categories(): Promise<ForumCategory[]> {
      const { rows } = await db.query<CategoryRow>(`${CATEGORY_SELECT} ORDER BY c.position`);
      return rows.map(toCategory);
    },

    async category(id: string): Promise<ForumCategory> {
      const { rows } = await db.query<CategoryRow>(`${CATEGORY_SELECT} WHERE c.id = $1`, [id]);
      if (!rows[0]) throw new ForumCategoryNotFoundError();
      return toCategory(rows[0]);
    },

    /** A category's threads: pinned first, then the latest activity. */
    async threads(
      categoryId: string,
      viewerId: string | undefined,
      page: { offset: number; limit: number },
    ): Promise<{ threads: ThreadRecord[]; total: number }> {
      const [{ rows }, count] = await Promise.all([
        db.query<ThreadRow>(
          `${THREAD_SELECT} WHERE t.category_id = $2
           ORDER BY t.pinned DESC, t.last_post_at DESC, t.id DESC LIMIT $3 OFFSET $4`,
          [viewerId ?? null, categoryId, page.limit, page.offset],
        ),
        db.query<{ total: number }>(
          'SELECT count(*)::int AS total FROM forum_threads WHERE category_id = $1',
          [categoryId],
        ),
      ]);
      return { threads: rows.map(toThread), total: count.rows[0]!.total };
    },

    /** The latest activity across the forum. */
    async latest(viewerId: string | undefined, limit: number): Promise<ThreadRecord[]> {
      const { rows } = await db.query<ThreadRow>(
        `${THREAD_SELECT} ORDER BY t.last_post_at DESC, t.id DESC LIMIT $2`,
        [viewerId ?? null, limit],
      );
      return rows.map(toThread);
    },

    async following(viewerId: string, limit: number): Promise<ThreadRecord[]> {
      const { rows } = await db.query<ThreadRow>(
        `${THREAD_SELECT}
         WHERE EXISTS (SELECT 1 FROM forum_follows f WHERE f.thread_id = t.id AND f.user_id = $1)
         ORDER BY t.last_post_at DESC LIMIT $2`,
        [viewerId, limit],
      );
      return rows.map(toThread);
    },

    async thread(id: number, viewerId: string | undefined): Promise<ThreadRecord> {
      const { rows } = await db.query<ThreadRow>(`${THREAD_SELECT} WHERE t.id = $2`, [
        viewerId ?? null,
        id,
      ]);
      if (!rows[0]) throw new ForumThreadNotFoundError();
      return toThread(rows[0]);
    },

    async posts(
      threadId: number,
      viewerId: string | undefined,
      page: { offset: number; limit: number },
    ): Promise<{ posts: PostRecord[]; total: number }> {
      const [{ rows }, count] = await Promise.all([
        db.query<PostRow>(
          `${POST_SELECT} WHERE p.thread_id = $2 ORDER BY p.id LIMIT $3 OFFSET $4`,
          [viewerId ?? null, threadId, page.limit, page.offset],
        ),
        db.query<{ total: number }>(
          'SELECT count(*)::int AS total FROM forum_posts WHERE thread_id = $1',
          [threadId],
        ),
      ]);
      return { posts: rows.map(toPost), total: count.rows[0]!.total };
    },

    async post(id: number, viewerId?: string): Promise<PostRecord> {
      const { rows } = await db.query<PostRow>(`${POST_SELECT} WHERE p.id = $2`, [
        viewerId ?? null,
        id,
      ]);
      if (!rows[0]) throw new ForumPostNotFoundError();
      return toPost(rows[0]);
    },

    /** Records a view, and that the viewer has read everything so far. */
    async markRead(threadId: number, viewerId: string | undefined): Promise<void> {
      await db.query('UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1', [
        threadId,
      ]);
      if (viewerId)
        await db.query(
          `INSERT INTO forum_reads (thread_id, user_id, last_read_at) VALUES ($1, $2, now())
           ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = now()`,
          [threadId, viewerId],
        );
    },

    /** A thread and its opening post, in one statement. */
    async createThread(input: {
      categoryId: string;
      authorId: string;
      title: string;
      body: string;
      resultId: string | undefined;
    }): Promise<number> {
      const { rows } = await db.query<{ id: string }>(
        `WITH t AS (
           INSERT INTO forum_threads (category_id, author_id, title, result_id)
           VALUES ($1, $2, $3, $4) RETURNING id
         ), p AS (
           INSERT INTO forum_posts (thread_id, author_id, body) SELECT id, $2, $5 FROM t
         )
         SELECT id FROM t`,
        [input.categoryId, input.authorId, input.title, input.resultId ?? null, input.body],
      );
      const id = Number(rows[0]!.id);
      await this.follow(id, input.authorId, true);
      await db.query(
        'INSERT INTO forum_reads (thread_id, user_id, last_read_at) VALUES ($1, $2, now())',
        [id, input.authorId],
      );
      return id;
    },

    async reply(threadId: number, authorId: string, body: string): Promise<number> {
      const { rows } = await db.query<{ id: string }>(
        `WITH p AS (
           INSERT INTO forum_posts (thread_id, author_id, body) VALUES ($1, $2, $3)
           RETURNING id, created_at
         )
         UPDATE forum_threads t SET last_post_at = p.created_at FROM p WHERE t.id = $1
         RETURNING p.id`,
        [threadId, authorId, body],
      );
      if (!rows[0]) throw new ForumThreadNotFoundError();
      await this.follow(threadId, authorId, true);
      await db.query(
        `INSERT INTO forum_reads (thread_id, user_id, last_read_at) VALUES ($1, $2, now())
         ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = now()`,
        [threadId, authorId],
      );
      return Number(rows[0].id);
    },

    async editPost(id: number, body: string): Promise<void> {
      await db.query('UPDATE forum_posts SET body = $2, edited_at = now() WHERE id = $1', [
        id,
        body,
      ]);
    },

    async setUseful(postId: number, userId: string, useful: boolean): Promise<void> {
      await db.query(
        useful
          ? 'INSERT INTO forum_reactions (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING'
          : 'DELETE FROM forum_reactions WHERE post_id = $1 AND user_id = $2',
        [postId, userId],
      );
    },

    async follow(threadId: number, userId: string, following: boolean): Promise<void> {
      await db.query(
        following
          ? 'INSERT INTO forum_follows (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING'
          : 'DELETE FROM forum_follows WHERE thread_id = $1 AND user_id = $2',
        [threadId, userId],
      );
    },

    /** Posts the user made in the last hour, and in all. */
    async postCounts(userId: string): Promise<{ lastHour: number; total: number }> {
      const { rows } = await db.query<{ last_hour: number; total: number }>(
        `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS last_hour,
                count(*)::int AS total
         FROM forum_posts WHERE author_id = $1`,
        [userId],
      );
      return { lastHour: rows[0]!.last_hour, total: rows[0]!.total };
    },

    /** Whether a result is the user's own and visible, so it can go on a thread. */
    async ownsResult(userId: string, resultId: string): Promise<boolean> {
      const { rows } = await db.query(
        'SELECT 1 FROM session_results WHERE id = $1 AND user_id = $2 AND NOT hidden',
        [resultId, userId],
      );
      return rows.length > 0;
    },

    // ---- Reports and moderation ----------------------------------------------------

    /** Files a report (once per pilot per post while it's open). */
    async report(postId: number, reporterId: string, reason: string): Promise<void> {
      await db.query(
        `INSERT INTO forum_reports (post_id, reporter_id, reason) VALUES ($1, $2, $3)
         ON CONFLICT (post_id, reporter_id) WHERE resolved_at IS NULL DO NOTHING`,
        [postId, reporterId, reason],
      );
    },

    async openReports(): Promise<ForumReport[]> {
      const { rows } = await db.query<{
        id: string;
        reason: string;
        created_at: Date;
        reporter_handle: string | null;
        reporter_name: string | null;
        reporter_role: UserRole | null;
        post_id: string;
        body: string;
        hidden_at: Date | null;
        author_handle: string | null;
        author_name: string | null;
        author_role: UserRole | null;
        opening: boolean;
        thread_id: string;
        title: string;
      }>(
        `SELECT r.id, r.reason, r.created_at,
           ru.handle AS reporter_handle, ru.display_name AS reporter_name, ru.role AS reporter_role,
           p.id AS post_id, p.body, p.hidden_at,
           a.handle AS author_handle, a.display_name AS author_name, a.role AS author_role,
           p.id = (SELECT min(f.id) FROM forum_posts f WHERE f.thread_id = p.thread_id) AS opening,
           t.id AS thread_id, t.title
         FROM forum_reports r
         JOIN forum_posts p ON p.id = r.post_id
         JOIN forum_threads t ON t.id = p.thread_id
         LEFT JOIN users ru ON ru.id = r.reporter_id
         LEFT JOIN users a ON a.id = p.author_id
         WHERE r.resolved_at IS NULL
         ORDER BY r.created_at`,
      );
      return rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        createdAt: row.created_at.toISOString(),
        reporter: author(row.reporter_handle, row.reporter_name, row.reporter_role),
        post: {
          id: Number(row.post_id),
          body: row.body,
          hidden: row.hidden_at !== null,
          author: author(row.author_handle, row.author_name, row.author_role),
          opening: row.opening,
        },
        thread: { id: Number(row.thread_id), slug: threadSlug(row.title), title: row.title },
      }));
    },

    async openReportCount(): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM forum_reports WHERE resolved_at IS NULL',
      );
      return rows[0]!.count;
    },

    /** Closes the open reports on a post. Returns how many there were. */
    async resolveReports(
      postId: number,
      by: string,
      resolution: 'dismissed' | 'hidden' | 'deleted',
    ): Promise<number> {
      const { rowCount } = await db.query(
        `UPDATE forum_reports SET resolved_at = now(), resolved_by = $2, resolution = $3
         WHERE post_id = $1 AND resolved_at IS NULL`,
        [postId, by, resolution],
      );
      return rowCount ?? 0;
    },

    async reportPostId(reportId: string): Promise<number> {
      const { rows } = await db.query<{ post_id: string }>(
        'SELECT post_id FROM forum_reports WHERE id = $1',
        [reportId],
      );
      if (!rows[0]) throw new ForumPostNotFoundError();
      return Number(rows[0].post_id);
    },

    async setHidden(postId: number, hidden: boolean, by: string): Promise<void> {
      await db.query(
        hidden
          ? 'UPDATE forum_posts SET hidden_at = coalesce(hidden_at, now()), hidden_by = $2 WHERE id = $1'
          : 'UPDATE forum_posts SET hidden_at = NULL, hidden_by = NULL WHERE id = $1',
        hidden ? [postId, by] : [postId],
      );
    },

    /** Deletes a reply; the thread's latest activity becomes its new last post. */
    async deletePost(postId: number): Promise<void> {
      const { rows } = await db.query<{ thread_id: string }>(
        'DELETE FROM forum_posts WHERE id = $1 RETURNING thread_id',
        [postId],
      );
      if (!rows[0]) throw new ForumPostNotFoundError();
      await db.query(
        `UPDATE forum_threads t SET last_post_at = coalesce(
           (SELECT max(p.created_at) FROM forum_posts p WHERE p.thread_id = t.id), t.created_at)
         WHERE t.id = $1`,
        [rows[0].thread_id],
      );
    },

    async updateThread(
      id: number,
      changes: {
        pinned?: boolean | undefined;
        locked?: boolean | undefined;
        categoryId?: string | undefined;
      },
    ): Promise<void> {
      const sets: string[] = [];
      const params: unknown[] = [id];
      for (const [column, value] of [
        ['pinned', changes.pinned],
        ['locked', changes.locked],
        ['category_id', changes.categoryId],
      ] as const) {
        if (value === undefined) continue;
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
      if (sets.length === 0) return;
      const { rowCount } = await db.query(
        `UPDATE forum_threads SET ${sets.join(', ')} WHERE id = $1`,
        params,
      );
      if (!rowCount) throw new ForumThreadNotFoundError();
    },

    async deleteThread(id: number): Promise<void> {
      const { rowCount } = await db.query('DELETE FROM forum_threads WHERE id = $1', [id]);
      if (!rowCount) throw new ForumThreadNotFoundError();
    },
  };
}

export type ForumRepository = ReturnType<typeof forumRepository>;
