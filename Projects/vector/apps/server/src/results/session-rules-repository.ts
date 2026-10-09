import { defaultOfficial, type OfficialValues } from '@vector/shared';
import type { Database } from '../platform/database';

/** A version of the official settings, and when it applied. */
export interface RulesVersion {
  id: number;
  values: OfficialValues;
  from: Date;
  /** When it was replaced (null: it's the current one). */
  until: Date | null;
  createdBy: string | null;
}

/** The official settings' versions (admins add them; the defaults apply before any). */
export function sessionRulesRepository(db: Database) {
  return {
    /** Every version, oldest first; the defaults first (from the start). */
    async versions(): Promise<RulesVersion[]> {
      const { rows } = await db.query<{
        id: number;
        values: OfficialValues;
        created_at: Date;
        created_by: string | null;
      }>(
        `SELECT s.id, s."values", s.created_at, u.email AS created_by
           FROM session_rules_versions s LEFT JOIN users u ON u.id = s.created_by
          ORDER BY s.id`,
      );
      const versions: RulesVersion[] = [
        { id: 0, values: defaultOfficial(), from: new Date(0), until: null, createdBy: null },
        ...rows.map((row) => ({
          id: row.id,
          // Values saved before a setting was official get its default.
          values: { ...defaultOfficial(), ...row.values },
          from: row.created_at,
          until: null,
          createdBy: row.created_by,
        })),
      ];
      for (let i = 0; i < versions.length - 1; i += 1) versions[i]!.until = versions[i + 1]!.from;
      return versions;
    },

    async add(values: OfficialValues, actorId: string): Promise<void> {
      await db.query('INSERT INTO session_rules_versions ("values", created_by) VALUES ($1, $2)', [
        JSON.stringify(values),
        actorId,
      ]);
    },
  };
}

export type SessionRulesRepository = ReturnType<typeof sessionRulesRepository>;
