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

type Headers = { authorization: string };

async function register(handle: string, admin = false): Promise<Headers> {
  const email = `${handle.toLowerCase()}@example.com`;
  const registered = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, handle, password: 'correct horse battery', displayName: handle },
  });
  if (!admin)
    return { authorization: `Bearer ${registered.json<{ accessToken: string }>().accessToken}` };
  await db!.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'correct horse battery' },
  });
  return { authorization: `Bearer ${login.json<{ accessToken: string }>().accessToken}` };
}

describe.skipIf(!db)('news (integration)', () => {
  let admin: Headers;
  let player: Headers;
  const call = (
    headers: Headers | undefined,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) =>
    app.inject({
      method,
      url,
      ...(headers ? { headers } : {}),
      ...(payload ? { payload } : {}),
    });

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE news_posts');
    admin = await register('Chief', true);
    player = await register('Pilot');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('keeps drafts to admins, and publishes them at an address made from the title', async () => {
    const draft = await call(admin, 'POST', '/api/admin/news', {
      title: 'Chicago is here!',
      summary: 'O’Hare and Midway join New York.',
      body: '## C90\n\nSix parallel runways.',
    });
    expect(draft.statusCode).toBe(201);
    expect(draft.json()).toMatchObject({
      slug: 'chicago-is-here',
      publishedAt: null,
      author: 'Chief',
    });
    expect((await call(undefined, 'GET', '/api/news')).json()).toEqual({ posts: [], total: 0 });
    expect((await call(undefined, 'GET', '/api/news/chicago-is-here')).statusCode).toBe(404);
    expect((await call(admin, 'GET', '/api/admin/news')).json().total).toBe(1);

    const published = await call(admin, 'PATCH', `/api/admin/news/${draft.json().id}`, {
      title: 'Chicago is here!',
      summary: 'O’Hare and Midway join New York.',
      body: '## C90\n\nSix parallel runways.',
      published: true,
    });
    const publishedAt = published.json().publishedAt;
    expect(publishedAt).not.toBeNull();
    const post = (await call(undefined, 'GET', '/api/news/chicago-is-here')).json();
    expect(post).toMatchObject({
      title: 'Chicago is here!',
      body: '## C90\n\nSix parallel runways.',
    });

    // Editing a published post keeps its date; unpublishing takes it down.
    const edited = await call(admin, 'PATCH', `/api/admin/news/${draft.json().id}`, {
      title: 'Chicago is here',
      slug: 'chicago-is-here',
      published: true,
    });
    expect(edited.json().publishedAt).toBe(publishedAt);
    await call(admin, 'PATCH', `/api/admin/news/${draft.json().id}`, {
      title: 'Chicago is here',
      slug: 'chicago-is-here',
      published: false,
    });
    expect((await call(undefined, 'GET', '/api/news')).json().total).toBe(0);
  });

  it('refuses a second post at the same address, and deletes posts', async () => {
    await call(admin, 'POST', '/api/admin/news', { title: 'Release notes', published: true });
    const again = await call(admin, 'POST', '/api/admin/news', { title: 'Release notes' });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('slug_taken');
    const { id } = (
      await call(admin, 'POST', '/api/admin/news', { title: 'Release notes', slug: 'release-2' })
    ).json();
    expect((await call(admin, 'DELETE', `/api/admin/news/${id}`)).statusCode).toBe(204);
    const audit = (await call(admin, 'GET', '/api/admin/audit')).json().entries;
    expect(audit.map((e: { action: string }) => e.action)).toEqual([
      'news.delete',
      'news.create',
      'news.create',
    ]);
  });

  it('lets only admins write', async () => {
    expect((await call(player, 'POST', '/api/admin/news', { title: 'Hi' })).statusCode).toBe(403);
    expect((await call(undefined, 'GET', '/api/admin/news')).statusCode).toBe(401);
  });
});
