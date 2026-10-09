import { z } from 'zod';

// Site-wide switches (/api/site for everyone, /api/admin/site to change them).

const message = z.string().trim().max(300);

export const REGISTRATION_MODES = ['open', 'invite', 'closed'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const registrationSettingSchema = z.preprocess(
  // Saved before invite codes: { open: boolean }.
  (value) =>
    value && typeof value === 'object' && 'open' in value && !('mode' in value)
      ? { ...value, mode: (value as { open: unknown }).open ? 'open' : 'closed' }
      : value,
  z.object({
    /** Anyone can register, only with an invite code, or nobody (admins still can). */
    mode: z.enum(REGISTRATION_MODES),
    /** Shown on the registration page while it's invite-only or closed. */
    message: message.default(''),
  }),
);

/** The beta: a badge by the logo, and feedback from the menu. */
export const betaSettingSchema = z.object({ enabled: z.boolean() });

export const bannerSettingSchema = z.object({
  enabled: z.boolean(),
  message: message.default(''),
  tone: z.enum(['info', 'warning']).default('info'),
});

export const communitySettingSchema = z.object({
  /** Players can read but not post, reply, react or report; staff carry on. */
  readOnly: z.boolean(),
  message: message.default(''),
});

export const siteSettingsSchema = z.object({
  registration: registrationSettingSchema,
  banner: bannerSettingSchema,
  community: communitySettingSchema,
  beta: betaSettingSchema,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SiteSettingKey = keyof SiteSettings;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  registration: { mode: 'open', message: '' },
  banner: { enabled: false, message: '', tone: 'info' },
  community: { readOnly: false, message: '' },
  beta: { enabled: false },
};

/** Change one or more switches. */
export const updateSiteSettingsRequestSchema = z
  .object({
    registration: registrationSettingSchema,
    banner: bannerSettingSchema.refine((banner) => !banner.enabled || banner.message.length > 0, {
      message: 'Write the banner’s message',
      path: ['message'],
    }),
    community: communitySettingSchema,
    beta: betaSettingSchema,
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one thing');
export type UpdateSiteSettingsRequest = z.input<typeof updateSiteSettingsRequestSchema>;

/** What everyone gets: what the site is doing now. */
export const siteStatusSchema = z.object({
  registrationMode: z.enum(REGISTRATION_MODES),
  /** Whether the registration form shows (open, or with an invite). */
  registrationOpen: z.boolean(),
  registrationMessage: z.string(),
  banner: z.object({ message: z.string(), tone: z.enum(['info', 'warning']) }).nullable(),
  communityReadOnly: z.boolean(),
  communityMessage: z.string(),
  beta: z.boolean(),
  /** The version that's out now (e.g. "0.1"), from the releases. */
  version: z.string().nullable(),
});
export type SiteStatus = z.infer<typeof siteStatusSchema>;

export const adminSiteSettingsSchema = z.object({
  settings: siteSettingsSchema,
  /** When each was last changed, and by whom. */
  changed: z.record(
    z.enum(['registration', 'banner', 'community', 'beta']),
    z.object({ at: z.iso.datetime(), by: z.string().nullable() }).nullable(),
  ),
});
export type AdminSiteSettings = z.infer<typeof adminSiteSettingsSchema>;
