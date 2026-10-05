import { z } from 'zod';

// News and release notes (/api/news, /api/admin/news), shared by the server and client.

export const NEWS_PAGE_SIZE = 20;

export const newsSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

export const newsPostSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** Markdown. */
  body: z.string(),
  /** When it went out; null for a draft. */
  publishedAt: z.iso.datetime().nullable(),
  /** The admin who wrote it, if their account still exists. */
  author: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});
export type NewsPost = z.infer<typeof newsPostSchema>;

export const newsListSchema = z.object({
  posts: z.array(newsPostSchema),
  total: z.number().int().min(0),
});
export type NewsList = z.infer<typeof newsListSchema>;

/** Writing or editing a post. A slug is made from the title if none is given. */
export const newsPostRequestSchema = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(120),
  slug: newsSlugSchema.optional(),
  summary: z.string().trim().max(300).default(''),
  body: z.string().max(50_000).default(''),
  published: z.boolean().default(false),
});
export type NewsPostRequest = z.input<typeof newsPostRequestSchema>;

/** 'Chicago is here!' -> 'chicago-is-here'. */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'post'
  );
}
