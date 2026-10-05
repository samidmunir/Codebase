import {
  RECORD_MINIMUMS,
  RECORDS_LIMIT,
  type RecordBoard,
  type RecordEntry,
  type RecordPeriod,
} from '@vector/shared';
import type { Database } from '../platform/database';

export interface BoardQuery {
  board: RecordBoard;
  period: RecordPeriod;
  airspace?: string | undefined;
  difficulty?: string | undefined;
}

const PERIOD_START: Record<RecordPeriod, string | undefined> = {
  all: undefined,
  // Calendar month and ISO week, in UTC.
  month: "date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
  week: "date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
};

const stat = (key: string) => `coalesce(sum((r.stats->>'${key}')::int), 0)`;
const flights = `(${stat('arrivals')} + ${stat('departures')} + ${stat('overflights')})`;
const losses = `(${stat('separationLosses')} + ${stat('nearMidAirs')})`;

/** Per pilot: the value ranked, sessions counted, and (for best session) the session. */
const PER_PILOT: Record<RecordBoard, { select: string; having?: string; order: 'DESC' | 'ASC' }> = {
  career: { select: 'sum(r.rp)::float AS value, count(*)::int AS sessions', order: 'DESC' },
  best: { select: '', order: 'DESC' },
  landings: {
    select: `${stat('arrivals')}::float AS value, count(*)::int AS sessions`,
    having: `${stat('arrivals')} > 0`,
    order: 'DESC',
  },
  safety: {
    select: `(${losses} * 100.0 / ${flights})::float AS value, count(*)::int AS sessions`,
    having: `${flights} >= ${RECORD_MINIMUMS.safetyFlights}`,
    order: 'ASC',
  },
  onTime: {
    select: `(${stat('onTime')} * 100.0 / nullif(${stat('timed')}, 0))::float AS value, count(*)::int AS sessions`,
    having: `${stat('timed')} >= ${RECORD_MINIMUMS.onTimeFlights}`,
    order: 'DESC',
  },
};

interface EntryRow {
  rank: string;
  handle: string;
  display_name: string;
  value: number;
  sessions: number;
  result_id: string | null;
  user_id: string;
}

const toEntry = (row: EntryRow): RecordEntry => ({
  rank: Number(row.rank),
  handle: row.handle,
  displayName: row.display_name,
  value: row.value,
  sessions: row.sessions,
  ...(row.result_id ? { resultId: row.result_id } : {}),
});

/** Leaderboards over verified results, ranked in the database. */
export function recordsRepository(db: Database) {
  return {
    /** The top of a board, and the viewer's own place on it if they have one. */
    async board(
      query: BoardQuery,
      viewerId: string | undefined,
      limit = RECORDS_LIMIT,
    ): Promise<{ entries: RecordEntry[]; you: RecordEntry | null }> {
      const params: unknown[] = [];
      const where = [
        "r.verification = 'verified'",
        'NOT r.hidden',
        'u.disabled_at IS NULL',
        'u.show_on_records',
      ];
      const start = PERIOD_START[query.period];
      if (start) where.push(`r.created_at >= ${start}`);
      if (query.airspace) {
        params.push(query.airspace);
        where.push(`r.airspace_id = $${params.length}`);
      }
      if (query.difficulty) {
        params.push(query.difficulty);
        where.push(`r.difficulty = $${params.length}`);
      }
      const spec = PER_PILOT[query.board];
      const perPilot =
        query.board === 'best'
          ? `SELECT DISTINCT ON (r.user_id) r.user_id, r.rp::float AS value, 1 AS sessions, r.id AS result_id
             FROM eligible r WHERE r.sim_time_sec >= ${RECORD_MINIMUMS.bestSessionSec}
             ORDER BY r.user_id, r.rp DESC, r.created_at`
          : `SELECT r.user_id, ${spec.select}, NULL::uuid AS result_id FROM eligible r
             GROUP BY r.user_id ${spec.having ? `HAVING ${spec.having}` : ''}`;
      params.push(limit);
      const limitParam = `$${params.length}`;
      params.push(viewerId ?? null);
      const viewerParam = `$${params.length}`;

      const { rows } = await db.query<EntryRow>(
        `WITH eligible AS (
           SELECT r.* FROM session_results r JOIN users u ON u.id = r.user_id
           WHERE ${where.join(' AND ')}
         ), per_pilot AS (${perPilot}),
         ranked AS (
           SELECT p.*, rank() OVER (ORDER BY p.value ${spec.order}) AS rank FROM per_pilot p
         )
         SELECT ranked.rank, ranked.value, ranked.sessions, ranked.result_id, ranked.user_id,
           u.handle, u.display_name
         FROM ranked JOIN users u ON u.id = ranked.user_id
         WHERE ranked.rank <= ${limitParam} OR ranked.user_id = ${viewerParam}
         ORDER BY ranked.rank, u.handle`,
        params,
      );
      const viewerRow = rows.find((row) => row.user_id === viewerId);
      return {
        entries: rows
          .filter((row) => Number(row.rank) <= limit)
          .slice(0, limit)
          .map(toEntry),
        you: viewerRow ? toEntry(viewerRow) : null,
      };
    },
  };
}

export type RecordsRepository = ReturnType<typeof recordsRepository>;
