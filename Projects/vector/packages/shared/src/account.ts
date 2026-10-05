import { z } from 'zod';
import { displayNameSchema, handleSchema, passwordSchema } from './auth';

// Self-service account API (/api/account), shared by the server and client.

/** Change your handle, display name or profile privacy. */
export const updateProfileRequestSchema = z
  .object({
    handle: handleSchema,
    displayName: displayNameSchema,
    profilePublic: z.boolean(),
    showOnRecords: z.boolean(),
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one thing');
export type UpdateProfileRequest = z.input<typeof updateProfileRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.input<typeof changePasswordRequestSchema>;

/** Deleting your account needs your password, and your handle typed to confirm. */
export const deleteAccountRequestSchema = z.object({
  password: z.string().min(1, 'Enter your password').max(128),
  confirmHandle: z.string().trim().min(1),
});
export type DeleteAccountRequest = z.input<typeof deleteAccountRequestSchema>;

export const accountSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  emailVerified: z.boolean(),
  /** An email change waiting for its link to be opened. */
  pendingEmail: z.string().nullable(),
  handle: z.string(),
  handleGenerated: z.boolean(),
  displayName: z.string(),
  /** Others can see your profile and results (you always can). */
  profilePublic: z.boolean(),
  /** Your verified results count on the leaderboards. */
  showOnRecords: z.boolean(),
  /** When the handle can next be changed (null: now). */
  handleChangeableAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** Devices signed in, this one included. */
  activeSignIns: z.number().int().min(0),
});
export type Account = z.infer<typeof accountSchema>;

export const handleAvailabilitySchema = z.object({
  handle: z.string(),
  available: z.boolean(),
  /** Why not, when it isn't. */
  reason: z.string().optional(),
});
export type HandleAvailability = z.infer<typeof handleAvailabilitySchema>;
