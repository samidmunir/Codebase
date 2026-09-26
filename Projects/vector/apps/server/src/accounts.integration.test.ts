import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL, migrated with
// `npm run migrate:up -- --test`).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const JWT_SECRET = 'integration-test-secret-long-enough-0123456789';

const accountsApp = (signInRateLimit: number) =>
  buildApp({
    checkDatabase: async () => true,
    ...(db
      ? {
          accounts: {
            db,
            auth: { jwtSecret: JWT_SECRET, accessTokenMinutes: 15, refreshTokenDays: 30 },
            secureCookies: false,
            signInRateLimit,
          },
        }
      : {}),
  });

// A high limit for the flow tests; the rate limit has its own app below.
const app = accountsApp(1_000);

type Response = Awaited<ReturnType<typeof app.inject>>;

const refreshCookie = (response: Response) =>
  response.cookies.find((cookie) => cookie.name === 'vector_refresh');

const post = (url: string, payload?: unknown, cookie?: string) =>
  app.inject({
    method: 'POST',
    url,
    ...(payload ? { payload } : {}),
    ...(cookie ? { cookies: { vector_refresh: cookie } } : {}),
  });

const register = (email = 'pilot@example.com', password = 'correct horse battery') =>
  post('/api/auth/register', { email, password, displayName: 'Pilot' });

describe.skipIf(!db)('accounts (integration)', () => {
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  describe('register and login', () => {
    it('registers, signs in and sets an HttpOnly refresh cookie scoped to the auth routes', async () => {
      const response = await register();
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.user).toMatchObject({ email: 'pilot@example.com', displayName: 'Pilot' });
      expect(body.accessToken).toEqual(expect.any(String));
      expect(refreshCookie(response)).toMatchObject({
        httpOnly: true,
        sameSite: 'Strict',
        path: '/api/auth',
      });
    });

    it('treats emails case-insensitively and rejects duplicates', async () => {
      await register('Pilot@Example.com');
      const duplicate = await register('pilot@example.COM');
      expect(duplicate.statusCode).toBe(409);
      expect(duplicate.json().error.code).toBe('email_taken');
    });

    it('validates input', async () => {
      const response = await post('/api/auth/register', {
        email: 'nope',
        password: 'short',
        displayName: '',
      });
      expect(response.statusCode).toBe(400);
      expect(Object.keys(response.json().error.fields).sort()).toEqual([
        'displayName',
        'email',
        'password',
      ]);
    });

    it('logs in with the right password, and gives one generic error otherwise', async () => {
      await register();
      expect(
        (
          await post('/api/auth/login', {
            email: 'pilot@example.com',
            password: 'correct horse battery',
          })
        ).statusCode,
      ).toBe(200);

      const wrongPassword = await post('/api/auth/login', {
        email: 'pilot@example.com',
        password: 'wrong password!',
      });
      const noAccount = await post('/api/auth/login', {
        email: 'nobody@example.com',
        password: 'correct horse battery',
      });
      expect(wrongPassword.statusCode).toBe(401);
      expect(noAccount.statusCode).toBe(401);
      expect(wrongPassword.json()).toEqual(noAccount.json());
    });

    it('never stores the password', async () => {
      await register();
      const { rows } = await db!.query<{ password_hash: string }>(
        'SELECT password_hash FROM users',
      );
      expect(rows[0]!.password_hash).toMatch(/^scrypt\$/);
      expect(rows[0]!.password_hash).not.toContain('correct horse battery');
    });
  });

  describe('access tokens', () => {
    it('authenticates /auth/me with a bearer token', async () => {
      const { accessToken } = (await register()).json();
      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(me.statusCode).toBe(200);
      expect(me.json().user.email).toBe('pilot@example.com');

      expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401);
      const forged = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: 'Bearer forged' },
      });
      expect(forged.statusCode).toBe(401);
    });
  });

  describe('refresh tokens', () => {
    it('rotates the refresh token on every refresh', async () => {
      const first = refreshCookie(await register())!.value;
      const refreshed = await post('/api/auth/refresh', undefined, first);
      expect(refreshed.statusCode).toBe(200);
      const second = refreshCookie(refreshed)!.value;
      expect(second).not.toBe(first);
      expect((await post('/api/auth/refresh', undefined, second)).statusCode).toBe(200);
    });

    it('rejects an old token reused just after rotation without signing everyone out (tabs racing)', async () => {
      const first = refreshCookie(await register())!.value;
      const second = refreshCookie(await post('/api/auth/refresh', undefined, first))!.value;
      const stale = await post('/api/auth/refresh', undefined, first);
      expect(stale.statusCode).toBe(401);
      expect(stale.json().error.code).toBe('session_stale');
      expect((await post('/api/auth/refresh', undefined, second)).statusCode).toBe(200);
    });

    it('treats a long-rotated token coming back as theft and revokes every session', async () => {
      const first = refreshCookie(await register())!.value;
      const second = refreshCookie(await post('/api/auth/refresh', undefined, first))!.value;
      await db!.query(
        "UPDATE auth_sessions SET rotated_at = now() - interval '5 minutes' WHERE rotated_at IS NOT NULL",
      );

      const reused = await post('/api/auth/refresh', undefined, first);
      expect(reused.json().error.code).toBe('session_reused');
      // The legitimate newest token is revoked too.
      expect((await post('/api/auth/refresh', undefined, second)).json().error.code).toBe(
        'session_revoked',
      );
    });

    it('rejects missing and expired tokens', async () => {
      expect((await post('/api/auth/refresh')).json().error.code).toBe('session_missing');
      const token = refreshCookie(await register())!.value;
      await db!.query("UPDATE auth_sessions SET expires_at = now() - interval '1 minute'");
      expect((await post('/api/auth/refresh', undefined, token)).json().error.code).toBe(
        'session_expired',
      );
    });

    it('logs out: clears the cookie and revokes the session', async () => {
      const token = refreshCookie(await register())!.value;
      const logout = await post('/api/auth/logout', undefined, token);
      expect(logout.statusCode).toBe(204);
      expect(refreshCookie(logout)?.value).toBe('');
      expect((await post('/api/auth/refresh', undefined, token)).json().error.code).toBe(
        'session_revoked',
      );
    });
  });

  describe('user settings', () => {
    const authorized = async () => ({
      authorization: `Bearer ${(await register()).json().accessToken}`,
    });

    it('returns defaults, saves valid updates and keeps them', async () => {
      const headers = await authorized();
      const initial = await app.inject({ method: 'GET', url: '/api/settings', headers });
      expect(initial.json().settings['audio.masterVolume']).toBe(70);
      expect(initial.json().updatedAt).toBeNull();

      const update = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        headers,
        payload: { 'audio.masterVolume': 40, 'map.basemap': true },
      });
      expect(update.statusCode).toBe(200);

      const after = (await app.inject({ method: 'GET', url: '/api/settings', headers })).json();
      expect(after.settings).toMatchObject({
        'audio.masterVolume': 40,
        'map.basemap': true,
        'display.brightness': 100,
      });
      expect(after.updatedAt).toEqual(expect.any(String));
    });

    it('rejects invalid values and unknown or session settings', async () => {
      const headers = await authorized();
      for (const payload of [
        { 'audio.masterVolume': 400 },
        { 'nope.setting': 1 },
        { 'separation.lateralNm': 5 },
      ]) {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/settings',
          headers,
          payload,
        });
        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe('invalid_settings');
      }
    });

    it('requires signing in', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/settings' })).statusCode).toBe(401);
    });
  });

  describe('rate limiting', () => {
    it('limits repeated sign-in attempts per IP', async () => {
      const limited = accountsApp(10);
      await limited.ready();
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const response = await limited.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'x@example.com', password: 'wrong password' },
        });
        statuses.push(response.statusCode);
      }
      await limited.close();
      expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
    });
  });
});
