import type { AdminStats, StatsRange, StatsSeriesKey, StatsTotalKey } from '@vector/shared';
import type { Database } from '../platform/database';

// The admin dashboard's numbers, counted from the tables Vector already keeps
// (docs/AdminV3.md lists where each comes from). Buckets are UTC days, or ISO
// weeks (starting Monday) for a year or more.

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<Exclude<StatsRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 364,
};
/** Up to this many days are shown day by day; longer, week by week. */
const DAILY_UP_TO_DAYS = 90;

type Bucket = 'day' | 'week';

const startOfDay = (time: number) => Math.floor(time / DAY_MS) * DAY_MS;
/** Monday 00:00 UTC of the week containing a time. */
const startOfWeek = (time: number) => {
  const day = startOfDay(time);
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
  return day - weekday * DAY_MS;
};
const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export interface Period {
  bucket: Bucket;
  from: Date;
  /** The end (exclusive): now. */
  to: Date;
  /** Bucket starts, oldest first. */
  starts: string[];
  /** The same length just before `from`, or none for "all time". */
  previous: { from: Date; to: Date } | undefined;
}

/** The buckets for a range, ending with the one now is in. */
export function periodFor(range: StatsRange, now: Date, firstActivity: Date | undefined): Period {
  // All time: every calendar day from the first account's to today.
  const days =
    range === 'all'
      ? (startOfDay(now.getTime()) - startOfDay((firstActivity ?? now).getTime())) / DAY_MS + 1
      : RANGE_DAYS[range];
  const bucket: Bucket = days <= DAILY_UP_TO_DAYS ? 'day' : 'week';
  const step = bucket === 'day' ? DAY_MS : 7 * DAY_MS;
  const last = bucket === 'day' ? startOfDay(now.getTime()) : startOfWeek(now.getTime());
  const count = bucket === 'day' ? days : Math.ceil(days / 7);
  const first = last - (count - 1) * step;
  const starts = Array.from({ length: count }, (_, i) => isoDate(first + i * step));
  const from = new Date(first);
  const length = now.getTime() - from.getTime();
  return {
    bucket,
    from,
    to: now,
    starts,
    previous: range === 'all' ? undefined : { from: new Date(from.getTime() - length), to: from },
  };
}

/**
 * Each chart: rows of (time, value) to sum, or (time, user) to count distinct
 * pilots, between $1 and $2.
 */
const SERIES: Record<StatsSeriesKey, { sql: string; distinct?: boolean }> = {
  signups: { sql: 'SELECT created_at AS at, 1 AS value FROM users' },
  verifiedEmails: {
    sql: 'SELECT email_verified_at AS at, 1 AS value FROM users WHERE email_verified_at IS NOT NULL',
  },
  activePilots: {
    sql: `SELECT created_at AS at, user_id AS value FROM auth_sessions
          UNION ALL SELECT created_at, user_id FROM session_results`,
    distinct: true,
  },
  sessions: { sql: 'SELECT created_at AS at, 1 AS value FROM session_results' },
  simHours: { sql: 'SELECT created_at AS at, sim_time_sec / 3600.0 AS value FROM session_results' },
  resultsVerified: {
    sql: "SELECT created_at AS at, 1 AS value FROM session_results WHERE verification = 'verified'",
  },
  resultsFailed: {
    sql: `SELECT created_at AS at, 1 AS value FROM session_results
          WHERE verification IN ('mismatch', 'unverifiable')`,
  },
  threads: { sql: 'SELECT created_at AS at, 1 AS value FROM forum_threads' },
  posts: { sql: 'SELECT created_at AS at, 1 AS value FROM forum_posts' },
  reports: { sql: 'SELECT created_at AS at, 1 AS value FROM forum_reports' },
};

const round = (value: number) => Math.round(value * 100) / 100;

export function statsRepository(db: Database) {
  /** One chart's numbers per bucket. */
  async function series(key: StatsSeriesKey, period: Period): Promise<number[]> {
    const { sql, distinct } = SERIES[key];
    const { rows } = await db.query<{ bucket: string; value: number }>(
      `SELECT to_char(date_trunc($3, at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS bucket,
              ${distinct ? 'count(DISTINCT value)' : 'sum(value)'}::float AS value
       FROM (${sql}) source
       WHERE at >= $1 AND at < $2
       GROUP BY 1`,
      [period.from, period.to, period.bucket],
    );
    const byBucket = new Map(rows.map((row) => [row.bucket, row.value]));
    return period.starts.map((start) => round(byBucket.get(start) ?? 0));
  }

  /** A headline number over a whole period (pilots counted once). */
  async function total(key: StatsTotalKey, from: Date, to: Date): Promise<number> {
    const { sql, distinct } = SERIES[key];
    const { rows } = await db.query<{ value: number | null }>(
      `SELECT ${distinct ? 'count(DISTINCT value)' : 'sum(value)'}::float AS value
       FROM (${sql}) source WHERE at >= $1 AND at < $2`,
      [from, to],
    );
    return round(rows[0]?.value ?? 0);
  }

  return {
    async stats(range: StatsRange, now = new Date()): Promise<AdminStats> {
      const { rows: first } = await db.query<{ at: Date | null }>(
        'SELECT min(created_at) AS at FROM users',
      );
      const period = periodFor(range, now, first[0]?.at ?? undefined);

      const keys = Object.keys(SERIES) as StatsSeriesKey[];
      const values = await Promise.all(keys.map((key) => series(key, period)));
      const totalsKeys: StatsTotalKey[] = [
        'signups',
        'activePilots',
        'sessions',
        'simHours',
        'posts',
      ];
      const totals = await Promise.all(
        totalsKeys.map(async (key) => ({
          key,
          current: await total(key, period.from, period.to),
          previous: period.previous
            ? await total(key, period.previous.from, period.previous.to)
            : null,
        })),
      );

      const [airspaces, difficulties, live] = await Promise.all([
        db.query<{ id: string; sessions: number; sim_hours: number }>(
          `SELECT airspace_id AS id, count(*)::int AS sessions,
                  coalesce(sum(sim_time_sec), 0)::float / 3600 AS sim_hours
           FROM session_results WHERE created_at >= $1 AND created_at < $2
           GROUP BY airspace_id ORDER BY sessions DESC`,
          [period.from, period.to],
        ),
        db.query<{ difficulty: string | null; sessions: number }>(
          `SELECT difficulty, count(*)::int AS sessions
           FROM session_results WHERE created_at >= $1 AND created_at < $2
           GROUP BY difficulty ORDER BY sessions DESC`,
          [period.from, period.to],
        ),
        db.query<{
          online: number;
          open_reports: number;
          pending: number;
          users: number;
          verified: number;
        }>(
          `SELECT
             (SELECT count(DISTINCT user_id)::int FROM auth_sessions
                WHERE last_used_at > now() - interval '15 minutes'
                  AND revoked_at IS NULL AND expires_at > now()) AS online,
             (SELECT count(*)::int FROM forum_reports WHERE resolved_at IS NULL) AS open_reports,
             (SELECT count(*)::int FROM session_results WHERE verification = 'pending') AS pending,
             (SELECT count(*)::int FROM users) AS users,
             (SELECT count(*)::int FROM users WHERE email_verified_at IS NOT NULL) AS verified`,
        ),
      ]);
      const now15 = live.rows[0]!;

      return {
        range,
        bucket: period.bucket,
        buckets: period.starts,
        series: Object.fromEntries(keys.map((key, i) => [key, values[i]!])) as AdminStats['series'],
        totals: Object.fromEntries(
          totals.map(({ key, current, previous }) => [key, { current, previous }]),
        ) as AdminStats['totals'],
        airspaces: airspaces.rows.map((row) => ({
          id: row.id,
          sessions: row.sessions,
          simHours: round(row.sim_hours),
        })),
        difficulties: difficulties.rows.map((row) => ({
          difficulty: row.difficulty as AdminStats['difficulties'][number]['difficulty'],
          sessions: row.sessions,
        })),
        now: {
          online: now15.online,
          openReports: now15.open_reports,
          pendingResults: now15.pending,
          users: now15.users,
          verifiedUsers: now15.verified,
        },
        generatedAt: now.toISOString(),
      };
    },
  };
}

export type StatsRepository = ReturnType<typeof statsRepository>;
