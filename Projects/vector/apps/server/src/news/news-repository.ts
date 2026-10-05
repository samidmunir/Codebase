import type { NewsPost } from '@vector/shared';
import type { Database } from '../platform/database';

export class NewsNotFoundError extends Error {
  constructor() {
    super('That post doesn’t exist');
    this.name = 'NewsNotFoundError';
  }
}

export class SlugTakenError extends Error {
  constructor() {
    super('Another post already uses that address');
    this.name = 'SlugTakenError';
  }
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  published_at: Date | null;
  author: string | null;
  updated_at: Date;
}

const SELECT = `SELECT p.id, p.slug, p.title, p.summary, p.body, p.published_at, u.handle AS author,
  p.updated_at FROM news_posts p LEFT JOIN users u ON u.id = p.author_id`;

const toPost = (row: PostRow): NewsPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  body: row.body,
  publishedAt: row.published_at?.toISOString() ?? null,
  author: row.author,
  updatedAt: row.updated_at.toISOString(),
});

const unique = (error: unknown) => (error as { code?: string }).code === '23505';

export interface PostInput {
  title: string;
  slug: string;
  summary: string;
  body: string;
  published: boolean;
}

export function newsRepository(db: Database) {
  return {
    /** Published posts, newest first (or every post, drafts too, for admins). */
    async list(
      offset: number,
      limit: number,
      includeDrafts = false,
    ): Promise<{ posts: NewsPost[]; total: number }> {
      const where = includeDrafts ? '' : 'WHERE p.published_at IS NOT NULL';
      const [{ rows }, count] = await Promise.all([
        db.query<PostRow>(
          `${SELECT} ${where}
           ORDER BY p.published_at DESC NULLS FIRST, p.updated_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        db.query<{ total: number }>(`SELECT count(*)::int AS total FROM news_posts p ${where}`),
      ]);
      return { posts: rows.map(toPost), total: count.rows[0]!.total };
    },

    async bySlug(slug: string, includeDrafts = false): Promise<NewsPost> {
      const { rows } = await db.query<PostRow>(
        `${SELECT} WHERE p.slug = $1 ${includeDrafts ? '' : 'AND p.published_at IS NOT NULL'}`,
        [slug],
      );
      if (!rows[0]) throw new NewsNotFoundError();
      return toPost(rows[0]);
    },

    async byId(id: string): Promise<NewsPost> {
      const { rows } = await db.query<PostRow>(`${SELECT} WHERE p.id = $1`, [id]);
      if (!rows[0]) throw new NewsNotFoundError();
      return toPost(rows[0]);
    },

    async create(authorId: string, input: PostInput): Promise<NewsPost> {
      try {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO news_posts (slug, title, summary, body, published_at, author_id)
           VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() END, $6) RETURNING id`,
          [input.slug, input.title, input.summary, input.body, input.published, authorId],
        );
        return this.byId(rows[0]!.id);
      } catch (error) {
        if (unique(error)) throw new SlugTakenError();
        throw error;
      }
    },

    /** Edits a post. Publishing keeps its first publication date; unpublishing clears it. */
    async update(id: string, input: PostInput): Promise<{ before: NewsPost; after: NewsPost }> {
      const before = await this.byId(id);
      try {
        await db.query(
          `UPDATE news_posts SET slug = $2, title = $3, summary = $4, body = $5,
             published_at = CASE WHEN $6 THEN coalesce(published_at, now()) END, updated_at = now()
           WHERE id = $1`,
          [id, input.slug, input.title, input.summary, input.body, input.published],
        );
      } catch (error) {
        if (unique(error)) throw new SlugTakenError();
        throw error;
      }
      return { before, after: await this.byId(id) };
    },

    async delete(id: string): Promise<NewsPost> {
      const post = await this.byId(id);
      await db.query('DELETE FROM news_posts WHERE id = $1', [id]);
      return post;
    },
  };
}

export type NewsRepository = ReturnType<typeof newsRepository>;
