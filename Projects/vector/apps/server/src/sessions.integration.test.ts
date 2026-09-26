import { parsePerformanceCatalog, SimEngine } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const JWT_SECRET = 'integration-test-secret-long-enough-0123456789';
const SESSION_LIMIT = 3;

const app = buildApp({
  checkDatabase: async () => true,
  ...(db
    ? {
        accounts: {
          db,
          auth: { jwtSecret: JWT_SECRET, accessTokenMinutes: 15, refreshTokenDays: 30 },
          secureCookies: false,
          signInRateLimit: 1_000,
          savedSessionLimit: SESSION_LIMIT,
        },
      }
    : {}),
});

const performance = parsePerformanceCatalog(performanceData);

/** A small, valid simulation snapshot: one aircraft, two minutes in. */
function snapshot(seconds = 120) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 7,
    startTimeUtc: '2026-09-26T14:00:00Z',
  });
  engine.addAircraft({
    callsign: 'JBU1024',
    aircraftType: 'A320',
    squawk: '4521',
    flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [] },
    phase: 'enroute',
    owner: 'N90',
    position: { lat: 40.64, lon: -73.78 },
    altitudeFt: 5_000,
    headingDeg: 360,
    iasKts: 220,
  });
  for (let i = 0; i < seconds; i++) engine.step();
  return engine.toSnapshot();
}

async function signIn(email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct horse battery', displayName: 'Pilot' },
  });
  return { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` };
}

type Headers = Awaited<ReturnType<typeof signIn>>;

const request = (
  headers: Headers,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  payload?: unknown,
) => app.inject({ method, url, headers, ...(payload ? { payload } : {}) });

const save = (headers: Headers, name = 'Morning push', data: unknown = snapshot()) =>
  request(headers, 'POST', '/api/sessions', {
    name,
    airspaceId: 'new-york',
    difficulty: 'easy',
    snapshot: data,
  });

describe.skipIf(!db)('saved sessions (integration)', () => {
  let pilot: Headers;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    pilot = await signIn('pilot@example.com');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('saves, lists and loads a session exactly', async () => {
    const data = snapshot();
    const created = await save(pilot, 'Morning push', data);
    expect(created.statusCode).toBe(201);
    const summary = created.json();
    expect(summary).toMatchObject({
      name: 'Morning push',
      airspaceId: 'new-york',
      difficulty: 'easy',
      simTimeSec: 120,
      aircraftCount: 1,
      rp: 0,
    });

    const list = await request(pilot, 'GET', '/api/sessions');
    expect(list.json()).toMatchObject({
      sessions: [{ id: summary.id }],
      limit: SESSION_LIMIT,
      careerRp: 0,
    });

    const loaded = await request(pilot, 'GET', `/api/sessions/${summary.id}`);
    expect(loaded.statusCode).toBe(200);
    expect(loaded.json().snapshot).toEqual(data);
    // And it resumes in the engine.
    const resumed = SimEngine.fromSnapshot(loaded.json().snapshot, performance);
    expect(resumed.listAircraft()).toHaveLength(1);
  });

  it('overwrites, renames and deletes a session', async () => {
    const { id } = (await save(pilot)).json();
    const replaced = await request(pilot, 'PUT', `/api/sessions/${id}`, {
      difficulty: 'custom',
      snapshot: snapshot(300),
    });
    expect(replaced.json()).toMatchObject({ simTimeSec: 300, difficulty: 'custom' });

    const renamed = await request(pilot, 'PATCH', `/api/sessions/${id}`, { name: '  Late bank ' });
    expect(renamed.json().name).toBe('Late bank');

    expect((await request(pilot, 'DELETE', `/api/sessions/${id}`)).statusCode).toBe(204);
    expect((await request(pilot, 'GET', `/api/sessions/${id}`)).statusCode).toBe(404);
  });

  it('keeps each account to its own sessions', async () => {
    const { id } = (await save(pilot)).json();
    const other = await signIn('other@example.com');
    expect((await request(other, 'GET', '/api/sessions')).json().sessions).toEqual([]);
    for (const [method, payload] of [
      ['GET', undefined],
      ['PUT', { snapshot: snapshot() }],
      ['PATCH', { name: 'Mine now' }],
      ['DELETE', undefined],
    ] as const) {
      const response = await request(other, method, `/api/sessions/${id}`, payload);
      expect(response.statusCode).toBe(404);
    }
    expect((await request(pilot, 'GET', `/api/sessions/${id}`)).json().name).toBe('Morning push');
  });

  it('records each session’s RP and totals them for the career', async () => {
    const withScore = (total: number) => {
      const data = snapshot();
      data.state.score.total = total;
      return data;
    };
    expect((await save(pilot, 'Morning', withScore(250))).json().rp).toBe(250);
    await save(pilot, 'Evening', withScore(-40));
    expect((await request(pilot, 'GET', '/api/sessions')).json().careerRp).toBe(210);
  });

  it('requires sign-in', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/sessions' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects snapshots the simulator cannot resume, and bad input', async () => {
    const invalid = await save(pilot, 'Broken', { schemaVersion: 99, state: {} });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe('invalid_snapshot');
    expect((await save(pilot, '   ')).json().error.code).toBe('invalid_request');
    expect((await request(pilot, 'GET', '/api/sessions/not-a-uuid')).statusCode).toBe(404);
  });

  it('caps the number of saved sessions per account', async () => {
    for (let i = 0; i < SESSION_LIMIT; i++)
      expect((await save(pilot, `S${i}`)).statusCode).toBe(201);
    const over = await save(pilot, 'One too many');
    expect(over.statusCode).toBe(409);
    expect(over.json().error.code).toBe('session_limit');
  });
});
