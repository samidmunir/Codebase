import { parsePerformanceCatalog, SimEngine } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
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
        },
      }
    : {}),
});

const performance = parsePerformanceCatalog(performanceData);

/** A session `seconds` long with this id, and its RP set to `rp`. */
function session(sessionId: string, seconds: number, rp = 0) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 3,
    startTimeUtc: '2026-10-04T14:00:00Z',
    sessionId,
  });
  for (let i = 0; i < seconds; i++) engine.step();
  const data = engine.toSnapshot();
  data.state.score.total = rp;
  data.state.score.tally = { landing: { count: Math.max(0, Math.round(rp / 100)), rp } };
  return data;
}

type Pilot = { headers: { authorization: string }; handle: string };

async function register(handle: string): Promise<Pilot> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: `${handle} Pilot`,
    },
  });
  return {
    headers: { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` },
    handle,
  };
}

const record = (pilot: Pilot, sessionId: string, data: unknown, airspaceId = 'new-york') =>
  app.inject({
    method: 'PUT',
    url: `/api/results/${sessionId}`,
    headers: pilot.headers,
    payload: { airspaceId, difficulty: 'normal', snapshot: data },
  });

const get = (url: string, pilot?: Pilot) =>
  app.inject({ method: 'GET', url, ...(pilot ? { headers: pilot.headers } : {}) });

describe.skipIf(!db)('session results and profiles (integration)', () => {
  let pilot: Pilot;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    pilot = await register('NightShift');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  describe('recording results', () => {
    it('records a session, then updates the same result as it goes on', async () => {
      const first = await record(pilot, 'session-a', session('session-a', 120, 100));
      expect(first.statusCode).toBe(200);
      expect(first.json()).toMatchObject({
        airspaceId: 'new-york',
        difficulty: 'normal',
        simTimeSec: 120,
        rp: 100,
        verification: 'pending',
      });
      const later = await record(pilot, 'session-a', session('session-a', 300, 250));
      expect(later.json()).toMatchObject({ id: first.json().id, simTimeSec: 300, rp: 250 });
      // An older snapshot of the same session (another tab, a stale save) changes nothing.
      const stale = await record(pilot, 'session-a', session('session-a', 200, 180));
      expect(stale.json()).toMatchObject({ simTimeSec: 300, rp: 250 });
      const { rows } = await db!.query('SELECT count(*)::int AS n FROM session_results');
      expect(rows[0].n).toBe(1);
    });

    it('keeps no result for a session under a minute', async () => {
      expect((await record(pilot, 'quick', session('quick', 30, 0))).statusCode).toBe(204);
      expect((await get(`/api/pilots/${pilot.handle}`)).json().career.sessions).toBe(0);
    });

    it('refuses a snapshot from another session, invalid data, or a closed airspace', async () => {
      expect((await record(pilot, 'mine', session('theirs', 120))).statusCode).toBe(400);
      expect((await record(pilot, 'bad', { schemaVersion: 1, state: {} })).statusCode).toBe(400);
      await db!.query(
        "INSERT INTO airspaces (id, enabled) VALUES ('chicago', false) ON CONFLICT (id) DO UPDATE SET enabled = false",
      );
      expect((await record(pilot, 'closed', session('closed', 120), 'chicago')).statusCode).toBe(
        403,
      );
    });

    it('marks a session from before replays as unverifiable', async () => {
      const old = session('old', 120);
      delete old.state.replay;
      expect((await record(pilot, 'old', old)).json().verification).toBe('unverifiable');
    });

    it('keeps the career when the saved session is deleted', async () => {
      const data = session('kept', 120, 300);
      const saved = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: pilot.headers,
        payload: { name: 'Keep me', airspaceId: 'new-york', snapshot: data },
      });
      await record(pilot, 'kept', data);
      await app.inject({
        method: 'DELETE',
        url: `/api/sessions/${saved.json().id}`,
        headers: pilot.headers,
      });
      expect((await get('/api/sessions', pilot)).json().careerRp).toBe(300);
    });
  });

  describe('profiles', () => {
    it('totals the career, per airspace, with its history and recent sessions', async () => {
      await record(pilot, 's1', session('s1', 600, 200));
      await record(pilot, 's2', session('s2', 1_200, -50), 'chicago');
      await record(pilot, 's3', session('s3', 600, 400));
      const profile = (await get(`/api/pilots/${pilot.handle}`)).json();
      expect(profile).toMatchObject({
        visibility: 'public',
        pilot: { handle: 'NightShift', displayName: 'NightShift Pilot', isYou: false },
        career: { sessions: 3, simTimeSec: 2_400, rp: 550 },
      });
      expect(profile.career.stats.arrivals).toBeGreaterThanOrEqual(0);
      expect(profile.byAirspace).toEqual([
        expect.objectContaining({ airspaceId: 'new-york', sessions: 2, rp: 600, bestRp: 400 }),
        expect.objectContaining({ airspaceId: 'chicago', sessions: 1, rp: -50, bestRp: -50 }),
      ]);
      expect(profile.history.map((point: { rp: number }) => point.rp)).toEqual([200, 150, 550]);
      expect(profile.recent).toHaveLength(3);
      // Handles are found whatever their case.
      expect((await get('/api/pilots/nightshift')).json().visibility).toBe('public');
      expect((await get('/api/pilots/nobody_here')).statusCode).toBe(404);
    });

    it('shows a session overview with its report', async () => {
      const { id } = (await record(pilot, 's1', session('s1', 120, 100))).json();
      const detail = (await get(`/api/results/${id}`)).json();
      expect(detail).toMatchObject({
        result: { id, rp: 100 },
        pilot: { handle: 'NightShift' },
        report: { sessionId: 's1', finalTick: 120, total: 100 },
      });
    });

    it('pages through a pilot’s results', async () => {
      for (let i = 0; i < 5; i++) await record(pilot, `p${i}`, session(`p${i}`, 120, i));
      const page = (await get(`/api/pilots/${pilot.handle}/results?limit=2&offset=2`)).json();
      expect(page.total).toBe(5);
      expect(page.results).toHaveLength(2);
    });

    it('hides a private profile and its results from everyone but the pilot', async () => {
      const { id } = (await record(pilot, 's1', session('s1', 120, 100))).json();
      await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: pilot.headers,
        payload: { profilePublic: false },
      });
      const other = await register('Tower');
      expect((await get(`/api/pilots/${pilot.handle}`, other)).json()).toEqual({
        visibility: 'private',
        pilot: { handle: 'NightShift' },
      });
      expect((await get(`/api/results/${id}`, other)).statusCode).toBe(404);
      expect((await get(`/api/results/${id}`)).statusCode).toBe(404);
      expect((await get(`/api/pilots/${pilot.handle}/results`, other)).statusCode).toBe(404);

      const own = (await get(`/api/pilots/${pilot.handle}`, pilot)).json();
      expect(own).toMatchObject({ visibility: 'public', pilot: { isYou: true, isPublic: false } });
      expect((await get(`/api/results/${id}`, pilot)).statusCode).toBe(200);
    });
  });
});
