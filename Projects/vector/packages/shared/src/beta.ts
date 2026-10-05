import { z } from 'zod';
import { emailSchema } from './auth';

// The beta: invite codes and the waitlist (admins), feedback (testers).

// ---- Invite codes ------------------------------------------------------------------

export const inviteCodeSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  note: z.string(),
  maxUses: z.number().int().min(1),
  uses: z.number().int().min(0),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime(),
  /** Who's used it, newest first. */
  usedBy: z.array(z.object({ id: z.uuid(), handle: z.string(), at: z.iso.datetime() })),
});
export type InviteCode = z.infer<typeof inviteCodeSchema>;

export const inviteCodeListSchema = z.object({ codes: z.array(inviteCodeSchema) });
export type InviteCodeList = z.infer<typeof inviteCodeListSchema>;

export const newInviteCodeRequestSchema = z.object({
  note: z.string().trim().max(200).default(''),
  maxUses: z.coerce.number().int().min(1).max(10_000).default(1),
  /** Stops working after this many days (none: never). */
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  /** Your own code, e.g. VECTOR-DISCORD; otherwise one is made up. */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{6,40}$/, 'Letters, numbers and dashes, 6 to 40 of them')
    .optional(),
});
export type NewInviteCodeRequest = z.input<typeof newInviteCodeRequestSchema>;

/** Whether a code works now (shown on the registration page as it's typed). */
export const inviteCheckSchema = z.object({ valid: z.boolean(), reason: z.string().optional() });
export type InviteCheck = z.infer<typeof inviteCheckSchema>;

// ---- Waitlist ------------------------------------------------------------------------

export const waitlistRequestSchema = z.object({
  email: emailSchema,
  note: z.string().trim().max(500).default(''),
});
export type WaitlistRequest = z.input<typeof waitlistRequestSchema>;

export const waitlistEntrySchema = z.object({
  id: z.uuid(),
  email: z.string(),
  note: z.string(),
  createdAt: z.iso.datetime(),
  invitedAt: z.iso.datetime().nullable(),
  /** They've since created an account. */
  joined: z.boolean(),
});
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;

export const waitlistSchema = z.object({
  entries: z.array(waitlistEntrySchema),
  total: z.number().int().min(0),
});
export type Waitlist = z.infer<typeof waitlistSchema>;

// ---- Feedback ------------------------------------------------------------------------

export const FEEDBACK_KINDS = ['bug', 'idea', 'other'] as const;
export const FEEDBACK_STATUSES = ['new', 'read', 'done'] as const;

export const feedbackRequestSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(3, 'Tell us a little more').max(4000),
  /** Where they were (filled in by the app). */
  page: z.string().max(300).default(''),
});
export type FeedbackRequest = z.input<typeof feedbackRequestSchema>;

export const feedbackItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string(),
  page: z.string(),
  device: z.string(),
  status: z.enum(FEEDBACK_STATUSES),
  createdAt: z.iso.datetime(),
  from: z.object({ id: z.uuid(), handle: z.string(), email: z.string() }).nullable(),
});
export type FeedbackItem = z.infer<typeof feedbackItemSchema>;

export const feedbackListSchema = z.object({
  items: z.array(feedbackItemSchema),
  counts: z.record(z.enum(FEEDBACK_STATUSES), z.number().int().min(0)),
});
export type FeedbackList = z.infer<typeof feedbackListSchema>;

export const feedbackUpdateSchema = z.object({ status: z.enum(FEEDBACK_STATUSES) });
