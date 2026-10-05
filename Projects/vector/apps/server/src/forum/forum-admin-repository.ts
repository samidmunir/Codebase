import {
  threadSlug,
  type AdminPost,
  type AdminThread,
  type ForumAuthor,
  type UserRole,
} from '@vector/shared';
import type { Database } from '../platform/database';
import { ForumCategoryNotFoundError } from './forum-repository';

/** A category id someone already uses. */
export class CategoryTakenError extends Error {
  constructor() {
    super('A category with that address already exists');
    this.name = 'CategoryTakenError';
  }
}

/** Deleting a category that still has threads, without saying where they go. */
export class CategoryNotEmptyError extends Error {
  constructor(readonly threads: number) {
    super(
      `It has ${threads} thread${threads === 1 ? '' : 's'}: choose a category to move them to first`,
    );
    this.name = 'CategoryNotEmptyError';
  }
}

const author = (handle: string | null, name: string | null, role: UserRole | null): ForumAuthor =>
  handle && name && role ? { handle, displayName: name, role } : null;

/** Escapes LIKE wildcards in a search term. */
const like = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Managing the community: categories, and searching every thread and post. */
export function forumAdminRepository(db: Database) {
  return {
    async createCategory(input: {
      id: string;
      name: string;
      description: string;
      adminOnly: boolean;
    }): Promise<void> {
      try {
        await db.query(
          `INSERT INTO forum_categories (id, name, description, admin_only, position)
           VALUES ($1, $2, $3, $4, (SELECT coalesce(max(position), 0) + 1 FROM forum_categories))`,
          [input.id, input.name, input.description, input.adminOnly],
        );
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new CategoryTakenError();
        throw error;
      }
    },

    async updateCategory(
      id: string,
      changes: {
        name?: string | undefined;
        description?: string | undefined;
        adminOnly?: boolean | undefined;
      },
    ): Promise<void> {
      const sets: string[] = [];
      const params: unknown[] = [id];
      for (const [column, value] of [
        ['name', changes.name],
        ['description', changes.description],
        ['admin_only', changes.adminOnly],
      ] as const) {
        if (value === undefined) continue;
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
      if (sets.length === 0) return;
      const { rowCount } = await db.query(
        `UPDATE forum_categories SET ${sets.join(', ')} WHERE id = $1`,
        params,
      );
      if (!rowCount) throw new ForumCategoryNotFoundError();
    },

    /** Swaps a category with its neighbour above (-1) or below (1). */
    async moveCategory(id: string, direction: -1 | 1): Promise<void> {
      const { rows } = await db.query<{ id: string; position: number }>(
        'SELECT id, position FROM forum_categories ORDER BY position, id',
      );
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) throw new ForumCategoryNotFoundError();
      const neighbour = rows[index + direction];
      if (!neighbour) return;
      // Renumber in order first, so positions are distinct, then swap.
      const order = rows.map((row) => row.id);
      [order[index], order[index + direction]] = [order[index + direction]!, order[index]!];
      await db.query(
        `UPDATE forum_categories c SET position = o.position
         FROM unnest($1::text[]) WITH ORDINALITY AS o(id, position) WHERE c.id = o.id`,
        [order],
      );
    },

    async threadCount(id: string): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM forum_threads WHERE category_id = $1',
        [id],
      );
      return rows[0]!.count;
    },

    /** Deletes a category, moving its threads to another first if asked. Returns how many moved. */
    async deleteCategory(id: string, moveTo: string | undefined): Promise<number> {
      const threads = await this.threadCount(id);
      if (threads > 0 && !moveTo) throw new CategoryNotEmptyError(threads);
      let moved = 0;
      if (moveTo && threads > 0) {
        const result = await db.query(
          'UPDATE forum_threads SET category_id = $2 WHERE category_id = $1',
          [id, moveTo],
        );
        moved = result.rowCount ?? 0;
      }
      const { rowCount } = await db.query('DELETE FROM forum_categories WHERE id = $1', [id]);
      if (!rowCount) throw new ForumCategoryNotFoundError();
      return moved;
    },

    async categoryName(id: string): Promise<string> {
      const { rows } = await db.query<{ name: string }>(
        'SELECT name FROM forum_categories WHERE id = $1',
        [id],
      );
      if (!rows[0]) throw new ForumCategoryNotFoundError();
      return rows[0].name;
    },

    async threads(query: {
      q?: string | undefined;
      category?: string | undefined;
      state?: 'pinned' | 'locked' | undefined;
      offset: number;
      limit: number;
    }): Promise<{ threads: AdminThread[]; total: number }> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (query.q) {
        params.push(like(query.q));
        where.push(`t.title ILIKE $${params.length}`);
      }
      if (query.category) {
        params.push(query.category);
        where.push(`t.category_id = $${params.length}`);
      }
      if (query.state === 'pinned') where.push('t.pinned');
      if (query.state === 'locked') where.push('t.locked');
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [{ rows }, count] = await Promise.all([
        db.query<{
          id: string;
          title: string;
          category_id: string;
          handle: string | null;
          display_name: string | null;
          role: UserRole | null;
          replies: number;
          view_count: number;
          pinned: boolean;
          locked: boolean;
          open_reports: number;
          created_at: Date;
          last_post_at: Date;
        }>(
          `SELECT t.id, t.title, t.category_id, a.handle, a.display_name, a.role,
             (SELECT count(*)::int - 1 FROM forum_posts p WHERE p.thread_id = t.id) AS replies,
             t.view_count, t.pinned, t.locked,
             (SELECT count(*)::int FROM forum_reports r JOIN forum_posts p ON p.id = r.post_id
                WHERE p.thread_id = t.id AND r.resolved_at IS NULL) AS open_reports,
             t.created_at, t.last_post_at
           FROM forum_threads t LEFT JOIN users a ON a.id = t.author_id
           ${clause}
           ORDER BY t.last_post_at DESC, t.id DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, query.limit, query.offset],
        ),
        db.query<{ total: number }>(
          `SELECT count(*)::int AS total FROM forum_threads t ${clause}`,
          params,
        ),
      ]);
      return {
        total: count.rows[0]!.total,
        threads: rows.map((row) => ({
          id: Number(row.id),
          slug: threadSlug(row.title),
          title: row.title,
          categoryId: row.category_id,
          author: author(row.handle, row.display_name, row.role),
          replies: row.replies,
          views: row.view_count,
          pinned: row.pinned,
          locked: row.locked,
          openReports: row.open_reports,
          createdAt: row.created_at.toISOString(),
          lastPostAt: row.last_post_at.toISOString(),
        })),
      };
    },

    async posts(query: {
      q?: string | undefined;
      author?: string | undefined;
      category?: string | undefined;
      state?: 'hidden' | 'reported' | 'edited' | undefined;
      offset: number;
      limit: number;
    }): Promise<{ posts: AdminPost[]; total: number }> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (query.q) {
        params.push(like(query.q));
        where.push(`p.body ILIKE $${params.length}`);
      }
      if (query.author) {
        params.push(query.author);
        where.push(`a.handle = $${params.length}`);
      }
      if (query.category) {
        params.push(query.category);
        where.push(`t.category_id = $${params.length}`);
      }
      if (query.state === 'hidden') where.push('p.hidden_at IS NOT NULL');
      if (query.state === 'edited') where.push('p.edited_at IS NOT NULL');
      if (query.state === 'reported')
        where.push(
          'EXISTS (SELECT 1 FROM forum_reports r WHERE r.post_id = p.id AND r.resolved_at IS NULL)',
        );
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const from = `FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id
                    LEFT JOIN users a ON a.id = p.author_id ${clause}`;
      const [{ rows }, count] = await Promise.all([
        db.query<{
          id: string;
          thread_id: string;
          title: string;
          category_id: string;
          handle: string | null;
          display_name: string | null;
          role: UserRole | null;
          body: string;
          hidden_at: Date | null;
          opening: boolean;
          open_reports: number;
          created_at: Date;
          edited_at: Date | null;
        }>(
          `SELECT p.id, p.thread_id, t.title, t.category_id, a.handle, a.display_name, a.role,
             p.body, p.hidden_at, p.created_at, p.edited_at,
             p.id = (SELECT min(f.id) FROM forum_posts f WHERE f.thread_id = p.thread_id) AS opening,
             (SELECT count(*)::int FROM forum_reports r
                WHERE r.post_id = p.id AND r.resolved_at IS NULL) AS open_reports
           ${from}
           ORDER BY p.created_at DESC, p.id DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, query.limit, query.offset],
        ),
        db.query<{ total: number }>(`SELECT count(*)::int AS total ${from}`, params),
      ]);
      return {
        total: count.rows[0]!.total,
        posts: rows.map((row) => ({
          id: Number(row.id),
          thread: { id: Number(row.thread_id), slug: threadSlug(row.title), title: row.title },
          categoryId: row.category_id,
          author: author(row.handle, row.display_name, row.role),
          body: row.body,
          hidden: row.hidden_at !== null,
          opening: row.opening,
          openReports: row.open_reports,
          createdAt: row.created_at.toISOString(),
          editedAt: row.edited_at?.toISOString() ?? null,
        })),
      };
    },
  };
}

export type ForumAdminRepository = ReturnType<typeof forumAdminRepository>;
