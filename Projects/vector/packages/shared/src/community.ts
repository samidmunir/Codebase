import { z } from 'zod';
import { userRoleSchema } from './auth';

// The community forum (/api/community), shared by the server and client.

export const FORUM_THREADS_PAGE_SIZE = 30;
export const FORUM_POSTS_PAGE_SIZE = 30;
export const FORUM_TITLE_MAX = 120;
export const FORUM_BODY_MAX = 20_000;
export const FORUM_REPORT_MAX = 500;
/** Authors can edit a post for this long. */
export const FORUM_EDIT_HOURS = 24;
/** Links to other sites unlock once a pilot has posted this many times. */
export const FORUM_NEW_POSTER_POSTS = 3;
/** Accounts younger than this can post fewer times an hour. */
export const FORUM_NEW_ACCOUNT_DAYS = 3;
export const FORUM_POSTS_PER_HOUR = { newAccount: 5, regular: 20 } as const;
/** A thread nobody has opened counts as new for this long. */
export const FORUM_NEW_THREAD_DAYS = 3;

/** Links to other sites (new posters can't post them). */
export const EXTERNAL_LINK_PATTERN = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./i;

/** A title as it appears in thread addresses: /community/t/42/sequencing-jfk-31l. */
export function threadSlug(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'thread'
  );
}

export const forumAuthorSchema = z
  .object({
    handle: z.string(),
    displayName: z.string(),
    role: userRoleSchema,
  })
  .nullable(); // Null: the account was deleted.
export type ForumAuthor = z.infer<typeof forumAuthorSchema>;

export const forumCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  adminOnly: z.boolean(),
  threads: z.number().int().min(0),
  posts: z.number().int().min(0),
  latest: z
    .object({ threadId: z.number().int(), title: z.string(), lastPostAt: z.iso.datetime() })
    .nullable(),
});
export type ForumCategory = z.infer<typeof forumCategorySchema>;

export const forumThreadSummarySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  categoryId: z.string(),
  author: forumAuthorSchema,
  createdAt: z.iso.datetime(),
  lastPostAt: z.iso.datetime(),
  lastPoster: forumAuthorSchema,
  replies: z.number().int().min(0),
  views: z.number().int().min(0),
  pinned: z.boolean(),
  locked: z.boolean(),
  /** Signed in: new to you (posts since you last read it, or a new thread you haven't opened). */
  unread: z.boolean(),
});
export type ForumThreadSummary = z.infer<typeof forumThreadSummarySchema>;

export const forumCategoryListSchema = z.object({
  categories: z.array(forumCategorySchema),
  latest: z.array(forumThreadSummarySchema),
});
export type ForumCategoryList = z.infer<typeof forumCategoryListSchema>;

export const forumPostSchema = z.object({
  id: z.number().int(),
  author: forumAuthorSchema,
  /** Null when a moderator hid it (admins still see it). */
  body: z.string().nullable(),
  hidden: z.boolean(),
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
  useful: z.number().int().min(0),
  usefulByYou: z.boolean(),
  /** You wrote it and it's still within the edit window. */
  canEdit: z.boolean(),
  /** The thread's opening post. */
  opening: z.boolean(),
});
export type ForumPost = z.infer<typeof forumPostSchema>;

/** Whether, and if not why not, the signed-in pilot can post. */
export const forumPostingSchema = z.discriminatedUnion('allowed', [
  /** newPoster: links to other sites aren't allowed yet. */
  z.object({ allowed: z.literal(true), newPoster: z.boolean() }),
  z.object({
    allowed: z.literal(false),
    reason: z.enum(['signedOut', 'unverified', 'suspended', 'locked', 'adminOnly']),
    /** Suspended until then (null: for good). */
    until: z.iso.datetime().nullable().optional(),
  }),
]);
export type ForumPosting = z.infer<typeof forumPostingSchema>;

export const forumThreadListSchema = z.object({
  category: forumCategorySchema,
  threads: z.array(forumThreadSummarySchema),
  total: z.number().int().min(0),
  /** Whether you can start a thread here. */
  posting: forumPostingSchema,
});
export type ForumThreadList = z.infer<typeof forumThreadListSchema>;

export const forumThreadSchema = z.object({
  thread: forumThreadSummarySchema.extend({
    categoryName: z.string(),
    resultId: z.uuid().nullable(),
    following: z.boolean(),
  }),
  posts: z.array(forumPostSchema),
  total: z.number().int().min(0),
  offset: z.number().int().min(0),
  /** Whether you can reply here. */
  posting: forumPostingSchema,
});
export type ForumThread = z.infer<typeof forumThreadSchema>;

export const forumBodySchema = z
  .string()
  .trim()
  .min(1, 'Write something first')
  .max(FORUM_BODY_MAX, `Keep it under ${FORUM_BODY_MAX.toLocaleString('en-US')} characters`);

export const newThreadRequestSchema = z.object({
  categoryId: z.string().min(1).max(40),
  title: z.string().trim().min(3, 'Give it a title of at least 3 characters').max(FORUM_TITLE_MAX),
  body: forumBodySchema,
  /** One of your session results, shown as a card. */
  resultId: z.uuid().optional(),
});
export type NewThreadRequest = z.input<typeof newThreadRequestSchema>;

export const postRequestSchema = z.object({ body: forumBodySchema });
export type PostRequest = z.input<typeof postRequestSchema>;

export const reportRequestSchema = z.object({
  reason: z.string().trim().min(3, 'Say what’s wrong').max(FORUM_REPORT_MAX),
});
export type ReportRequest = z.input<typeof reportRequestSchema>;

export const createdThreadSchema = z.object({ id: z.number().int(), slug: z.string() });
export type CreatedThread = z.infer<typeof createdThreadSchema>;

/** Followed threads, newest activity first. */
export const forumFollowingSchema = z.object({
  threads: z.array(forumThreadSummarySchema),
  /** How many have posts you haven't read. */
  unread: z.number().int().min(0),
});
export type ForumFollowing = z.infer<typeof forumFollowingSchema>;

// ---- Moderation (/api/admin/community) ------------------------------------------

export const forumReportSchema = z.object({
  id: z.uuid(),
  reason: z.string(),
  createdAt: z.iso.datetime(),
  reporter: forumAuthorSchema,
  post: z.object({
    id: z.number().int(),
    body: z.string(),
    hidden: z.boolean(),
    author: forumAuthorSchema,
    opening: z.boolean(),
  }),
  thread: z.object({ id: z.number().int(), slug: z.string(), title: z.string() }),
});
export type ForumReport = z.infer<typeof forumReportSchema>;

export const forumReportListSchema = z.object({ reports: z.array(forumReportSchema) });
export type ForumReportList = z.infer<typeof forumReportListSchema>;

export const moderatePostRequestSchema = z.object({ hidden: z.boolean() });
export type ModeratePostRequest = z.input<typeof moderatePostRequestSchema>;

export const moderateThreadRequestSchema = z
  .object({ pinned: z.boolean(), locked: z.boolean(), categoryId: z.string().min(1).max(40) })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one thing');
export type ModerateThreadRequest = z.input<typeof moderateThreadRequestSchema>;
