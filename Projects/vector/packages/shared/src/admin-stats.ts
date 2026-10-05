import { z } from 'zod';
import { sessionDifficultySchema } from './sessions';

// The admin dashboard (/api/admin/stats): trends over a period, the same period
// before it for comparison, and what's happening now.

export const STATS_RANGES = ['7d', '30d', '90d', '1y', 'all'] as const;
export const statsRangeSchema = z.enum(STATS_RANGES);
export type StatsRange = z.infer<typeof statsRangeSchema>;

export const statsQuerySchema = z.object({ range: statsRangeSchema.default('30d') });

/** Each chart's numbers, one per bucket, in the order of `buckets`. */
export const STATS_SERIES = [
  'signups',
  'verifiedEmails',
  'activePilots',
  'sessions',
  'simHours',
  'resultsVerified',
  'resultsFailed',
  'threads',
  'posts',
  'reports',
] as const;
export type StatsSeriesKey = (typeof STATS_SERIES)[number];

/** Headline numbers: this period and the one before it. */
export const STATS_TOTALS = ['signups', 'activePilots', 'sessions', 'simHours', 'posts'] as const;
export type StatsTotalKey = (typeof STATS_TOTALS)[number];

const count = z.number().min(0);

export const adminStatsSchema = z.object({
  range: statsRangeSchema,
  /** 'day' up to 90 days, 'week' beyond. */
  bucket: z.enum(['day', 'week']),
  /** The start of each bucket (UTC dates, YYYY-MM-DD). */
  buckets: z.array(z.string()),
  series: z.record(z.enum(STATS_SERIES), z.array(count)),
  totals: z.record(z.enum(STATS_TOTALS), z.object({ current: count, previous: count.nullable() })),
  airspaces: z.array(z.object({ id: z.string(), sessions: count, simHours: count })),
  difficulties: z.array(
    z.object({ difficulty: sessionDifficultySchema.nullable(), sessions: count }),
  ),
  now: z.object({
    /** Pilots with a sign-in used in the last 15 minutes. */
    online: count,
    openReports: count,
    pendingResults: count,
    /** Accounts, and how many have verified their email. */
    users: count,
    verifiedUsers: count,
  }),
  generatedAt: z.iso.datetime(),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;
