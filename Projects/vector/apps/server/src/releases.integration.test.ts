import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL), which has the roadmap the
// migration added (v0.1 released, v0.2 next); this test adds and removes its own v9.9.
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

type Pilot = { headers: { authorization: string } };

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
    headers: { authorization: `Bearer ${login.json<{ accessToken: string }>().accessToken}` },
  };
}

const call = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  as?: Pilot,
  payload?: object,
) =>
  app.inject({
    method,
    url: `/api${url}`,
    ...(as ? { headers: as.headers } : {}),
    ...(payload ? { payload } : {}),
  });

describe.skipIf(!db)('the roadmap (integration)', () => {
  let chief: Pilot;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query("DELETE FROM releases WHERE version = '9.9'");
    await db!.query('TRUNCATE users CASCADE');
    chief = await pilot('Chief', true);
  });

  afterAll(async () => {
    await db?.query("DELETE FROM releases WHERE version = '9.9'");
    await app.close();
    await db?.end();
  });

  it('shows every version, newest first, and the current one in the site status', async () => {
    const { releases } = (await call('GET', '/releases')).json();
    expect(releases.map((r: { version: string; status: string }) => [r.version, r.status])).toEqual(
      [
        ['0.2', 'next'],
        ['0.1', 'released'],
      ],
    );
    expect(releases[1]).toMatchObject({ name: 'The beta', releasedOn: '2026-10-05' });
    expect(releases[0].features.map((f: { title: string }) => f.title)).toEqual([
      'First shift',
      'Achievements',
      'Weekly challenge',
    ]);
    expect((await call('GET', '/site')).json().version).toBe('0.1');
  });

  it('lets admins (only) add, edit and delete versions', async () => {
    const release = {
      version: '9.9',
      summary: 'Far off.',
      status: 'planned',
      features: [{ title: 'Spoken radio', description: 'Pilots you can hear.', status: 'planned' }],
    };
    expect((await call('POST', '/admin/releases', await pilot('Ace'), release)).statusCode).toBe(
      403,
    );
    const created = await call('POST', '/admin/releases', chief, release);
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: string }>().id;
    expect((await call('POST', '/admin/releases', chief, release)).json().error.code).toBe(
      'version_taken',
    );
    // Released needs its date.
    expect(
      (await call('PUT', `/admin/releases/${id}`, chief, { ...release, status: 'released' }))
        .statusCode,
    ).toBe(400);

    const edited = await call('PUT', `/admin/releases/${id}`, chief, {
      ...release,
      status: 'released',
      releasedOn: '2027-01-15',
      features: [
        { title: 'Spoken radio', status: 'shipped' },
        { title: 'Night shift', status: 'shipped' },
      ],
    });
    expect(edited.json()).toMatchObject({
      status: 'released',
      releasedOn: '2027-01-15',
      features: [
        { title: 'Spoken radio', status: 'shipped', description: '' },
        { title: 'Night shift' },
      ],
    });
    // Now the newest out, so the site shows it.
    expect((await call('GET', '/site')).json().version).toBe('9.9');

    expect((await call('DELETE', `/admin/releases/${id}`, chief)).statusCode).toBe(204);
    expect((await call('GET', '/site')).json().version).toBe('0.1');
    const log = (await call('GET', '/admin/audit', chief)).json();
    expect(log.entries.map((e: { action: string }) => e.action).slice(0, 3)).toEqual([
      'release.delete',
      'release.update',
      'release.create',
    ]);
  });
});
