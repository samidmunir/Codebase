import { z } from 'zod';

// Site-wide switches (/api/site for everyone, /api/admin/site to change them).

const message = z.string().trim().max(300);

export const registrationSettingSchema = z.object({
  open: z.boolean(),
  /** Shown on the registration page while it's closed. */
  message: message.default(''),
});

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
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SiteSettingKey = keyof SiteSettings;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  registration: { open: true, message: '' },
  banner: { enabled: false, message: '', tone: 'info' },
  community: { readOnly: false, message: '' },
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
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Change at least one thing');
export type UpdateSiteSettingsRequest = z.input<typeof updateSiteSettingsRequestSchema>;

/** What everyone gets: what the site is doing now. */
export const siteStatusSchema = z.object({
  registrationOpen: z.boolean(),
  registrationMessage: z.string(),
  banner: z.object({ message: z.string(), tone: z.enum(['info', 'warning']) }).nullable(),
  communityReadOnly: z.boolean(),
  communityMessage: z.string(),
});
export type SiteStatus = z.infer<typeof siteStatusSchema>;

export const adminSiteSettingsSchema = z.object({
  settings: siteSettingsSchema,
  /** When each was last changed, and by whom. */
  changed: z.record(
    z.enum(['registration', 'banner', 'community']),
    z.object({ at: z.iso.datetime(), by: z.string().nullable() }).nullable(),
  ),
});
export type AdminSiteSettings = z.infer<typeof adminSiteSettingsSchema>;
