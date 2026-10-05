import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const PASSWORD = 'correct horse battery';

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

interface Device {
  headers: { authorization: string };
  refresh: string;
}

const deviceFrom = (response: Awaited<ReturnType<typeof app.inject>>): Device => ({
  headers: { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` },
  refresh: response.cookies.find((c) => c.name === 'vector_refresh')!.value,
});

const register = (handle: string, email = `${handle.toLowerCase()}@example.com`) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, handle, password: PASSWORD, displayName: 'Pilot' },
  });

const login = (email: string, password = PASSWORD) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });

const refresh = (device: Device) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    cookies: { vector_refresh: device.refresh },
  });

const call = (
  device: Device,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object,
) =>
  app.inject({
    method,
    url,
    headers: device.headers,
    cookies: { vector_refresh: device.refresh },
    ...(payload ? { payload } : {}),
  });

describe.skipIf(!db)('accounts and handles (integration)', () => {
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  describe('handles', () => {
    it('gives every account a unique handle, keeping its case but ignoring it for uniqueness', async () => {
      const first = await register('SkyKing');
      expect(first.statusCode).toBe(201);
      expect(first.json().user).toMatchObject({ handle: 'SkyKing', handleGenerated: false });
      const clash = await register('skyking', 'other@example.com');
      expect(clash.statusCode).toBe(409);
      expect(clash.json().error).toMatchObject({
        code: 'handle_taken',
        fields: { handle: expect.any(String) },
      });
    });

    it('refuses reserved and badly formed handles', async () => {
      for (const handle of ['Admin', 'ab', 'has space', 'way_too_long_for_a_handle_x'])
        expect(
          (await register(handle, `${Date.now()}${handle.length}@example.com`)).statusCode,
          handle,
        ).toBe(400);
    });

    it('says whether a handle is free, for anyone', async () => {
      await register('Tower_Cab');
      const taken = await app.inject({ method: 'GET', url: '/api/handles/tower_cab' });
      expect(taken.json()).toMatchObject({ available: false, reason: 'That handle is taken' });
      const free = await app.inject({ method: 'GET', url: '/api/handles/Approach_Ace' });
      expect(free.json()).toEqual({ handle: 'Approach_Ace', available: true });
      const bad = await app.inject({ method: 'GET', url: '/api/handles/x' });
      expect(bad.json()).toMatchObject({ available: false });
    });
  });

  describe('the account page', () => {
    it('shows the account, and changes the handle and display name', async () => {
      const device = deviceFrom(await register('NightShift'));
      const account = (await call(device, 'GET', '/api/account')).json();
      expect(account).toMatchObject({
        handle: 'NightShift',
        displayName: 'Pilot',
        handleChangeableAt: null,
        activeSignIns: 1,
      });
      const changed = await call(device, 'PATCH', '/api/account', {
        handle: 'DayShift',
        displayName: 'Day Shift',
      });
      expect(changed.json()).toMatchObject({ handle: 'DayShift', displayName: 'Day Shift' });
      expect(changed.json().handleChangeableAt).not.toBeNull();
      expect((await call(device, 'GET', '/api/auth/me')).json().user.handle).toBe('DayShift');
    });

    it('lets a handle change once every 30 days, but a change of case any time', async () => {
      const device = deviceFrom(await register('Approach'));
      await call(device, 'PATCH', '/api/account', { handle: 'Departure' });
      const tooSoon = await call(device, 'PATCH', '/api/account', { handle: 'Center' });
      expect(tooSoon.statusCode).toBe(409);
      expect(tooSoon.json().error.code).toBe('handle_too_soon');
      expect(
        (await call(device, 'PATCH', '/api/account', { handle: 'DEPARTURE' })).json().handle,
      ).toBe('DEPARTURE');
    });

    it('keeps a handle someone gave up for them for 30 days', async () => {
      const owner = deviceFrom(await register('Ground'));
      await call(owner, 'PATCH', '/api/account', { handle: 'Clearance' });
      expect((await register('ground', 'thief@example.com')).statusCode).toBe(409);
      // The owner can still take it back (after the wait), as nobody else could.
      await db!.query("UPDATE users SET handle_changed_at = now() - interval '31 days'");
      expect((await call(owner, 'PATCH', '/api/account', { handle: 'Ground' })).statusCode).toBe(
        200,
      );
    });

    it('lets a made-up handle be replaced straight away', async () => {
      const device = deviceFrom(await register('Placeholder'));
      await db!.query('UPDATE users SET handle_generated = true, handle_changed_at = now()');
      expect((await call(device, 'GET', '/api/auth/me')).json().user.handleGenerated).toBe(true);
      const chosen = await call(device, 'PATCH', '/api/account', { handle: 'Chosen' });
      expect(chosen.json()).toMatchObject({ handle: 'Chosen', handleGenerated: false });
    });
  });

  describe('password and devices', () => {
    it('changes the password with the current one, and signs out every other device', async () => {
      const laptop = deviceFrom(await register('Laptop'));
      const phone = deviceFrom(await login('laptop@example.com'));
      const wrong = await call(laptop, 'POST', '/api/auth/password', {
        currentPassword: 'not my password',
        newPassword: 'a brand new password',
      });
      expect(wrong.statusCode).toBe(403);
      expect(wrong.json().error.code).toBe('wrong_password');

      const changed = await call(laptop, 'POST', '/api/auth/password', {
        currentPassword: PASSWORD,
        newPassword: 'a brand new password',
      });
      expect(changed.statusCode).toBe(204);
      expect((await refresh(phone)).statusCode).toBe(401);
      expect((await refresh(laptop)).statusCode).toBe(200);
      expect((await login('laptop@example.com')).statusCode).toBe(401);
      expect((await login('laptop@example.com', 'a brand new password')).statusCode).toBe(200);
    });

    it('signs out other devices and keeps this one', async () => {
      const laptop = deviceFrom(await register('Tablet'));
      const phone = deviceFrom(await login('tablet@example.com'));
      expect((await call(laptop, 'GET', '/api/account')).json().activeSignIns).toBe(2);
      expect((await call(laptop, 'POST', '/api/auth/sign-out-others')).statusCode).toBe(204);
      expect((await refresh(phone)).statusCode).toBe(401);
      expect((await refresh(laptop)).statusCode).toBe(200);
    });
  });

  describe('deleting your account', () => {
    it('needs the password and the handle typed exactly, then removes everything', async () => {
      const device = deviceFrom(await register('Leaving'));
      const wrongPassword = await call(device, 'DELETE', '/api/account', {
        password: 'nope nope nope',
        confirmHandle: 'Leaving',
      });
      expect(wrongPassword.statusCode).toBe(403);
      const wrongHandle = await call(device, 'DELETE', '/api/account', {
        password: PASSWORD,
        confirmHandle: 'Staying',
      });
      expect(wrongHandle.json().error.code).toBe('confirmation_mismatch');

      const deleted = await call(device, 'DELETE', '/api/account', {
        password: PASSWORD,
        confirmHandle: 'leaving',
      });
      expect(deleted.statusCode).toBe(204);
      expect((await login('leaving@example.com')).statusCode).toBe(401);
      expect((await refresh(device)).statusCode).toBe(401);
    });

    it('won’t let the only admin delete themselves', async () => {
      const device = deviceFrom(await register('OnlyAdmin'));
      await db!.query("UPDATE users SET role = 'admin'");
      const refused = await call(device, 'DELETE', '/api/account', {
        password: PASSWORD,
        confirmHandle: 'OnlyAdmin',
      });
      expect(refused.statusCode).toBe(409);
      expect(refused.json().error.code).toBe('last_admin');
    });
  });
});
