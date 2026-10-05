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

// Administration API contracts (/api/admin), shared by the server and client.

/** A user as an admin sees them. */
export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  handle: z.string(),
  displayName: z.string(),
  role: userRoleSchema,
  disabledAt: z.iso.datetime().nullable(),
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

export const adminUserDetailSchema = z.object({
  user: adminUserSchema,
  sessions: z.array(savedSessionSummarySchema),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

export const adminCreateUserRequestSchema = z.object({
  email: emailSchema,
  handle: handleSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  role: userRoleSchema.default('player'),
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
  'airspace.update',
  'result.hide',
  'result.show',
  'result.reverify',
  'news.create',
  'news.update',
  'news.delete',
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
