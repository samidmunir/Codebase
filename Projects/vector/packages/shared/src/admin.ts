import { z } from 'zod';
import {
  displayNameSchema,
  emailSchema,
  handleSchema,
  passwordSchema,
  userRoleSchema,
} from './auth';
import { verificationSchema } from './results';
import { savedSessionSummarySchema, sessionDifficultySchema } from './sessions';
import { signInSchema } from './sign-ins';

// Administration API contracts (/api/admin), shared by the server and client.

/** A user as an admin sees them. */
export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  emailVerified: z.boolean(),
  handle: z.string(),
  displayName: z.string(),
  role: userRoleSchema,
  disabledAt: z.iso.datetime().nullable(),
  /** Can't post in the community until then; 'forever' for good. */
  postingSuspendedUntil: z.union([z.iso.datetime(), z.literal('forever')]).nullable(),
  createdAt: z.iso.datetime(),
  /** Last sign-in or token refresh, if any. */
  lastActiveAt: z.iso.datetime().nullable(),
  /** Sign-ins (refresh tokens) still valid. */
  activeSignIns: z.number().int().min(0),
  savedSessions: z.number().int().min(0),
  careerRp: z.number(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const ADMIN_USERS_PAGE_SIZE = 50;

export const adminUserListSchema = z.object({
  users: z.array(adminUserSchema),
  /** Users matching the search, across all pages. */
  total: z.number().int().min(0),
});
export type AdminUserList = z.infer<typeof adminUserListSchema>;

export const adminUserListQuerySchema = z.object({
  /** Matches email, handle or display name. */
  q: z.string().trim().max(100).optional(),
  role: userRoleSchema.optional(),
  status: z.enum(['active', 'disabled']).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(ADMIN_USERS_PAGE_SIZE),
});
export type AdminUserListQuery = z.input<typeof adminUserListQuerySchema>;

/** Everything about one user, for their admin page. */
export const adminUserDetailSchema = z.object({
  user: adminUserSchema.extend({
    profilePublic: z.boolean(),
    showOnRecords: z.boolean(),
    /** When they may next change their handle (null: now). */
    handleChangeableAt: z.iso.datetime().nullable(),
    pendingEmail: z.string().nullable(),
  }),
  sessions: z.array(savedSessionSummarySchema),
  signIns: z.array(signInSchema),
  results: z.object({
    total: z.number().int().min(0),
    recent: z.array(
      z.object({
        id: z.uuid(),
        airspaceId: z.string(),
        difficulty: sessionDifficultySchema.nullable(),
        rp: z.number(),
        simTimeSec: z.number(),
        verification: verificationSchema,
        hidden: z.boolean(),
        playedAt: z.iso.datetime(),
      }),
    ),
  }),
  posts: z.object({
    total: z.number().int().min(0),
    recent: z.array(
      z.object({
        id: z.number().int(),
        threadId: z.number().int(),
        threadTitle: z.string(),
        excerpt: z.string(),
        hidden: z.boolean(),
        createdAt: z.iso.datetime(),
      }),
    ),
  }),
  history: z.array(z.lazy(() => auditEntrySchema)),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

export const adminCreateUserRequestSchema = z.object({
  email: emailSchema,
  handle: handleSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  role: userRoleSchema.default('player'),
  /** Send the new user a link to verify their email (otherwise an admin can mark it verified). */
  sendVerification: z.boolean().default(true),
});
export type AdminCreateUserRequest = z.input<typeof adminCreateUserRequestSchema>;

/** Any of a user's details; a new password, disabling or a role change signs them out everywhere. */
export const adminUpdateUserRequestSchema = z
  .object({
    email: emailSchema,
    handle: handleSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
    role: userRoleSchema,
    disabled: z.boolean(),
    /** Mark the email verified (or not) without a link, e.g. for an account an admin set up. */
    emailVerified: z.boolean(),
    profilePublic: z.boolean(),
    showOnRecords: z.boolean(),
    /** Let them change their handle again now, whenever they last did. */
    liftHandleLimit: z.literal(true),
    /** Suspend from posting in the community for some days or for good, or lift it. */
    postingSuspension: z.union([
      z.number().int().min(1).max(365),
      z.literal('forever'),
      z.literal('lift'),
    ]),
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one thing');
export type AdminUpdateUserRequest = z.input<typeof adminUpdateUserRequestSchema>;

export const adminAirspaceSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  updatedAt: z.iso.datetime(),
  /** Email of the admin who last changed it, if anyone has. */
  updatedBy: z.string().nullable(),
  savedSessions: z.number().int().min(0),
});
export type AdminAirspace = z.infer<typeof adminAirspaceSchema>;

export const adminAirspaceListSchema = z.object({ airspaces: z.array(adminAirspaceSchema) });
export type AdminAirspaceList = z.infer<typeof adminAirspaceListSchema>;

export const adminUpdateAirspaceRequestSchema = z.object({ enabled: z.boolean() });
export type AdminUpdateAirspaceRequest = z.input<typeof adminUpdateAirspaceRequestSchema>;

export const AUDIT_ACTIONS = [
  'user.create',
  'user.update',
  'user.delete',
  'user.signOut',
  'user.sessionDelete',
  'user.endSignIn',
  'user.sendReset',
  'user.sendVerification',
  'user.export',
  'airspace.update',
  'site.update',
  'scoring.update',
  'release.create',
  'release.update',
  'release.delete',
  'invite.create',
  'invite.revoke',
  'waitlist.invite',
  'waitlist.delete',
  'result.hide',
  'result.show',
  'result.reverify',
  'forum.createCategory',
  'forum.updateCategory',
  'forum.deleteCategory',
  'forum.editPost',
  'news.create',
  'news.update',
  'news.delete',
  'forum.hidePost',
  'forum.showPost',
  'forum.deletePost',
  'forum.updateThread',
  'forum.deleteThread',
  'forum.dismissReport',
  'admin.grant',
  'admin.revoke',
] as const;
export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  /** Who did it: an admin's email, or 'command line'. */
  actor: z.string(),
  action: auditActionSchema,
  /** What it was done to, as shown then (an email or an airspace id). */
  target: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditLogSchema = z.object({ entries: z.array(auditEntrySchema) });
export type AuditLog = z.infer<typeof auditLogSchema>;

export const adminSummarySchema = z.object({
  users: z.number().int().min(0),
  admins: z.number().int().min(0),
  disabled: z.number().int().min(0),
  /** Users active (signed in or refreshed) in the last 24 hours. */
  activeToday: z.number().int().min(0),
  savedSessions: z.number().int().min(0),
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

/** A session result as an admin sees it (any pilot's, hidden or not). */
export const adminResultSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  userId: z.uuid(),
  /** The pilot is on the records (their own choice, or an admin's). */
  onRecords: z.boolean(),
  airspaceId: z.string(),
  difficulty: sessionDifficultySchema.nullable(),
  simTimeSec: z.number(),
  rp: z.number(),
  verification: verificationSchema,
  /** Why it isn't verified, e.g. 'replay differs'. */
  verificationNote: z.string().nullable(),
  hidden: z.boolean(),
  playedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AdminResult = z.infer<typeof adminResultSchema>;

export const adminResultListQuerySchema = z.object({
  verification: verificationSchema.optional(),
  hidden: z.enum(['true', 'false']).optional(),
  /** A pilot's handle. */
  handle: z.string().trim().max(40).optional(),
  airspace: z.string().max(40).optional(),
  difficulty: sessionDifficultySchema.optional(),
  /** Newest first, or the highest RP first (as the records rank them). */
  sort: z.enum(['recent', 'rp']).default('recent'),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(ADMIN_USERS_PAGE_SIZE),
});
export type AdminResultListQuery = z.input<typeof adminResultListQuerySchema>;

export const adminResultListSchema = z.object({
  results: z.array(adminResultSchema),
  total: z.number().int().min(0),
});
export type AdminResultList = z.infer<typeof adminResultListSchema>;

export const adminUpdateResultRequestSchema = z.object({ hidden: z.boolean() });
export type AdminUpdateResultRequest = z.input<typeof adminUpdateResultRequestSchema>;

// ---- Bulk actions and export ---------------------------------------------------------

export const ADMIN_BULK_ACTIONS = [
  'disable',
  'enable',
  'signOut',
  'verifyEmail',
  'suspendPosting',
  'liftSuspension',
  'delete',
] as const;
export const adminBulkRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  action: z.enum(ADMIN_BULK_ACTIONS),
});
export type AdminBulkRequest = z.input<typeof adminBulkRequestSchema>;
export type AdminBulkAction = (typeof ADMIN_BULK_ACTIONS)[number];

export const adminBulkResultSchema = z.object({
  done: z.number().int().min(0),
  /** Users it couldn't be done to, and why (e.g. yourself, or the last admin). */
  failed: z.array(z.object({ id: z.uuid(), email: z.string(), reason: z.string() })),
});
export type AdminBulkResult = z.infer<typeof adminBulkResultSchema>;
