import { z } from 'zod';
import { emailSchema, passwordSchema } from './auth';

// Emailed links (/api/auth/...): verifying an address, resetting a password and
// changing the email, shared by the server and client.

/** How long each kind of link works. */
export const EMAIL_LINK_HOURS = { verify: 24, reset: 1, change: 24, revert: 24 * 7 } as const;

/** A link's token: 256 random bits, base64url. */
export const emailTokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{43}$/, 'This link is incomplete. Copy the whole link from the email.');

export const tokenRequestSchema = z.object({ token: emailTokenSchema });
export type TokenRequest = z.input<typeof tokenRequestSchema>;

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.input<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: emailTokenSchema,
  password: passwordSchema,
});
export type ResetPasswordRequest = z.input<typeof resetPasswordRequestSchema>;

/** Change the account's email: a link goes to the new address, and it changes when that's opened. */
export const changeEmailRequestSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
});
export type ChangeEmailRequest = z.input<typeof changeEmailRequestSchema>;
