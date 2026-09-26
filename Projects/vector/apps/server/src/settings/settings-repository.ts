import { resolveSettings, SETTINGS_VERSION, type UserSettings } from '@vector/shared';
import type { Database } from '../platform/database';

export function settingsRepository(db: Database) {
  return {
    /** The user's settings, resolved against the current schema (defaults fill any gaps). */
    async get(userId: string): Promise<{ settings: UserSettings; updatedAt: Date | null }> {
      const { rows } = await db.query<{ settings: unknown; updated_at: Date }>(
        'SELECT settings, updated_at FROM user_settings WHERE user_id = $1',
        [userId],
      );
      const row = rows[0];
      return {
        settings: resolveSettings('user', row?.settings ?? {}).values,
        updatedAt: row?.updated_at ?? null,
      };
    },

    /** Saves a complete, valid set of settings. */
    async save(userId: string, settings: UserSettings): Promise<Date> {
      const { rows } = await db.query<{ updated_at: Date }>(
        `INSERT INTO user_settings (user_id, settings, settings_version, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings,
           settings_version = EXCLUDED.settings_version, updated_at = now()
         RETURNING updated_at`,
        [userId, JSON.stringify(settings), SETTINGS_VERSION],
      );
      return rows[0]!.updated_at;
    },
  };
}

export type SettingsRepository = ReturnType<typeof settingsRepository>;
