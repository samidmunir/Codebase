import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { memoryMailer } from './email/mailer';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;

const app = buildApp({
  checkDatabase: async () => true,
  ...(db
    ? {
        accounts: {
          db,
          auth: {
            jwtSecret: 'integration-test-secret-long-enough-0123456789',
            accessTokenMinutes: 15,
            refreshTokenDays: 30,
          },
          secureCookies: false,
          signInRateLimit: 1_000,
          email: { mailer: memoryMailer() },
        },
      }
    : {}),
});

async function register(handle: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: handle,
    },
  });
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  return { id: body.user.id, headers: { authorization: `Bearer ${body.accessToken}` } };
}

const daysAgo = (days: number) => `now() - interval '${days} days'`;

/** A session result played some days ago. */
async function played(userId: string, days: number, airspace: string, verification: string) {
  await db!.query(
    `INSERT INTO session_results (user_id, session_key, airspace_id, difficulty, sim_time_sec,
       final_tick, rp, stats, report, verification, created_at, updated_at)
     VALUES ($1, gen_random_uuid()::text, $2, 'normal', 1800, 1800, 10, '{}', '{}', $3,
       ${daysAgo(days)}, ${daysAgo(days)})`,
    [userId, airspace, verification],
  );
}

describe.skipIf(!db)('admin stats (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE forum_threads CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('is for admins only', async () => {
    const pilot = await register('Ace');
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: pilot.headers,
    });
    expect(response.statusCode).toBe(403);
  });

  it('counts signups, pilots, sessions and outcomes into the right days', async () => {
    const chief = await register('Chief');
    await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [chief.id]);
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    // Ace joined 3 days ago, Bravo 40 days ago (outside 30 days; inside the period before).
    await db!.query(`UPDATE users SET created_at = ${daysAgo(3)} WHERE id = $1`, [ace.id]);
    await db!.query(`UPDATE users SET created_at = ${daysAgo(40)} WHERE id = $1`, [bravo.id]);
    await db!.query(`UPDATE auth_sessions SET created_at = ${daysAgo(3)} WHERE user_id = $1`, [
      ace.id,
    ]);
    await db!.query(`UPDATE auth_sessions SET created_at = ${daysAgo(40)} WHERE user_id = $1`, [
      bravo.id,
    ]);
    await played(ace.id, 3, 'new-york', 'verified');
    await played(ace.id, 3, 'new-york', 'mismatch');
    await played(ace.id, 1, 'chicago', 'verified');
    await played(bravo.id, 40, 'dallas', 'verified');

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/stats?range=30d',
      headers: chief.headers,
    });
    expect(response.statusCode).toBe(200);
    const stats = response.json();
    expect(stats.bucket).toBe('day');
    expect(stats.buckets).toHaveLength(30);
    const at = (key: string, days: number) => stats.series[key][29 - days];

    expect(at('signups', 3)).toBe(1);
    expect(at('signups', 0)).toBe(1); // Chief, today.
    expect(at('sessions', 3)).toBe(2);
    expect(at('simHours', 3)).toBe(1);
    expect(at('resultsVerified', 3)).toBe(1);
    expect(at('resultsFailed', 3)).toBe(1);
    expect(at('activePilots', 3)).toBe(1);
    expect(at('activePilots', 1)).toBe(1);
    // Ace counts once over the month, however many days he was on.
    expect(stats.totals.activePilots.current).toBe(2); // Ace, and Chief today.
    expect(stats.totals.sessions).toEqual({ current: 3, previous: 1 });
    expect(stats.totals.signups).toEqual({ current: 2, previous: 1 });
    expect(stats.airspaces).toEqual([
      { id: 'new-york', sessions: 2, simHours: 1 },
      { id: 'chicago', sessions: 1, simHours: 0.5 },
    ]);
    expect(stats.difficulties).toEqual([{ difficulty: 'normal', sessions: 3 }]);
    expect(stats.now).toMatchObject({ users: 3, verifiedUsers: 0, openReports: 0 });
    expect(stats.now.online).toBeGreaterThanOrEqual(1);

    const all = (
      await app.inject({ method: 'GET', url: '/api/admin/stats?range=all', headers: chief.headers })
    ).json();
    expect(all.totals.sessions).toEqual({ current: 4, previous: null });
    expect(all.buckets[0] <= stats.buckets[0]).toBe(true);

    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/admin/stats?range=forever',
          headers: chief.headers,
        })
      ).statusCode,
    ).toBe(400);
  });
});
