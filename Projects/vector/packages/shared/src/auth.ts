import { z } from 'zod';

// Account API contracts, shared by the server and client.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH);
export const displayNameSchema = z.string().trim().min(1, 'Enter a display name').max(40);

/**
 * A public handle: how a pilot appears on profiles, records and the forum. Case is
 * kept for display; uniqueness ignores it.
 */
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
/** Days between handle changes, and how long a released handle stays reserved. */
export const HANDLE_CHANGE_DAYS = 30;
export const RESERVED_HANDLES = [
  'admin',
  'administrator',
  'moderator',
  'mod',
  'support',
  'help',
  'vector',
  'staff',
  'system',
  'root',
  'official',
  'deleted',
  'anonymous',
  'me',
  'null',
  'undefined',
] as const;
export const handleSchema = z
  .string()
  .trim()
  .min(HANDLE_MIN_LENGTH, `Use at least ${HANDLE_MIN_LENGTH} characters`)
  .max(HANDLE_MAX_LENGTH, `Use at most ${HANDLE_MAX_LENGTH} characters`)
  .regex(/^[A-Za-z0-9_]+$/, 'Use letters, numbers and underscores only')
  .refine(
    (handle) => !(RESERVED_HANDLES as readonly string[]).includes(handle.toLowerCase()),
    'That handle is reserved',
  );

/** A player, or an admin who can also manage users and airspaces. */
export const USER_ROLES = ['player', 'admin'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const registerRequestSchema = z.object({
  email: emailSchema,
  handle: handleSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export type LoginRequest = z.input<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  handle: z.string(),
  /** The handle was made up for an account from before handles: ask them to choose one. */
  handleGenerated: z.boolean(),
  displayName: z.string(),
  role: userRoleSchema,
  /** They've opened the link emailed to their address. */
  emailVerified: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

/** Returned by register, login and refresh. The refresh token travels in an HttpOnly cookie. */
export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  accessTokenExpiresAt: z.iso.datetime(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const userSettingsResponseSchema = z.object({
  /** Complete, resolved user settings. */
  settings: z.record(z.string(), z.unknown()),
  updatedAt: z.iso.datetime().nullable(),
});

export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
