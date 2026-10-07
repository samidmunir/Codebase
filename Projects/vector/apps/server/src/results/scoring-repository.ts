import { defaultScoring, type ScoringValues } from '@vector/shared';
import type { Database } from '../platform/database';

/** A version of the official scoring, and when it applied. */
export interface ScoringVersion {
  id: number;
  values: ScoringValues;
  from: Date;
  /** When it was replaced (null: it's the current one). */
  until: Date | null;
  createdBy: string | null;
}

/** The official scoring's versions (admins add them; the defaults apply before any). */
export function scoringRepository(db: Database) {
  return {
    /** Every version, oldest first; the defaults first (from the start) when nothing replaced them. */
    async versions(): Promise<ScoringVersion[]> {
      const { rows } = await db.query<{
        id: number;
        values: ScoringValues;
        created_at: Date;
        created_by: string | null;
      }>(
        `SELECT s.id, s."values", s.created_at, u.email AS created_by
           FROM scoring_versions s LEFT JOIN users u ON u.id = s.created_by
          ORDER BY s.id`,
      );
      const versions: ScoringVersion[] = [
        { id: 0, values: defaultScoring(), from: new Date(0), until: null, createdBy: null },
        ...rows.map((row) => ({
          id: row.id,
          // Values saved before a scoring setting existed get its default.
          values: { ...defaultScoring(), ...row.values },
          from: row.created_at,
          until: null,
          createdBy: row.created_by,
        })),
      ];
      for (let i = 0; i < versions.length - 1; i += 1) versions[i]!.until = versions[i + 1]!.from;
      return versions;
    },

    async add(values: ScoringValues, actorId: string): Promise<void> {
      await db.query('INSERT INTO scoring_versions ("values", created_by) VALUES ($1, $2)', [
        JSON.stringify(values),
        actorId,
      ]);
    },
  };
}

export type ScoringRepository = ReturnType<typeof scoringRepository>;
