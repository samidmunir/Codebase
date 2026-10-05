import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { memoryMailer } from './email/mailer';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const PASSWORD = 'correct horse battery';
const mailer = memoryMailer();

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

interface Pilot {
  id: string;
  email: string;
  headers: { authorization: string };
  refresh: string;
}

async function register(handle: string): Promise<Pilot> {
  const email = `${handle.toLowerCase()}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, handle, password: PASSWORD, displayName: `${handle} Pilot` },
  });
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  return {
    id: body.user.id,
    email,
    headers: { authorization: `Bearer ${body.accessToken}` },
    refresh: response.cookies.find((c) => c.name === 'vector_refresh')!.value,
  };
}

/** The link in the latest email to this address: its page and token. */
function lastLink(to: string): { path: string; token: string } {
  const message = mailer.to(to).at(-1);
  if (!message) throw new Error(`No email to ${to}`);
  const match = /https:\/\/vector\.test(\/[a-z-]+)#([A-Za-z0-9_-]{43})/.exec(message.text);
  if (!match) throw new Error(`No link in "${message.subject}"`);
  return { path: match[1]!, token: match[2]! };
}

const post = (url: string, payload: object, pilot?: Pilot) =>
  app.inject({
    method: 'POST',
    url,
    payload,
    ...(pilot ? { headers: pilot.headers } : {}),
  });

const account = async (pilot: Pilot) =>
  (await app.inject({ method: 'GET', url: '/api/account', headers: pilot.headers })).json<{
    email: string;
    emailVerified: boolean;
    pendingEmail: string | null;
  }>();

const refreshes = async (pilot: Pilot) =>
  (
    await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { vector_refresh: pilot.refresh },
    })
  ).statusCode === 200;

/** Lets another email of each kind go at once (they're limited to one a minute). */
const skipCooldown = () =>
  db!.query("UPDATE email_tokens SET created_at = now() - interval '2 minutes'");

describe.skipIf(!db)('email (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    mailer.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('verifies a new account’s email from the link it was sent, once', async () => {
    const pilot = await register('Ace');
    expect(mailer.to(pilot.email)).toHaveLength(1);
    expect(mailer.sent[0]!.subject).toBe('Verify your email for Vector');
    expect(mailer.sent[0]!.html).toContain('Verify my email');
    expect(await account(pilot)).toMatchObject({ emailVerified: false });

    // A second link straight away is refused; the first still works.
    const again = await post('/api/auth/verify-email/send', {}, pilot);
    expect(again.statusCode).toBe(429);
    expect(again.headers['retry-after']).toBeDefined();

    const { path, token } = lastLink(pilot.email);
    expect(path).toBe('/verify-email');
    expect((await post('/api/auth/verify-email', { token })).statusCode).toBe(204);
    expect(await account(pilot)).toMatchObject({ emailVerified: true });
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: pilot.headers });
    expect(me.json().user.emailVerified).toBe(true);

    const reused = await post('/api/auth/verify-email', { token });
    expect(reused.statusCode).toBe(400);
    expect(reused.json().error.code).toBe('invalid_link');
    expect((await post('/api/auth/verify-email/send', {}, pilot)).statusCode).toBe(409);
  });

  it('sends a new verification link that replaces the old one, and refuses expired links', async () => {
    const pilot = await register('Ace');
    const first = lastLink(pilot.email).token;
    await skipCooldown();
    expect((await post('/api/auth/verify-email/send', {}, pilot)).statusCode).toBe(204);
    const second = lastLink(pilot.email).token;
    expect(second).not.toBe(first);
    expect((await post('/api/auth/verify-email', { token: first })).statusCode).toBe(400);

    await db!.query("UPDATE email_tokens SET expires_at = now() - interval '1 second'");
    expect((await post('/api/auth/verify-email', { token: second })).statusCode).toBe(400);
    expect((await post('/api/auth/verify-email', { token: 'short' })).statusCode).toBe(400);
  });

  it('resets a forgotten password by link, ending every sign-in, without revealing accounts', async () => {
    const pilot = await register('Ace');
    mailer.sent.length = 0;

    const unknown = await post('/api/auth/forgot-password', { email: 'nobody@example.com' });
    expect(unknown.statusCode).toBe(204);
    expect(mailer.sent).toHaveLength(0);

    expect((await post('/api/auth/forgot-password', { email: 'ACE@example.com' })).statusCode).toBe(
      204,
    );
    expect(mailer.to(pilot.email)).toHaveLength(1);
    // Asking again at once looks the same, but sends nothing more.
    expect((await post('/api/auth/forgot-password', { email: pilot.email })).statusCode).toBe(204);
    expect(mailer.to(pilot.email)).toHaveLength(1);

    const { path, token } = lastLink(pilot.email);
    expect(path).toBe('/reset-password');
    const short = await post('/api/auth/reset-password', { token, password: 'short' });
    expect(short.statusCode).toBe(400);
    const reset = await post('/api/auth/reset-password', {
      token,
      password: 'a brand new password',
    });
    expect(reset.statusCode).toBe(204);
    expect(await refreshes(pilot)).toBe(false);

    const oldLogin = await post('/api/auth/login', { email: pilot.email, password: PASSWORD });
    expect(oldLogin.statusCode).toBe(401);
    const login = await post('/api/auth/login', {
      email: pilot.email,
      password: 'a brand new password',
    });
    expect(login.statusCode).toBe(200);
    // Opening the link proved they have the address.
    expect(login.json().user.emailVerified).toBe(true);
    expect(
      (await post('/api/auth/reset-password', { token, password: 'another new password' }))
        .statusCode,
    ).toBe(400);
  });

  it('sends nothing to a disabled account', async () => {
    const pilot = await register('Ace');
    mailer.sent.length = 0;
    await db!.query('UPDATE users SET disabled_at = now() WHERE id = $1', [pilot.id]);
    await post('/api/auth/forgot-password', { email: pilot.email });
    expect(mailer.sent).toHaveLength(0);
  });

  it('changes the email once the new address confirms, and the old one can undo it', async () => {
    const pilot = await register('Ace');
    const wrong = await post(
      '/api/auth/email',
      { email: 'ace.new@example.com', currentPassword: 'not it' },
      pilot,
    );
    expect(wrong.statusCode).toBe(403);
    const same = await post(
      '/api/auth/email',
      { email: pilot.email, currentPassword: PASSWORD },
      pilot,
    );
    expect(same.json().error.code).toBe('same_email');

    const change = await post(
      '/api/auth/email',
      { email: 'Ace.New@example.com', currentPassword: PASSWORD },
      pilot,
    );
    expect(change.statusCode).toBe(204);
    expect(await account(pilot)).toMatchObject({
      email: pilot.email,
      pendingEmail: 'ace.new@example.com',
    });
    const confirm = lastLink('ace.new@example.com');
    expect(confirm.path).toBe('/confirm-email');
    expect((await post('/api/auth/email/confirm', { token: confirm.token })).statusCode).toBe(204);
    expect(await account(pilot)).toMatchObject({
      email: 'ace.new@example.com',
      emailVerified: true,
      pendingEmail: null,
    });

    // The old address is told, with a link that moves the account back.
    const notice = mailer.to(pilot.email).at(-1)!;
    expect(notice.subject).toBe('Your Vector email was changed');
    const undo = lastLink(pilot.email);
    expect(undo.path).toBe('/undo-email-change');
    expect((await post('/api/auth/email/undo', { token: undo.token })).statusCode).toBe(204);
    expect(await refreshes(pilot)).toBe(false);
    const login = await post('/api/auth/login', { email: pilot.email, password: PASSWORD });
    expect(login.statusCode).toBe(200);
  });

  it('tells an address that already has an account, and never the requester', async () => {
    const pilot = await register('Ace');
    const other = await register('Bravo');
    mailer.sent.length = 0;
    const change = await post(
      '/api/auth/email',
      { email: other.email, currentPassword: PASSWORD },
      pilot,
    );
    expect(change.statusCode).toBe(204);
    expect((await account(pilot)).pendingEmail).toBe(other.email);
    const notice = mailer.to(other.email);
    expect(notice).toHaveLength(1);
    expect(notice[0]!.subject).toBe('Your email is already on Vector');
    expect(notice[0]!.text).not.toMatch(/#[A-Za-z0-9_-]{43}/);
  });

  it('cancels a pending email change', async () => {
    const pilot = await register('Ace');
    await post(
      '/api/auth/email',
      { email: 'ace.new@example.com', currentPassword: PASSWORD },
      pilot,
    );
    const { token } = lastLink('ace.new@example.com');
    const cancel = await app.inject({
      method: 'DELETE',
      url: '/api/auth/email',
      headers: pilot.headers,
    });
    expect(cancel.statusCode).toBe(204);
    expect((await account(pilot)).pendingEmail).toBeNull();
    expect((await post('/api/auth/email/confirm', { token })).statusCode).toBe(400);
  });

  it('lets an admin create an account without a link and mark its email verified', async () => {
    const admin = await register('Chief');
    await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
    mailer.sent.length = 0;
    const created = await post(
      '/api/admin/users',
      {
        email: 'night@example.com',
        handle: 'Night',
        displayName: 'Night Shift',
        password: 'a long enough password',
        sendVerification: false,
      },
      admin,
    );
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ emailVerified: false });
    expect(mailer.sent).toHaveLength(0);

    const id = created.json<{ id: string }>().id;
    const marked = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${id}`,
      headers: admin.headers,
      payload: { emailVerified: true },
    });
    expect(marked.json()).toMatchObject({ emailVerified: true });
    // A new address from an admin needs verifying again.
    const moved = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${id}`,
      headers: admin.headers,
      payload: { email: 'day@example.com' },
    });
    expect(moved.json()).toMatchObject({ emailVerified: false });
    const { rows } = await db!.query<{ details: Record<string, unknown> }>(
      "SELECT details FROM admin_audit_log WHERE action = 'user.update' ORDER BY created_at",
    );
    expect(rows.map((row) => row.details.emailVerified)).toEqual([true, false]);
  });
});
