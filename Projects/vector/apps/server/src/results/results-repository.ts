import {
  emptySessionStats,
  type AdminResult,
  type CareerTotals,
  type ResultSummary,
  type SessionDifficulty,
  type SessionStats,
  type Verification,
} from '@vector/shared';
import type { Database } from '../platform/database';

export class ResultNotFoundError extends Error {
  constructor() {
    super('That session result doesn’t exist');
    this.name = 'ResultNotFoundError';
  }
}

export interface ResultRecord {
  sessionKey: string;
  airspaceId: string;
  difficulty: SessionDifficulty | null;
  simTimeSec: number;
  finalTick: number;
  rp: number;
  stats: SessionStats;
  report: unknown;
  replay: unknown;
  engineVersion: string | null;
  verification: Verification;
  /** SHA-256 of the final state's fingerprint, as uploaded. */
  stateFingerprint: string | null;
}

/** A result waiting to be verified, with what replaying it needs. */
export interface PendingResult {
  id: string;
  airspaceId: string;
  finalTick: number;
  replay: unknown;
  engineVersion: string | null;
  stateFingerprint: string | null;
}

interface SummaryRow {
  id: string;
  airspace_id: string;
  difficulty: SessionDifficulty | null;
  sim_time_sec: number;
  rp: number;
  stats: SessionStats;
  verification: Verification;
  created_at: Date;
  updated_at: Date;
}

const SUMMARY_COLUMNS =
  'r.id, r.airspace_id, r.difficulty, r.sim_time_sec, r.rp, r.stats, r.verification, r.created_at, r.updated_at';

const toSummary = (row: SummaryRow): ResultSummary => ({
  id: row.id,
  airspaceId: row.airspace_id,
  difficulty: row.difficulty,
  simTimeSec: row.sim_time_sec,
  rp: row.rp,
  stats: { ...emptySessionStats(), ...row.stats },
  verification: row.verification,
  playedAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const STAT_KEYS = Object.keys(emptySessionStats()) as (keyof SessionStats)[];

/** Sums of every stat, sessions, sim time and RP, over the rows of a query. */
const TOTALS_SELECT = `count(*)::int AS sessions,
  coalesce(sum(r.sim_time_sec), 0)::float AS sim_time_sec,
  coalesce(sum(r.rp), 0)::float AS rp,
  ${STAT_KEYS.map((key) => `coalesce(sum((r.stats->>'${key}')::int), 0)::int AS "${key}"`).join(',\n  ')}`;

type TotalsRow = { sessions: number; sim_time_sec: number; rp: number } & Record<
  keyof SessionStats,
  number
>;

const toTotals = (row: TotalsRow): CareerTotals => ({
  sessions: row.sessions,
  simTimeSec: row.sim_time_sec,
  rp: row.rp,
  stats: Object.fromEntries(STAT_KEYS.map((key) => [key, row[key]])) as SessionStats,
});

/** Results that count: not hidden by an admin. */
const VISIBLE = 'NOT r.hidden';

export function resultsRepository(db: Database) {
  return {
    /**
     * Records a session's result, or updates it with a later snapshot of the same
     * session. An older snapshot (fewer ticks) never replaces a newer one.
     */
    async upsert(userId: string, record: ResultRecord): Promise<ResultSummary> {
      const { rows } = await db.query<SummaryRow>(
        `INSERT INTO session_results AS r
           (user_id, session_key, airspace_id, difficulty, sim_time_sec, final_tick, rp, stats,
            report, replay, engine_version, verification, state_fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (user_id, session_key) DO UPDATE SET
           difficulty = excluded.difficulty, sim_time_sec = excluded.sim_time_sec,
           final_tick = excluded.final_tick, rp = excluded.rp, stats = excluded.stats,
           report = excluded.report, replay = excluded.replay,
           engine_version = excluded.engine_version, verification = excluded.verification,
           state_fingerprint = excluded.state_fingerprint, verified_at = NULL,
           verification_note = NULL, updated_at = now()
         WHERE r.final_tick <= excluded.final_tick
         RETURNING ${SUMMARY_COLUMNS}`,
        [
          userId,
          record.sessionKey,
          record.airspaceId,
          record.difficulty,
          record.simTimeSec,
          record.finalTick,
          record.rp,
          JSON.stringify(record.stats),
          JSON.stringify(record.report),
          record.replay === undefined || record.replay === null
            ? null
            : JSON.stringify(record.replay),
          record.engineVersion,
          record.verification,
          record.stateFingerprint,
        ],
      );
      if (rows[0]) return toSummary(rows[0]);
      // A newer snapshot was already recorded: keep it.
      const existing = await db.query<SummaryRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM session_results r WHERE r.user_id = $1 AND r.session_key = $2`,
        [userId, record.sessionKey],
      );
      return toSummary(existing.rows[0]!);
    },

    /** The pending result updated longest ago, if its session has been quiet for `settleSec`. */
    async nextPending(settleSec: number): Promise<PendingResult | undefined> {
      const { rows } = await db.query<{
        id: string;
        airspace_id: string;
        final_tick: number;
        replay: unknown;
        engine_version: string | null;
        state_fingerprint: string | null;
      }>(
        `SELECT id, airspace_id, final_tick, replay, engine_version, state_fingerprint
         FROM session_results
         WHERE verification = 'pending' AND updated_at <= now() - make_interval(secs => $1)
         ORDER BY updated_at LIMIT 1`,
        [settleSec],
      );
      const row = rows[0];
      return row
        ? {
            id: row.id,
            airspaceId: row.airspace_id,
            finalTick: row.final_tick,
            replay: row.replay,
            engineVersion: row.engine_version,
            stateFingerprint: row.state_fingerprint,
          }
        : undefined;
    },

    /**
     * Records a verification outcome, unless the result changed while it was being
     * checked (a newer snapshot came in): then it stays pending for another go.
     */
    async settle(
      id: string,
      finalTick: number,
      verification: Exclude<Verification, 'pending'>,
      note: string | null,
    ): Promise<boolean> {
      const { rowCount } = await db.query(
        `UPDATE session_results SET verification = $3, verification_note = $4, verified_at = now()
         WHERE id = $1 AND final_tick = $2 AND verification = 'pending'`,
        [id, finalTick, verification, note],
      );
      return rowCount === 1;
    },

    /** Puts a result back in the queue (an admin asked for it to be checked again). */
    async requeue(id: string): Promise<boolean> {
      const { rowCount } = await db.query(
        `UPDATE session_results SET verification = 'pending', verification_note = NULL,
           verified_at = NULL, updated_at = now() - interval '1 day'
         WHERE id = $1 AND replay IS NOT NULL`,
        [id],
      );
      return rowCount === 1;
    },

    // ---- Administration (any pilot's results) ------------------------------------

    async adminList(query: {
      verification?: Verification | undefined;
      hidden?: boolean | undefined;
      handle?: string | undefined;
      offset: number;
      limit: number;
    }): Promise<{ results: AdminResult[]; total: number }> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (query.verification) {
        params.push(query.verification);
        where.push(`r.verification = $${params.length}`);
      }
      if (query.hidden !== undefined) {
        params.push(query.hidden);
        where.push(`r.hidden = $${params.length}`);
      }
      if (query.handle) {
        params.push(query.handle);
        where.push(`u.handle = $${params.length}`);
      }
      const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const from = `FROM session_results r JOIN users u ON u.id = r.user_id ${clause}`;
      const [{ rows }, count] = await Promise.all([
        db.query<
          SummaryRow & { handle: string; hidden: boolean; verification_note: string | null }
        >(
          `SELECT ${SUMMARY_COLUMNS}, u.handle, r.hidden, r.verification_note ${from}
           ORDER BY r.updated_at DESC, r.id
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, query.limit, query.offset],
        ),
        db.query<{ total: number }>(`SELECT count(*)::int AS total ${from}`, params),
      ]);
      return {
        results: rows.map((row) => {
          const summary = toSummary(row);
          return {
            id: summary.id,
            handle: row.handle,
            airspaceId: summary.airspaceId,
            difficulty: summary.difficulty,
            simTimeSec: summary.simTimeSec,
            rp: summary.rp,
            verification: summary.verification,
            verificationNote: row.verification_note,
            hidden: row.hidden,
            playedAt: summary.playedAt,
            updatedAt: summary.updatedAt,
          };
        }),
        total: count.rows[0]!.total,
      };
    },

    /** Hides a result from profiles and records, or shows it again. Returns its pilot's handle. */
    async setHidden(id: string, hidden: boolean): Promise<string> {
      const { rows } = await db.query<{ handle: string }>(
        `UPDATE session_results r SET hidden = $2 FROM users u
         WHERE r.id = $1 AND u.id = r.user_id RETURNING u.handle`,
        [id, hidden],
      );
      if (!rows[0]) throw new ResultNotFoundError();
      return rows[0].handle;
    },

    /** A result's pilot's handle (any result, hidden or not). */
    async handleOf(id: string): Promise<string> {
      const { rows } = await db.query<{ handle: string }>(
        'SELECT u.handle FROM session_results r JOIN users u ON u.id = r.user_id WHERE r.id = $1',
        [id],
      );
      if (!rows[0]) throw new ResultNotFoundError();
      return rows[0].handle;
    },

    /** A result, its report, and whose it is. */
    async get(id: string): Promise<
      | {
          summary: ResultSummary;
          report: unknown;
          userId: string;
          handle: string;
          displayName: string;
          profilePublic: boolean;
        }
      | undefined
    > {
      const { rows } = await db.query<
        SummaryRow & {
          report: unknown;
          user_id: string;
          handle: string;
          display_name: string;
          profile_public: boolean;
        }
      >(
        `SELECT ${SUMMARY_COLUMNS}, r.report, r.user_id, u.handle, u.display_name, u.profile_public
         FROM session_results r JOIN users u ON u.id = r.user_id
         WHERE r.id = $1 AND ${VISIBLE}`,
        [id],
      );
      const row = rows[0];
      return row
        ? {
            summary: toSummary(row),
            report: row.report,
            userId: row.user_id,
            handle: row.handle,
            displayName: row.display_name,
            profilePublic: row.profile_public,
          }
        : undefined;
    },

    /** A user's results, newest first. */
    async page(
      userId: string,
      offset: number,
      limit: number,
    ): Promise<{ results: ResultSummary[]; total: number }> {
      const [{ rows }, count] = await Promise.all([
        db.query<SummaryRow>(
          `SELECT ${SUMMARY_COLUMNS} FROM session_results r
           WHERE r.user_id = $1 AND ${VISIBLE}
           ORDER BY r.created_at DESC, r.id LIMIT $2 OFFSET $3`,
          [userId, limit, offset],
        ),
        db.query<{ total: number }>(
          `SELECT count(*)::int AS total FROM session_results r WHERE r.user_id = $1 AND ${VISIBLE}`,
          [userId],
        ),
      ]);
      return { results: rows.map(toSummary), total: count.rows[0]!.total };
    },

    /** Career totals over all of a user's results. */
    async careerTotals(userId: string): Promise<CareerTotals> {
      const { rows } = await db.query<TotalsRow>(
        `SELECT ${TOTALS_SELECT} FROM session_results r WHERE r.user_id = $1 AND ${VISIBLE}`,
        [userId],
      );
      return toTotals(rows[0]!);
    },

    /** Career totals per airspace, with the best session in each. */
    async byAirspace(
      userId: string,
    ): Promise<(CareerTotals & { airspaceId: string; bestRp: number })[]> {
      const { rows } = await db.query<TotalsRow & { airspace_id: string; best_rp: number }>(
        `SELECT r.airspace_id, max(r.rp)::float AS best_rp, ${TOTALS_SELECT}
         FROM session_results r WHERE r.user_id = $1 AND ${VISIBLE}
         GROUP BY r.airspace_id ORDER BY sessions DESC, r.airspace_id`,
        [userId],
      );
      return rows.map((row) => ({
        ...toTotals(row),
        airspaceId: row.airspace_id,
        bestRp: row.best_rp,
      }));
    },

    /** Career RP after each session, oldest first (the latest `limit` sessions). */
    async history(userId: string, limit = 500): Promise<{ at: string; rp: number }[]> {
      const { rows } = await db.query<{ created_at: Date; career_rp: number }>(
        `SELECT created_at, career_rp FROM (
           SELECT r.created_at,
             sum(r.rp) OVER (ORDER BY r.created_at, r.id)::float AS career_rp
           FROM session_results r WHERE r.user_id = $1 AND ${VISIBLE}
         ) cumulative ORDER BY created_at DESC LIMIT $2`,
        [userId, limit],
      );
      return rows.reverse().map((row) => ({ at: row.created_at.toISOString(), rp: row.career_rp }));
    },
  };
}

export type ResultsRepository = ReturnType<typeof resultsRepository>;
