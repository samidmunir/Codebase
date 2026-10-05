import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { memoryMailer } from './email/mailer';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const mailer = memoryMailer();
const PASSWORD = 'correct horse battery';
const FIREFOX_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

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
          email: { mailer, appUrl: 'https://vector.test' },
        },
      }
    : {}),
});

interface Device {
  id: string;
  email: string;
  headers: { authorization: string; 'user-agent': string };
  refresh: string;
}

const device = (
  response: Awaited<ReturnType<typeof app.inject>>,
  userAgent: string,
  email: string,
): Device => {
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  return {
    id: body.user.id,
    email,
    headers: { authorization: `Bearer ${body.accessToken}`, 'user-agent': userAgent },
    refresh: response.cookies.find((c) => c.name === 'vector_refresh')!.value,
  };
};

async function register(handle: string, userAgent = FIREFOX_MAC, displayName = handle) {
  const email = `${handle.toLowerCase()}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: { 'user-agent': userAgent },
    payload: { email, handle, password: PASSWORD, displayName },
  });
  return device(response, userAgent, email);
}

async function login(email: string, userAgent: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'user-agent': userAgent },
    payload: { email, password: PASSWORD },
  });
  return device(response, userAgent, email);
}

/** Signs in again after a role change (which ends every sign-in). */
async function withRole(pilot: Device, role: 'admin' | 'moderator') {
  await db!.query('UPDATE users SET role = $2 WHERE id = $1', [pilot.id, role]);
  return login(pilot.email, FIREFOX_MAC);
}

const call = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  as: Device,
  payload?: object,
  cookie = false,
) =>
  app.inject({
    method,
    url: `/api${url}`,
    headers: as.headers,
    ...(cookie ? { cookies: { vector_refresh: as.refresh } } : {}),
    ...(payload ? { payload } : {}),
  });

describe.skipIf(!db)('users and sign-ins (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    await db!.query('TRUNCATE admin_audit_log');
    mailer.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('shows a pilot each device they’re signed in on, and ends one', async () => {
    const mac = await register('Ace', FIREFOX_MAC);
    const windows = await login(mac.email, CHROME_WINDOWS);
    const list = (await call('GET', '/auth/sign-ins', mac, undefined, true)).json().signIns;
    expect(list).toHaveLength(2);
    expect(list.map((s: { device: string }) => s.device).sort()).toEqual([
      'Chrome on Windows',
      'Firefox on macOS',
    ]);
    const here = list.find((s: { current: boolean }) => s.current);
    expect(here).toMatchObject({ device: 'Firefox on macOS', ip: '127.0.0.1' });

    // Refreshing keeps it the same sign-in, and forgets the old token's device.
    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { 'user-agent': FIREFOX_MAC },
      cookies: { vector_refresh: mac.refresh },
    });
    const next = device(refreshed, FIREFOX_MAC, mac.email);
    const after = (await call('GET', '/auth/sign-ins', next, undefined, true)).json().signIns;
    expect(after.find((s: { current: boolean }) => s.current).id).toBe(here.id);
    const { rows } = await db!.query(
      'SELECT count(*)::int AS n FROM auth_sessions WHERE rotated_at IS NOT NULL AND (ip IS NOT NULL OR user_agent IS NOT NULL)',
    );
    expect(rows[0].n).toBe(0);

    const other = after.find((s: { current: boolean }) => !s.current);
    expect((await call('DELETE', `/auth/sign-ins/${other.id}`, next)).statusCode).toBe(204);
    const refreshWindows = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { vector_refresh: windows.refresh },
    });
    expect(refreshWindows.statusCode).toBe(401);
    expect(
      (await call('GET', '/auth/sign-ins', next, undefined, true)).json().signIns,
    ).toHaveLength(1);
  });

  it('gives an admin everything about a user, and lets them end a sign-in', async () => {
    const chief = await withRole(await register('Chief'), 'admin');
    const ace = await register('Ace', CHROME_WINDOWS);
    await db!.query(
      `INSERT INTO session_results (user_id, session_key, airspace_id, difficulty, sim_time_sec,
         final_tick, rp, stats, report, verification)
       VALUES ($1, 'k1', 'chicago', 'normal', 1800, 1800, 42, '{}', '{}', 'verified')`,
      [ace.id],
    );

    const detail = (await call('GET', `/admin/users/${ace.id}`, chief)).json();
    expect(detail.user).toMatchObject({ handle: 'Ace', profilePublic: true, showOnRecords: true });
    expect(detail.signIns).toHaveLength(1);
    expect(detail.signIns[0]).toMatchObject({ device: 'Chrome on Windows', ip: '127.0.0.1' });
    expect(detail.results).toMatchObject({ total: 1 });
    expect(detail.results.recent[0]).toMatchObject({ airspaceId: 'chicago', rp: 42 });
    expect(detail.posts).toEqual({ total: 0, recent: [] });

    const ended = await call(
      'DELETE',
      `/admin/users/${ace.id}/sign-ins/${detail.signIns[0].id}`,
      chief,
    );
    expect(ended.statusCode).toBe(204);
    const again = (await call('GET', `/admin/users/${ace.id}`, chief)).json();
    expect(again.signIns).toHaveLength(0);
    expect(again.history[0]).toMatchObject({
      action: 'user.endSignIn',
      details: { device: 'Chrome on Windows' },
    });
    expect(
      (await call('DELETE', `/admin/users/${ace.id}/sign-ins/${detail.signIns[0].id}`, chief))
        .statusCode,
    ).toBe(409);
  });

  it('sends reset and verification emails, and changes privacy and the handle limit', async () => {
    const chief = await withRole(await register('Chief'), 'admin');
    const ace = await register('Ace');
    mailer.sent.length = 0;

    expect((await call('POST', `/admin/users/${ace.id}/send-reset`, chief)).statusCode).toBe(204);
    expect(mailer.to(ace.email).map((m) => m.subject)).toEqual(['Reset your Vector password']);
    expect((await call('POST', `/admin/users/${ace.id}/send-verification`, chief)).statusCode).toBe(
      204,
    );
    expect(mailer.to(ace.email)).toHaveLength(2);

    await db!.query('UPDATE users SET handle_changed_at = now() WHERE id = $1', [ace.id]);
    expect(
      (await call('GET', `/admin/users/${ace.id}`, chief)).json().user.handleChangeableAt,
    ).not.toBeNull();
    const changed = await call('PATCH', `/admin/users/${ace.id}`, chief, {
      profilePublic: false,
      showOnRecords: false,
      liftHandleLimit: true,
    });
    expect(changed.statusCode).toBe(200);
    const detail = (await call('GET', `/admin/users/${ace.id}`, chief)).json();
    expect(detail.user).toMatchObject({
      profilePublic: false,
      showOnRecords: false,
      handleChangeableAt: null,
    });
    expect(detail.history[0].details).toEqual({
      profilePublic: false,
      showOnRecords: false,
      handleLimit: 'lifted',
    });

    await call('PATCH', `/admin/users/${ace.id}`, chief, { emailVerified: true });
    expect((await call('POST', `/admin/users/${ace.id}/send-verification`, chief)).statusCode).toBe(
      409,
    );
  });

  it('does one thing to many users, and says which it couldn’t', async () => {
    const chief = await withRole(await register('Chief'), 'admin');
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const result = await call('POST', '/admin/users/bulk', chief, {
      ids: [ace.id, bravo.id, chief.id],
      action: 'disable',
    });
    expect(result.json()).toMatchObject({ done: 2 });
    expect(result.json().failed).toEqual([
      { id: chief.id, email: chief.email, reason: 'You can’t disable your own account' },
    ]);
    const { rows } = await db!.query(
      'SELECT count(*)::int AS n FROM users WHERE disabled_at IS NOT NULL',
    );
    expect(rows[0].n).toBe(2);

    const verified = await call('POST', '/admin/users/bulk', chief, {
      ids: [ace.id, bravo.id],
      action: 'verifyEmail',
    });
    expect(verified.json()).toEqual({ done: 2, failed: [] });
  });

  it('exports users as CSV, defusing spreadsheet formulas, and logs it', async () => {
    const chief = await withRole(await register('Chief'), 'admin');
    await register('Ace', FIREFOX_MAC, '=HYPERLINK("x")');
    const response = await call('GET', '/admin/users/export.csv?q=ace', chief);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="vector-users-/);
    const lines = response.body.trim().split('\r\n');
    expect(lines[0]).toMatch(/^id,email,email_verified,handle,display_name,role/);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`);
    const log = (await call('GET', '/admin/audit', chief)).json();
    expect(log.entries[0]).toMatchObject({ action: 'user.export', target: '1 users' });
  });

  it('lets moderators look after the community, and nothing else', async () => {
    const chief = await withRole(await register('Chief'), 'admin');
    const mod = await withRole(await register('Morgan'), 'moderator');
    const ace = await register('Ace');

    expect((await call('GET', '/admin/community/reports', mod)).statusCode).toBe(200);
    expect((await call('GET', '/admin/users', mod)).statusCode).toBe(403);
    expect((await call('GET', '/admin/stats', mod)).statusCode).toBe(403);
    expect(
      (await call('PATCH', `/admin/users/${ace.id}`, mod, { disabled: true })).statusCode,
    ).toBe(403);

    const suspended = await call('POST', '/admin/community/users/Ace/suspension', mod, {
      postingSuspension: 7,
    });
    expect(suspended.statusCode).toBe(200);
    expect(suspended.json().postingSuspendedUntil).toMatch(/^\d{4}-/);
    const staff = await call('POST', '/admin/community/users/Chief/suspension', mod, {
      postingSuspension: 7,
    });
    expect(staff.statusCode).toBe(403);
    expect(staff.json().error.message).toBe('Only an admin can suspend staff');
    expect(
      (
        await call('POST', '/admin/community/users/Ace/suspension', mod, {
          postingSuspension: 'lift',
        })
      ).json().postingSuspendedUntil,
    ).toBeNull();

    // Admins grant the role, and can't use it to demote themselves or the last admin.
    expect(
      (await call('PATCH', `/admin/users/${chief.id}`, chief, { role: 'moderator' })).statusCode,
    ).toBe(409);
    const granted = await call('PATCH', `/admin/users/${ace.id}`, chief, { role: 'moderator' });
    expect(granted.json()).toMatchObject({ role: 'moderator' });
  });
});
