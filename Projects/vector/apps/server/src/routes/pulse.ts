import { PULSE_MINIMUMS, type Pulse, type PulseTotals } from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../platform/database';
import type { RecordsRepository } from '../records/records-repository';

/** The numbers change slowly; work them out at most this often. */
const CACHE_MS = 5 * 60_000;

/** Since Monday 00:00 UTC, as the records' "this week". */
const WEEK_START = "date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'";

/** "This week on Vector": real numbers from the sessions that count, and the top pilots. */
export async function pulseRoutes(
  app: FastifyInstance,
  options: {
    db: Database;
    records: RecordsRepository;
    minimums?: typeof PULSE_MINIMUMS;
    cacheMs?: number;
  },
) {
  const minimums = options.minimums ?? PULSE_MINIMUMS;
  const cacheMs = options.cacheMs ?? CACHE_MS;
  let cached: { at: number; pulse: Promise<Pulse> } | undefined;

  const totals = async (period: 'week' | 'all'): Promise<PulseTotals> => {
    const { rows } = await options.db.query<Omit<PulseTotals, 'period'>>(
      `SELECT coalesce(sum((r.stats->>'arrivals')::int), 0)::int AS landed,
              count(*)::int AS sessions,
              count(DISTINCT r.user_id)::int AS pilots,
              floor(coalesce(sum(r.sim_time_sec), 0) / 3600)::int AS hours
         FROM session_results r JOIN users u ON u.id = r.user_id
        WHERE NOT r.hidden AND r.ranked IS NOT FALSE AND r.verification <> 'mismatch'
          AND u.disabled_at IS NULL
          ${period === 'week' ? `AND r.created_at >= ${WEEK_START}` : ''}`,
    );
    return { period, ...rows[0]! };
  };
  const enough = (found: PulseTotals) =>
    found.sessions >= minimums.sessions && found.landed >= minimums.landed;

  const work = async (): Promise<Pulse> => {
    const week = await totals('week');
    const shown = enough(week)
      ? week
      : await totals('all').then((all) => (enough(all) ? all : null));
    let top: Pulse['top'] = null;
    for (const period of ['week', 'all'] as const) {
      const { entries } = await options.records.board(
        { board: 'career', period },
        undefined,
        minimums.topPilots,
      );
      if (entries.length >= minimums.topPilots) {
        top = { period, pilots: entries };
        break;
      }
    }
    return { totals: shown, top };
  };

  app.get('/pulse', async (): Promise<Pulse> => {
    if (!cached || Date.now() - cached.at >= cacheMs) {
      cached = { at: Date.now(), pulse: work() };
      // A failure isn't kept.
      cached.pulse.catch(() => (cached = undefined));
    }
    return cached.pulse;
  });
}
