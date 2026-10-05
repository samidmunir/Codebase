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

interface Pilot {
  id: string;
  headers: { authorization: string };
}

const registerRequest = (handle: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: handle,
    },
  });

async function register(handle: string, role?: 'admin' | 'moderator'): Promise<Pilot> {
  const id = (await registerRequest(handle)).json<{ user: { id: string } }>().user.id;
  await db!.query(
    'UPDATE users SET email_verified_at = now(), role = coalesce($2, role) WHERE id = $1',
    [id, role ?? null],
  );
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

const call = (method: 'GET' | 'POST' | 'PUT', url: string, as?: Pilot, payload?: object) =>
  app.inject({
    method,
    url: `/api${url}`,
    ...(as ? { headers: as.headers } : {}),
    ...(payload ? { payload } : {}),
  });

describe.skipIf(!db)('site switches (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    await db!.query('TRUNCATE forum_threads CASCADE');
    await db!.query('TRUNCATE site_settings');
    await db!.query('TRUNCATE admin_audit_log');
  });

  afterAll(async () => {
    await db?.query('TRUNCATE site_settings');
    await app.close();
    await db?.end();
  });

  it('starts open, with no banner, and only admins change it', async () => {
    expect((await call('GET', '/site')).json()).toEqual({
      registrationOpen: true,
      registrationMessage: '',
      banner: null,
      communityReadOnly: false,
      communityMessage: '',
    });
    const pilot = await register('Ace');
    const morgan = await register('Morgan', 'moderator');
    for (const who of [pilot, morgan])
      expect(
        (await call('PUT', '/admin/site', who, { registration: { open: false } })).statusCode,
      ).toBe(403);
  });

  it('closes registration (admins can still create accounts), and opens it again', async () => {
    const chief = await register('Chief', 'admin');
    const closed = await call('PUT', '/admin/site', chief, {
      registration: { open: false, message: 'Back after the beta, in November.' },
    });
    expect(closed.json().settings.registration).toEqual({
      open: false,
      message: 'Back after the beta, in November.',
    });
    expect(closed.json().changed.registration.by).toBe('chief@example.com');
    expect((await call('GET', '/site')).json()).toMatchObject({
      registrationOpen: false,
      registrationMessage: 'Back after the beta, in November.',
    });
    const refused = await registerRequest('Late');
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error).toEqual({
      code: 'registration_closed',
      message: 'Back after the beta, in November.',
    });
    const created = await call('POST', '/admin/users', chief, {
      email: 'invited@example.com',
      handle: 'Invited',
      displayName: 'Invited',
      password: 'a long enough password',
    });
    expect(created.statusCode).toBe(201);

    await call('PUT', '/admin/site', chief, { registration: { open: true } });
    expect((await registerRequest('Late')).statusCode).toBe(201);

    const { rows } = await db!.query<{ target: string; details: Record<string, unknown> }>(
      "SELECT target, details FROM admin_audit_log WHERE action = 'site.update' ORDER BY id",
    );
    expect(rows).toEqual([
      {
        target: 'registration',
        details: { open: false, message: 'Back after the beta, in November.' },
      },
      { target: 'registration', details: { open: true, message: '' } },
    ]);
  });

  it('shows a banner, and needs its message', async () => {
    const chief = await register('Chief', 'admin');
    expect(
      (await call('PUT', '/admin/site', chief, { banner: { enabled: true, message: '' } }))
        .statusCode,
    ).toBe(400);
    await call('PUT', '/admin/site', chief, {
      banner: { enabled: true, message: 'Maintenance at 22:00Z for 15 minutes.', tone: 'warning' },
    });
    expect((await call('GET', '/site')).json().banner).toEqual({
      message: 'Maintenance at 22:00Z for 15 minutes.',
      tone: 'warning',
    });
    // Saving the same again changes nothing, and logs nothing.
    await call('PUT', '/admin/site', chief, {
      banner: { enabled: true, message: 'Maintenance at 22:00Z for 15 minutes.', tone: 'warning' },
    });
    const { rows } = await db!.query("SELECT 1 FROM admin_audit_log WHERE action = 'site.update'");
    expect(rows).toHaveLength(1);
    await call('PUT', '/admin/site', chief, { banner: { enabled: false } });
    expect((await call('GET', '/site')).json().banner).toBeNull();
  });

  it('makes the community read-only for players, while staff carry on', async () => {
    const chief = await register('Chief', 'admin');
    const morgan = await register('Morgan', 'moderator');
    const ace = await register('Ace');
    const opened = await call('POST', '/community/threads', ace, {
      categoryId: 'general',
      title: 'Before the freeze',
      body: 'Hello',
    });
    const threadId = opened.json<{ id: number }>().id;
    const postId = (await call('GET', `/community/threads/${threadId}`, ace)).json().posts[0].id;

    await call('PUT', '/admin/site', chief, {
      community: { readOnly: true, message: 'Moving to a new server tonight.' },
    });
    const refused = await call('POST', `/community/threads/${threadId}/posts`, ace, { body: 'Hi' });
    expect(refused.statusCode).toBe(503);
    expect(refused.json().error).toMatchObject({
      code: 'forum_readOnly',
      message: 'Moving to a new server tonight.',
    });
    expect(
      (
        await call('POST', '/community/threads', ace, {
          categoryId: 'general',
          title: 'During',
          body: 'x',
        })
      ).statusCode,
    ).toBe(503);
    expect(
      (await call('POST', `/community/posts/${postId}/report`, ace, { reason: 'Test it' }))
        .statusCode,
    ).toBe(503);
    expect((await call('GET', `/community/threads/${threadId}`, ace)).json().posting).toEqual({
      allowed: false,
      reason: 'readOnly',
    });
    // Reading still works, and staff can still post.
    expect((await call('GET', `/community/threads/${threadId}`)).statusCode).toBe(200);
    expect(
      (await call('POST', `/community/threads/${threadId}/posts`, morgan, { body: 'Back soon.' }))
        .statusCode,
    ).toBe(201);

    await call('PUT', '/admin/site', chief, { community: { readOnly: false } });
    expect(
      (await call('POST', `/community/threads/${threadId}/posts`, ace, { body: 'Hi again' }))
        .statusCode,
    ).toBe(201);
  });
});
