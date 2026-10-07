import { applyDifficulty, defaultSettings } from '@vector/shared';
import { parsePerformanceCatalog, SimEngine } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// What deleting an account takes with it. Runs against the real test database.
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

interface Pilot {
  id: string;
  headers: { authorization: string };
}

async function register(handle: string, role?: 'admin'): Promise<Pilot> {
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
  await db!.query(`UPDATE users SET email_verified_at = now(), role = $2 WHERE id = $1`, [
    id,
    role ?? 'player',
  ]);
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

const performance = parsePerformanceCatalog(performanceData);
function session(sessionId: string) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 3,
    startTimeUtc: '2026-10-04T14:00:00Z',
    sessionId,
    settings: applyDifficulty(defaultSettings('session'), 'normal'),
  });
  for (let i = 0; i < 120; i++) engine.step();
  return engine.toSnapshot();
}

const count = async (sql: string, params: unknown[]) =>
  (await db!.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${sql}`, params)).rows[0]!.n;

describe.skipIf(!db)('deleting an account (integration)', () => {
  let ace: Pilot;
  let bea: Pilot;
  let chief: Pilot;
  let theirThread: number;
  let beasThread: number;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE waitlist, feedback CASCADE');
    ace = await register('Ace');
    bea = await register('Bea');
    chief = await register('Chief', 'admin');
    // Bea's thread, with Ace's reply last; Ace's thread, with Bea's reply.
    beasThread = (
      await call('POST', '/community/threads', bea, {
        categoryId: 'general',
        title: 'Hello',
        body: 'Hi all',
      })
    ).json<{ id: number }>().id;
    theirThread = (
      await call('POST', '/community/threads', ace, {
        categoryId: 'general',
        title: 'Spam',
        body: 'Buy now',
      })
    ).json<{ id: number }>().id;
    await call('POST', `/community/threads/${theirThread}/posts`, bea, { body: 'Reported.' });
    await call('POST', `/community/threads/${beasThread}/posts`, ace, { body: 'Buy now too' });
    // Everything else that's Ace's.
    await call('POST', '/waitlist', undefined, { email: 'ace@example.com', note: 'Me' });
    await call('PUT', '/results/s1', ace, {
      airspaceId: 'new-york',
      difficulty: 'normal',
      snapshot: session('s1'),
    });
    await call('POST', '/feedback', ace, { kind: 'idea', message: 'More airspaces please' });
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('removes what’s only theirs, and keeps their posts as by a deleted pilot', async () => {
    expect(await count('session_results WHERE user_id = $1', [ace.id])).toBe(1);
    expect((await call('DELETE', `/admin/users/${ace.id}`, chief)).statusCode).toBe(204);

    expect(await count('users WHERE id = $1', [ace.id])).toBe(0);
    expect(await count('session_results WHERE user_id = $1', [ace.id])).toBe(0);
    expect(await count("waitlist WHERE email = 'ace@example.com'", [])).toBe(0);
    // Posts and threads stay, without an author.
    expect(await count('forum_threads WHERE id = $1 AND author_id IS NULL', [theirThread])).toBe(1);
    expect(await count("forum_posts WHERE body = 'Buy now too' AND author_id IS NULL", [])).toBe(1);
    // Feedback stays, from a deleted account.
    expect(
      await count("feedback WHERE message = 'More airspaces please' AND user_id IS NULL", []),
    ).toBe(1);
  });

  it('removes their posts and threads too, when an admin asks', async () => {
    const before = await db!.query<{ last_post_at: Date }>(
      'SELECT last_post_at FROM forum_threads WHERE id = $1',
      [beasThread],
    );
    expect((await call('DELETE', `/admin/users/${ace.id}?posts=delete`, chief)).statusCode).toBe(
      204,
    );

    // Their thread is gone, with the reply in it; their reply elsewhere is gone.
    expect(await count('forum_threads WHERE id = $1', [theirThread])).toBe(0);
    expect(await count("forum_posts WHERE body IN ('Reported.', 'Buy now too')", [])).toBe(0);
    // Bea's thread stays, its latest post now her own.
    const after = await db!.query<{ last_post_at: Date; created_at: Date }>(
      'SELECT last_post_at, created_at FROM forum_threads WHERE id = $1',
      [beasThread],
    );
    expect(after.rows[0]!.last_post_at.getTime()).toBeLessThan(
      before.rows[0]!.last_post_at.getTime(),
    );
    expect(await count('forum_posts WHERE thread_id = $1', [beasThread])).toBe(1);

    const log = (await call('GET', '/admin/audit', chief)).json();
    expect(log.entries[0]).toMatchObject({
      action: 'user.delete',
      details: { threadsDeleted: 1, postsDeleted: 1 },
    });
  });

  it('takes their place on the waitlist when they delete their own account', async () => {
    const deleted = await call('DELETE', '/account', ace, {
      password: 'correct horse battery',
      confirmHandle: 'Ace',
    });
    expect(deleted.statusCode).toBe(204);
    expect(await count("waitlist WHERE email = 'ace@example.com'", [])).toBe(0);
    // Their community posts stay.
    expect(await count('forum_threads WHERE id = $1', [theirThread])).toBe(1);
  });
});
