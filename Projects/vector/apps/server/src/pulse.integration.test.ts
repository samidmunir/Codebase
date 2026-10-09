import { applyDifficulty, defaultSettings } from '@vector/shared';
import { parsePerformanceCatalog, SimEngine } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL), with low minimums and no cache.
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
          pulse: { minimums: { sessions: 2, landed: 3, topPilots: 2 }, cacheMs: 0 },
        },
      }
    : {}),
});

const performance = parsePerformanceCatalog(performanceData);

/** A two-minute Normal session that landed `landed` aircraft for 100 RP each. */
function session(sessionId: string, landed: number) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 3,
    startTimeUtc: '2026-10-04T14:00:00Z',
    sessionId,
    settings: applyDifficulty(defaultSettings('session'), 'normal'),
  });
  for (let i = 0; i < 120; i++) engine.step();
  const data = engine.toSnapshot();
  data.state.score.total = landed * 100;
  data.state.score.tally = { landing: { count: landed, rp: landed * 100 } };
  return data;
}

async function pilotWith(handle: string, landed: number) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: `${handle} Controller`,
    },
  });
  const { accessToken, user } = response.json<{ accessToken: string; user: { id: string } }>();
  await db!.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [user.id]);
  await app.inject({
    method: 'PUT',
    url: `/api/results/${handle}-1`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      airspaceId: 'new-york',
      difficulty: 'normal',
      snapshot: session(`${handle}-1`, landed),
    },
  });
  // As the server's replay would.
  await db!.query("UPDATE session_results SET verification = 'verified' WHERE user_id = $1", [
    user.id,
  ]);
}

const pulse = async () => (await app.inject({ method: 'GET', url: '/api/pulse' })).json();

describe.skipIf(!db)('the landing page’s numbers (integration)', () => {
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('shows nothing until there’s enough to show', async () => {
    expect(await pulse()).toEqual({ totals: null, top: null });
    await pilotWith('Ace', 2);
    expect(await pulse()).toEqual({ totals: null, top: null });
  });

  it('counts this week’s sessions, and ranks the top pilots', async () => {
    await pilotWith('Ace', 3);
    await pilotWith('Bea', 1);
    expect(await pulse()).toEqual({
      totals: { period: 'week', landed: 4, sessions: 2, pilots: 2, hours: 0 },
      top: {
        period: 'week',
        pilots: [
          expect.objectContaining({
            rank: 1,
            handle: 'Ace',
            displayName: 'Ace Controller',
            value: 300,
          }),
          expect.objectContaining({ rank: 2, handle: 'Bea', value: 100 }),
        ],
      },
    });
  });

  it('falls back to all time when this week is quiet, and leaves out what doesn’t count', async () => {
    await pilotWith('Ace', 3);
    await pilotWith('Bea', 1);
    await db!.query("UPDATE session_results SET created_at = now() - interval '30 days'");
    expect((await pulse()).totals).toMatchObject({ period: 'all', landed: 4, sessions: 2 });
    expect((await pulse()).top.period).toBe('all');
    // A result that differs from its replay doesn't count.
    await db!.query(
      "UPDATE session_results SET verification = 'mismatch' WHERE user_id = (SELECT id FROM users WHERE handle = 'Bea')",
    );
    expect(await pulse()).toEqual({ totals: null, top: null });
  });
});
