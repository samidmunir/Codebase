import { z } from 'zod';
import { forumAuthorSchema, FORUM_BODY_MAX } from './community';

// Site-wide content for staff: community categories, searching every thread and
// post, every saved session, and the records.

// ---- Community categories (admins) -------------------------------------------------

export const categoryIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes, e.g. “tower-talk”')
  .max(40);

export const categoryRequestSchema = z.object({
  name: z.string().trim().min(2, 'Give it a name').max(40),
  description: z.string().trim().min(1, 'Say what goes here').max(200),
  /** Only admins start threads in it (anyone can reply). */
  adminOnly: z.boolean().default(false),
});
export const newCategoryRequestSchema = categoryRequestSchema.extend({ id: categoryIdSchema });
export type NewCategoryRequest = z.input<typeof newCategoryRequestSchema>;
export const updateCategoryRequestSchema = categoryRequestSchema.partial().extend({
  /** Move it up (-1) or down (1) the list. */
  move: z.union([z.literal(-1), z.literal(1)]).optional(),
});
export type UpdateCategoryRequest = z.input<typeof updateCategoryRequestSchema>;

/** Deleting a category with threads moves them somewhere first. */
export const deleteCategoryRequestSchema = z.object({ moveTo: categoryIdSchema.optional() });

// ---- Searching threads and posts (staff) ---------------------------------------------

const page = {
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};

export const adminThreadQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(40).optional(),
  state: z.enum(['pinned', 'locked']).optional(),
  ...page,
});
export type AdminThreadQuery = z.input<typeof adminThreadQuerySchema>;

export const adminThreadSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  categoryId: z.string(),
  author: forumAuthorSchema,
  replies: z.number().int().min(0),
  views: z.number().int().min(0),
  pinned: z.boolean(),
  locked: z.boolean(),
  openReports: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  lastPostAt: z.iso.datetime(),
});
export type AdminThread = z.infer<typeof adminThreadSchema>;
export const adminThreadListSchema = z.object({
  threads: z.array(adminThreadSchema),
  total: z.number().int().min(0),
});
export type AdminThreadList = z.infer<typeof adminThreadListSchema>;

export const adminPostQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  /** A pilot's handle. */
  author: z.string().trim().max(40).optional(),
  category: z.string().max(40).optional(),
  state: z.enum(['hidden', 'reported', 'edited']).optional(),
  ...page,
});
export type AdminPostQuery = z.input<typeof adminPostQuerySchema>;

export const adminPostSchema = z.object({
  id: z.number().int(),
  thread: z.object({ id: z.number().int(), slug: z.string(), title: z.string() }),
  categoryId: z.string(),
  author: forumAuthorSchema,
  body: z.string(),
  hidden: z.boolean(),
  opening: z.boolean(),
  openReports: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
});
export type AdminPost = z.infer<typeof adminPostSchema>;
export const adminPostListSchema = z.object({
  posts: z.array(adminPostSchema),
  total: z.number().int().min(0),
});
export type AdminPostList = z.infer<typeof adminPostListSchema>;

/** Staff can rewrite any post (it's marked edited, and the old text kept in the log). */
export const adminEditPostRequestSchema = z.object({
  body: z.string().trim().min(1).max(FORUM_BODY_MAX),
});

// ---- Saved sessions (admins) -----------------------------------------------------------

export const adminSavedSessionQuerySchema = z.object({
  /** Matches the session's name or its owner's handle or email. */
  q: z.string().trim().max(100).optional(),
  airspace: z.string().max(40).optional(),
  ...page,
});
export type AdminSavedSessionQuery = z.input<typeof adminSavedSessionQuerySchema>;

export const adminSavedSessionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  airspaceId: z.string(),
  rp: z.number(),
  simTimeSec: z.number(),
  /** How much space the snapshot takes. */
  bytes: z.number().int().min(0),
  owner: z.object({ id: z.uuid(), handle: z.string(), email: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AdminSavedSession = z.infer<typeof adminSavedSessionSchema>;
export const adminSavedSessionListSchema = z.object({
  sessions: z.array(adminSavedSessionSchema),
  total: z.number().int().min(0),
  /** All saved sessions' snapshots together. */
  totalBytes: z.number().int().min(0),
});
export type AdminSavedSessionList = z.infer<typeof adminSavedSessionListSchema>;

// ---- Records -------------------------------------------------------------------------

export const adminResultBulkRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  hidden: z.boolean(),
});
