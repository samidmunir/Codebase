import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

type Pilot = { id: string; handle: string; headers: { authorization: string } };

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
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  return { id: body.user.id, handle, headers: { authorization: `Bearer ${body.accessToken}` } };
}

let sessionNumber = 0;

/** A verified result, as the verifier leaves one. */
async function result(
  pilot: Pilot,
  values: {
    rp: number;
    minutes?: number;
    airspace?: string;
    difficulty?: string;
    daysAgo?: number;
    arrivals?: number;
    departures?: number;
    losses?: number;
    onTime?: number;
    timed?: number;
    verification?: string;
  },
): Promise<string> {
  const stats = {
    arrivals: values.arrivals ?? 0,
    departures: values.departures ?? 0,
    overflights: 0,
    onTime: values.onTime ?? 0,
    timed: values.timed ?? 0,
    separationLosses: values.losses ?? 0,
    wakeLosses: 0,
    nearMidAirs: 0,
    goArounds: 0,
  };
  const { rows } = await db!.query<{ id: string }>(
    `INSERT INTO session_results (user_id, session_key, airspace_id, difficulty, sim_time_sec,
       final_tick, rp, stats, report, verification, created_at)
     VALUES ($1, $2, $3, $4, $5, $10, $6, $7, '{}', $8, now() - make_interval(days => $9))
     RETURNING id`,
    [
      pilot.id,
      `s${++sessionNumber}`,
      values.airspace ?? 'new-york',
      values.difficulty ?? 'normal',
      (values.minutes ?? 45) * 60,
      values.rp,
      JSON.stringify(stats),
      values.verification ?? 'verified',
      values.daysAgo ?? 0,
      (values.minutes ?? 45) * 60,
    ],
  );
  return rows[0]!.id;
}

const board = async (query: string, pilot?: Pilot) =>
  (
    await app.inject({
      method: 'GET',
      url: `/api/records?${query}`,
      ...(pilot ? { headers: pilot.headers } : {}),
    })
  ).json();

const handles = (records: { entries: { handle: string }[] }) =>
  records.entries.map((e) => e.handle);

describe.skipIf(!db)('records (integration)', () => {
  let ace: Pilot;
  let bravo: Pilot;
  let cab: Pilot;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    [ace, bravo, cab] = await Promise.all([register('Ace'), register('Bravo'), register('Cab')]);
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('ranks career RP over verified results only', async () => {
    await result(ace, { rp: 300 });
    await result(ace, { rp: 200 });
    await result(bravo, { rp: 600 });
    await result(cab, { rp: 900, verification: 'pending' });
    await result(cab, { rp: 950, verification: 'mismatch' });
    const records = await board('board=career');
    expect(records.entries).toEqual([
      { rank: 1, handle: 'Bravo', displayName: 'Bravo Pilot', value: 600, sessions: 1 },
      { rank: 2, handle: 'Ace', displayName: 'Ace Pilot', value: 500, sessions: 2 },
    ]);
  });

  it('counts this month or week only when asked', async () => {
    await result(ace, { rp: 900, daysAgo: 400 });
    await result(bravo, { rp: 100 });
    expect(handles(await board('board=career&period=all'))).toEqual(['Ace', 'Bravo']);
    expect(handles(await board('board=career&period=week'))).toEqual(['Bravo']);
  });

  it('ranks best sessions of at least 30 minutes, per airspace and difficulty', async () => {
    const best = await result(ace, { rp: 700, airspace: 'chicago', difficulty: 'hard' });
    await result(ace, { rp: 400, airspace: 'chicago', difficulty: 'hard' });
    await result(bravo, { rp: 2_000, minutes: 20, airspace: 'chicago', difficulty: 'hard' });
    await result(cab, { rp: 650, airspace: 'chicago', difficulty: 'hard' });
    await result(cab, { rp: 5_000, airspace: 'new-york', difficulty: 'hard' });
    const records = await board('board=best&airspace=chicago&difficulty=hard');
    expect(records.entries).toEqual([
      expect.objectContaining({ rank: 1, handle: 'Ace', value: 700, resultId: best }),
      expect.objectContaining({ rank: 2, handle: 'Cab', value: 650 }),
    ]);
  });

  it('ranks landings, safety (lowest first) and on-time rate, with their minimums', async () => {
    await result(ace, { rp: 0, arrivals: 150, departures: 100, losses: 5, onTime: 90, timed: 120 });
    await result(bravo, {
      rp: 0,
      arrivals: 120,
      departures: 90,
      losses: 1,
      onTime: 110,
      timed: 115,
    });
    // Too few flights for safety, too few timed for on time.
    await result(cab, { rp: 0, arrivals: 30, departures: 10, losses: 0, onTime: 40, timed: 40 });
    expect(handles(await board('board=landings'))).toEqual(['Ace', 'Bravo', 'Cab']);
    const safety = await board('board=safety');
    expect(handles(safety)).toEqual(['Bravo', 'Ace']);
    expect(safety.entries[0].value).toBeCloseTo((1 / 210) * 100);
    const onTime = await board('board=onTime');
    expect(handles(onTime)).toEqual(['Bravo', 'Ace']);
    expect(onTime.entries[1].value).toBeCloseTo(75);
  });

  it('leaves out pilots who opt out, disabled accounts and hidden results', async () => {
    await result(ace, { rp: 300 });
    await result(bravo, { rp: 200 });
    const hidden = await result(cab, { rp: 900 });
    await app.inject({
      method: 'PATCH',
      url: '/api/account',
      headers: ace.headers,
      payload: { showOnRecords: false },
    });
    await db!.query('UPDATE session_results SET hidden = true WHERE id = $1', [hidden]);
    expect(handles(await board('board=career'))).toEqual(['Bravo']);
    await db!.query('UPDATE users SET disabled_at = now() WHERE id = $1', [bravo.id]);
    expect(handles(await board('board=career'))).toEqual([]);
  });

  it('shows the signed-in pilot their own place, and puts it on their profile', async () => {
    await result(ace, { rp: 300 });
    await result(bravo, { rp: 200 });
    expect((await board('board=career', bravo)).you).toMatchObject({ rank: 2, handle: 'Bravo' });
    expect((await board('board=career')).you).toBeNull();
    expect((await board('board=career', cab)).you).toBeNull();
    const profile = (await app.inject({ method: 'GET', url: '/api/pilots/Bravo' })).json();
    expect(profile.careerRank).toBe(2);
  });

  describe('moderation', () => {
    let admin: Pilot;

    beforeEach(async () => {
      admin = await register('Chief');
      await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'chief@example.com', password: 'correct horse battery' },
      });
      admin.headers = { authorization: `Bearer ${login.json().accessToken}` };
    });

    it('lists results, hides one from records and the profile, and shows it again', async () => {
      const id = await result(ace, { rp: 300 });
      await result(bravo, { rp: 200, verification: 'mismatch' });
      const call = (method: 'GET' | 'PATCH' | 'POST', url: string, payload?: object) =>
        app.inject({ method, url, headers: admin.headers, ...(payload ? { payload } : {}) });

      const mismatches = (await call('GET', '/api/admin/results?verification=mismatch')).json();
      expect(mismatches.results.map((r: { handle: string }) => r.handle)).toEqual(['Bravo']);
      expect((await call('GET', '/api/admin/results?handle=Ace')).json().total).toBe(1);

      expect((await call('PATCH', `/api/admin/results/${id}`, { hidden: true })).statusCode).toBe(
        204,
      );
      expect(handles(await board('board=career'))).toEqual([]);
      expect((await app.inject({ method: 'GET', url: `/api/results/${id}` })).statusCode).toBe(404);
      await call('PATCH', `/api/admin/results/${id}`, { hidden: false });
      expect(handles(await board('board=career'))).toEqual(['Ace']);

      const audit = (await call('GET', '/api/admin/audit')).json();
      expect(audit.entries.map((e: { action: string }) => e.action).slice(0, 2)).toEqual([
        'result.show',
        'result.hide',
      ]);
      // A player can't moderate.
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `/api/admin/results/${id}`,
            headers: ace.headers,
            payload: { hidden: true },
          })
        ).statusCode,
      ).toBe(403);
    });

    it('refuses to re-verify a result without a replay', async () => {
      const id = await result(ace, { rp: 300 });
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/results/${id}/verify`,
        headers: admin.headers,
      });
      expect(response.statusCode).toBe(409);
    });
  });
});
