import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsSchema,
  type AdminSiteSettings,
  type SiteSettingKey,
  type SiteSettings,
  type SiteStatus,
} from '@vector/shared';
import type { Actor } from '../admin/admin-service';
import type { AuditRepository } from '../admin/audit-repository';
import type { Database } from '../platform/database';

/** Registering while it's closed. */
export class RegistrationClosedError extends Error {
  constructor(message: string) {
    super(message || 'New accounts aren’t being created right now. Check back soon.');
    this.name = 'RegistrationClosedError';
  }
}

const KEYS: SiteSettingKey[] = ['registration', 'banner', 'community'];

/** What changed between two values of a switch, for the log. */
function changes(before: object, after: object): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after))
    if (JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify(value))
      details[key] = value;
  return details;
}

/** The site's switches. A key that was never set is its default. */
export function siteSettingsRepository(db: Database, audit: AuditRepository) {
  async function rows() {
    const { rows: found } = await db.query<{
      key: SiteSettingKey;
      value: unknown;
      updated_at: Date;
      updated_by: string | null;
    }>(
      `SELECT s.key, s.value, s.updated_at, u.email AS updated_by
       FROM site_settings s LEFT JOIN users u ON u.id = s.updated_by`,
    );
    return found;
  }

  async function settings(): Promise<SiteSettings> {
    const stored = Object.fromEntries((await rows()).map((row) => [row.key, row.value]));
    // Anything unreadable falls back to its default rather than breaking the site.
    const merged = { ...DEFAULT_SITE_SETTINGS };
    for (const key of KEYS) {
      if (stored[key] === undefined) continue;
      const parsed = siteSettingsSchema.shape[key].safeParse(stored[key]);
      if (parsed.success) (merged as Record<string, unknown>)[key] = parsed.data;
    }
    return merged;
  }

  return {
    settings,

    async status(): Promise<SiteStatus> {
      const current = await settings();
      return {
        registrationOpen: current.registration.open,
        registrationMessage: current.registration.message,
        banner:
          current.banner.enabled && current.banner.message
            ? { message: current.banner.message, tone: current.banner.tone }
            : null,
        communityReadOnly: current.community.readOnly,
        communityMessage: current.community.message,
      };
    },

    async admin(): Promise<AdminSiteSettings> {
      const found = await rows();
      return {
        settings: await settings(),
        changed: Object.fromEntries(
          KEYS.map((key) => {
            const row = found.find((r) => r.key === key);
            return [key, row ? { at: row.updated_at.toISOString(), by: row.updated_by } : null];
          }),
        ) as AdminSiteSettings['changed'],
      };
    },

    /** Changes switches; each one that actually changed is logged. */
    async update(
      actor: Actor,
      update: { [K in SiteSettingKey]?: SiteSettings[K] | undefined },
    ): Promise<void> {
      const before = await settings();
      for (const key of KEYS) {
        const value = update[key];
        if (value === undefined) continue;
        const details = changes(before[key], value);
        if (Object.keys(details).length === 0) continue;
        await db.query(
          `INSERT INTO site_settings (key, value, updated_at, updated_by) VALUES ($1, $2, now(), $3)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now(), updated_by = $3`,
          [key, JSON.stringify(value), actor.id],
        );
        await audit.record(actor, 'site.update', key, details);
      }
    },
  };
}

export type SiteSettingsRepository = ReturnType<typeof siteSettingsRepository>;
