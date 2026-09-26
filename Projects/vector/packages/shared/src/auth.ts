import { z } from 'zod';

// Account API contracts, shared by the server and client.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const email = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH);

export const registerRequestSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1, 'Enter a display name').max(40),
});

export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export type LoginRequest = z.input<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
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
