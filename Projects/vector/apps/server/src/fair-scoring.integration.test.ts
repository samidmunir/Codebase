import {
  applyDifficulty,
  defaultScoring,
  defaultSettings,
  type SessionSettings,
} from '@vector/shared';
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

/** A two-minute session started with these settings (and, optionally, traffic changed halfway). */
function session(
  sessionId: string,
  settings: SessionSettings,
  options: { changeTraffic?: boolean } = {},
) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 3,
    startTimeUtc: '2026-10-04T14:00:00Z',
    sessionId,
    settings,
  });
  for (let i = 0; i < 120; i++) {
    if (options.changeTraffic && i === 60)
      engine.updateTrafficSettings({ 'traffic.arrivalRatePerHour': 30 });
    engine.step();
  }
  return engine.toSnapshot();
}

const normal = () => applyDifficulty(defaultSettings('session'), 'normal');

type Pilot = { id: string; headers: { authorization: string } };

async function pilot(handle: string, admin = false): Promise<Pilot> {
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
  const id = response.json<{ user: { id: string } }>().user.id;
  if (admin) await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [id]);
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: `${handle.toLowerCase()}@example.com`, password: 'correct horse battery' },
  });
  return {
    id,
    headers: { authorization: `Bearer ${login.json<{ accessToken: string }>().accessToken}` },
  };
}

const record = async (
  as: Pilot,
  sessionId: string,
  settings: SessionSettings,
  options: { changeTraffic?: boolean; claim?: string } = {},
) =>
  (
    await app.inject({
      method: 'PUT',
      url: `/api/results/${sessionId}`,
      headers: as.headers,
      payload: {
        airspaceId: 'new-york',
        difficulty: options.claim ?? 'normal',
        snapshot: session(sessionId, settings, options),
      },
    })
  ).json<{ id: string; ranked: boolean; unrankedReason: string | null; difficulty: string }>();

describe.skipIf(!db)('fair scoring (integration)', () => {
  let ace: Pilot;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE scoring_versions');
    ace = await pilot('Ace');
  });

  afterAll(async () => {
    await db?.query('TRUNCATE scoring_versions');
    await app.close();
    await db?.end();
  });

  it('ranks a session on official scoring, the standard rules and a difficulty preset', async () => {
    const result = await record(ace, 's1', normal());
    expect(result).toMatchObject({ ranked: true, unrankedReason: null, difficulty: 'normal' });
  });

  it('takes the difficulty from the session’s traffic, not from what the client says', async () => {
    const result = await record(ace, 's1', normal(), { claim: 'expert' });
    expect(result.difficulty).toBe('normal');
  });

  it('doesn’t rank changed scoring, changed rules, custom traffic or traffic changed mid-session', async () => {
    expect(await record(ace, 'a', { ...normal(), 'scoring.landingRp': 500 })).toMatchObject({
      ranked: false,
      unrankedReason: 'Played with unofficial scoring',
    });
    // A value out of range doesn't pass for the default it would be reset to.
    expect(await record(ace, 'a2', { ...normal(), 'scoring.landingRp': 100_000 })).toMatchObject({
      ranked: false,
      unrankedReason: 'Played with unofficial scoring',
    });
    expect(await record(ace, 'b', { ...normal(), 'separation.lateralNm': 1 })).toMatchObject({
      ranked: false,
      unrankedReason: 'Played with non-standard rules',
    });
    expect(await record(ace, 'c', { ...normal(), 'traffic.arrivalRatePerHour': 40 })).toMatchObject(
      {
        ranked: false,
        difficulty: 'custom',
        unrankedReason: 'Custom traffic isn’t ranked: choose Easy, Normal, Hard or Expert',
      },
    );
    expect(await record(ace, 'd', normal(), { changeTraffic: true })).toMatchObject({
      ranked: false,
      unrankedReason: 'Traffic was changed during the session',
    });
  });

  it('leaves unranked sessions out of the career', async () => {
    await db!.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [ace.id]);
    const ranked = await record(ace, 'r', normal());
    await record(ace, 'u', { ...normal(), 'scoring.landingRp': 500 });
    const profile = (await app.inject({ method: 'GET', url: '/api/pilots/Ace' })).json();
    expect(profile.career.sessions).toBe(1);
    // Both are listed, the unranked one marked as such.
    expect(profile.recent.map((r: { ranked: boolean }) => r.ranked).sort()).toEqual([false, true]);
    expect(profile.recent.find((r: { id: string }) => r.id === ranked.id).ranked).toBe(true);
  });

  it('lets admins (only) change the official scoring, and keeps the previous version counting', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/scoring' })).json()).toEqual({
      values: defaultScoring(),
      changedAt: null,
    });
    const chief = await pilot('Chief', true);
    const changed = { ...defaultScoring(), 'scoring.landingRp': 150 };
    const put = (as: Pilot, payload: object) =>
      app.inject({ method: 'PUT', url: '/api/admin/scoring', headers: as.headers, payload });
    expect((await put(ace, changed)).statusCode).toBe(403);
    expect(
      (await put(chief, { 'scoring.landingRp': -5, 'separation.lateralNm': 1 })).statusCode,
    ).toBe(400);
    expect((await put(chief, changed)).statusCode).toBe(204);
    const official = (await app.inject({ method: 'GET', url: '/api/scoring' })).json();
    expect(official.values['scoring.landingRp']).toBe(150);
    expect(official.changedAt).not.toBeNull();

    // New sessions use it; sessions under the version it replaced still count.
    expect((await record(ace, 'new', { ...normal(), ...changed })).ranked).toBe(true);
    expect((await record(ace, 'old', normal())).ranked).toBe(true);
    // In the log, value by value.
    const log = (
      await app.inject({ method: 'GET', url: '/api/admin/audit', headers: chief.headers })
    ).json();
    expect(log.entries[0]).toMatchObject({
      action: 'scoring.update',
      details: { 'scoring.landingRp': { from: 100, to: 150 } },
    });
  });

  it('ranks results from before ranking, once the server starts', async () => {
    const { id } = await record(ace, 's1', { ...normal(), 'scoring.landingRp': 500 });
    await db!.query('UPDATE session_results SET ranked = NULL, unranked_reason = NULL');
    expect(await app.rankEarlierResults!()).toBe(1);
    const { rows } = await db!.query(
      'SELECT ranked, unranked_reason FROM session_results WHERE id = $1',
      [id],
    );
    expect(rows[0]).toEqual({ ranked: false, unranked_reason: 'Played with unofficial scoring' });
  });
});
