import { SimEngine, parsePerformanceCatalog } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const JWT_SECRET = 'integration-test-secret-long-enough-0123456789';
const PASSWORD = 'correct horse battery';

const app = buildApp({
  checkDatabase: async () => true,
  ...(db
    ? {
        accounts: {
          db,
          auth: { jwtSecret: JWT_SECRET, accessTokenMinutes: 15, refreshTokenDays: 30 },
          secureCookies: false,
          signInRateLimit: 1_000,
        },
      }
    : {}),
});

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A handle made from an email's name part, for test accounts. */
const handleFor = (email: string) =>
  `${email
    .split('@')[0]!
    .replace(/[^A-Za-z0-9_]/g, '_')
    .slice(0, 14)}_pilot`;

interface Account {
  id: string;
  email: string;
  headers: { authorization: string };
  refresh: string;
}

async function register(email: string, displayName = 'Pilot'): Promise<Account> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, handle: handleFor(email), password: PASSWORD, displayName },
  });
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  return {
    id: body.user.id,
    email,
    headers: { authorization: `Bearer ${body.accessToken}` },
    refresh: response.cookies.find((c) => c.name === 'vector_refresh')!.value,
  };
}

const login = (email: string, password = PASSWORD) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });

const refresh = (account: Account) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    cookies: { vector_refresh: account.refresh },
  });

/** Makes an account an admin as `npm run admin:grant` does, then signs it in again. */
async function registerAdmin(email = 'admin@example.com'): Promise<Account> {
  const account = await register(email, 'Admin');
  await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [account.id]);
  const signedIn = await login(email);
  return {
    ...account,
    headers: { authorization: `Bearer ${signedIn.json<{ accessToken: string }>().accessToken}` },
  };
}

const call = (account: Account | undefined, method: Method, url: string, payload?: unknown) =>
  app.inject({
    method,
    url,
    ...(account ? { headers: account.headers } : {}),
    ...(payload !== undefined ? { payload: payload as Record<string, unknown> } : {}),
  });

const performance = parsePerformanceCatalog(performanceData);
function snapshot() {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -3 },
    seed: 7,
    startTimeUtc: '2026-10-04T14:00:00Z',
  });
  for (let i = 0; i < 10; i++) engine.step();
  return engine.toSnapshot();
}

const save = (account: Account, airspaceId: string, name = 'Evening push') =>
  call(account, 'POST', '/api/sessions', { name, airspaceId, snapshot: snapshot() });

describe.skipIf(!db)('administration (integration)', () => {
  let admin: Account;
  let pilot: Account;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    // Also empties the airspaces and audit tables, which reference users.
    await db!.query('TRUNCATE users CASCADE');
    admin = await registerAdmin();
    pilot = await register('pilot@example.com');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('keeps players and signed-out visitors out of every admin route', async () => {
    const routes: [Method, string][] = [
      ['GET', '/api/admin/summary'],
      ['GET', '/api/admin/users'],
      ['POST', '/api/admin/users'],
      ['GET', `/api/admin/users/${admin.id}`],
      ['PATCH', `/api/admin/users/${admin.id}`],
      ['DELETE', `/api/admin/users/${admin.id}`],
      ['POST', `/api/admin/users/${admin.id}/sign-out`],
      ['DELETE', `/api/admin/users/${admin.id}/sessions/${admin.id}`],
      ['GET', '/api/admin/airspaces'],
      ['PATCH', '/api/admin/airspaces/chicago'],
      ['GET', '/api/admin/audit'],
    ];
    for (const [method, url] of routes) {
      const asPlayer = await call(pilot, method, url, method === 'GET' ? undefined : {});
      expect(asPlayer.statusCode, `${method} ${url}`).toBe(403);
      expect(asPlayer.json().error.code).toBe('forbidden');
      expect((await call(undefined, method, url)).statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('reports the role with the signed-in user', async () => {
    expect((await call(admin, 'GET', '/api/auth/me')).json().user.role).toBe('admin');
    expect((await call(pilot, 'GET', '/api/auth/me')).json().user.role).toBe('player');
  });

  it('lists, searches and filters users with their activity and totals', async () => {
    await save(pilot, 'new-york');
    await register('controller@example.com', 'Night Shift');
    const all = (await call(admin, 'GET', '/api/admin/users')).json();
    expect(all.total).toBe(3);
    const listed = all.users.find((u: { email: string }) => u.email === 'pilot@example.com');
    expect(listed).toMatchObject({
      displayName: 'Pilot',
      role: 'player',
      disabledAt: null,
      savedSessions: 1,
      activeSignIns: 1,
    });
    expect(listed.lastActiveAt).not.toBeNull();

    const search = (await call(admin, 'GET', '/api/admin/users?q=night')).json();
    expect(search.users.map((u: { email: string }) => u.email)).toEqual(['controller@example.com']);
    const admins = (await call(admin, 'GET', '/api/admin/users?role=admin')).json();
    expect(admins.total).toBe(1);
    const page = (await call(admin, 'GET', '/api/admin/users?limit=2&offset=2')).json();
    expect(page).toMatchObject({ total: 3 });
    expect(page.users).toHaveLength(1);

    const detail = (await call(admin, 'GET', `/api/admin/users/${pilot.id}`)).json();
    expect(detail.sessions).toHaveLength(1);
    expect(detail.sessions[0]).toMatchObject({ airspaceId: 'new-york', name: 'Evening push' });
  });

  it('creates accounts that can sign in, and refuses a duplicate email', async () => {
    const created = await call(admin, 'POST', '/api/admin/users', {
      email: 'New.Controller@Example.com',
      handle: 'NewController',
      displayName: 'New Controller',
      password: 'a long enough password',
      role: 'admin',
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ email: 'new.controller@example.com', role: 'admin' });
    expect((await login('new.controller@example.com', 'a long enough password')).statusCode).toBe(
      200,
    );
    const duplicate = await call(admin, 'POST', '/api/admin/users', {
      email: 'pilot@example.com',
      handle: 'Again',
      displayName: 'Again',
      password: 'a long enough password',
    });
    expect(duplicate.statusCode).toBe(409);
    const invalid = await call(admin, 'POST', '/api/admin/users', { email: 'nope' });
    expect(invalid.statusCode).toBe(400);
  });

  it('edits a user’s name, email and role', async () => {
    const updated = await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, {
      displayName: 'Senior Pilot',
      email: 'senior@example.com',
      role: 'admin',
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      displayName: 'Senior Pilot',
      email: 'senior@example.com',
      role: 'admin',
    });
    // A role change signs them out everywhere, so the new role applies on their next sign-in.
    expect((await refresh(pilot)).statusCode).toBe(401);
    const signedIn = await login('senior@example.com');
    expect(signedIn.json().user.role).toBe('admin');

    const taken = await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, {
      email: 'admin@example.com',
    });
    expect(taken.statusCode).toBe(409);
    expect((await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, {})).statusCode).toBe(400);
  });

  it('sets a new password, which ends every sign-in', async () => {
    const changed = await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, {
      password: 'a brand new password',
    });
    expect(changed.statusCode).toBe(200);
    expect((await login('pilot@example.com')).statusCode).toBe(401);
    expect((await login('pilot@example.com', 'a brand new password')).statusCode).toBe(200);
    expect((await refresh(pilot)).statusCode).toBe(401);
  });

  it('disables an account at once, and re-enables it', async () => {
    const disabled = await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, {
      disabled: true,
    });
    expect(disabled.json().disabledAt).not.toBeNull();
    // Locked out straight away: the access token it still holds stops working too.
    expect((await call(pilot, 'GET', '/api/sessions')).statusCode).toBe(401);
    expect((await refresh(pilot)).statusCode).toBe(401);
    const refused = await login('pilot@example.com');
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.code).toBe('account_disabled');
    // A wrong password still gets the generic answer, so it reveals nothing.
    expect((await login('pilot@example.com', 'wrong password!')).json().error.code).toBe(
      'invalid_credentials',
    );

    await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, { disabled: false });
    expect((await login('pilot@example.com')).statusCode).toBe(200);
  });

  it('signs a user out everywhere without disabling them', async () => {
    const response = await call(admin, 'POST', `/api/admin/users/${pilot.id}/sign-out`);
    expect(response.statusCode).toBe(204);
    expect((await refresh(pilot)).statusCode).toBe(401);
    expect((await login('pilot@example.com')).statusCode).toBe(200);
  });

  it('deletes a user and everything they saved', async () => {
    await save(pilot, 'new-york');
    const response = await call(admin, 'DELETE', `/api/admin/users/${pilot.id}`);
    expect(response.statusCode).toBe(204);
    expect((await call(admin, 'GET', `/api/admin/users/${pilot.id}`)).statusCode).toBe(404);
    expect((await login('pilot@example.com')).statusCode).toBe(401);
    const { rows } = await db!.query('SELECT count(*)::int AS n FROM saved_sessions');
    expect(rows[0].n).toBe(0);
  });

  it('deletes one of a user’s saved sessions', async () => {
    const { id } = (await save(pilot, 'new-york', 'Keep me not')).json();
    const response = await call(admin, 'DELETE', `/api/admin/users/${pilot.id}/sessions/${id}`);
    expect(response.statusCode).toBe(204);
    expect((await call(pilot, 'GET', '/api/sessions')).json().sessions).toHaveLength(0);
  });

  it('never lets an admin lock themselves out, or remove the last admin', async () => {
    const self = `/api/admin/users/${admin.id}`;
    for (const change of [{ role: 'player' }, { disabled: true }]) {
      const response = await call(admin, 'PATCH', self, change);
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('admin_guard');
    }
    expect((await call(admin, 'DELETE', self)).statusCode).toBe(409);
    // Still an admin, and able to edit their own name.
    expect((await call(admin, 'PATCH', self, { displayName: 'Chief' })).json()).toMatchObject({
      displayName: 'Chief',
      role: 'admin',
    });

    // With a second admin, either can manage the other.
    await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, { role: 'admin' });
    expect(
      (await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, { role: 'player' })).statusCode,
    ).toBe(200);
  });

  it('closes an airspace completely, and opens it again', async () => {
    const { id: chicagoSession } = (await save(pilot, 'chicago')).json();
    const listed = (await call(admin, 'GET', '/api/admin/airspaces')).json().airspaces;
    expect(listed.map((a: { id: string }) => a.id)).toEqual(['new-york', 'chicago', 'dallas']);
    expect(listed.find((a: { id: string }) => a.id === 'chicago')).toMatchObject({
      enabled: true,
      savedSessions: 1,
    });

    const closed = await call(admin, 'PATCH', '/api/admin/airspaces/chicago', { enabled: false });
    expect(closed.json()).toMatchObject({ enabled: false, updatedBy: 'admin@example.com' });
    const open = (await app.inject({ method: 'GET', url: '/api/airspaces' })).json();
    expect(open.airspaces).toEqual([
      { id: 'new-york', enabled: true },
      { id: 'chicago', enabled: false },
      { id: 'dallas', enabled: true },
    ]);

    // No new sessions, no resuming and no saving over one there; renaming and deleting still work.
    expect((await save(pilot, 'chicago')).json().error.code).toBe('airspace_disabled');
    expect((await call(pilot, 'GET', `/api/sessions/${chicagoSession}`)).statusCode).toBe(403);
    const replace = await call(pilot, 'PUT', `/api/sessions/${chicagoSession}`, {
      snapshot: snapshot(),
    });
    expect(replace.statusCode).toBe(403);
    expect(
      (await call(pilot, 'PATCH', `/api/sessions/${chicagoSession}`, { name: 'Later' })).statusCode,
    ).toBe(200);
    expect((await save(pilot, 'new-york')).statusCode).toBe(201);

    await call(admin, 'PATCH', '/api/admin/airspaces/chicago', { enabled: true });
    expect((await call(pilot, 'GET', `/api/sessions/${chicagoSession}`)).statusCode).toBe(200);
    expect(
      (await call(admin, 'PATCH', '/api/admin/airspaces/atlantis', { enabled: false })).statusCode,
    ).toBe(404);
    expect((await save(pilot, 'atlantis')).statusCode).toBe(400);
  });

  it('records every change in the audit log, newest first', async () => {
    await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, { displayName: 'Renamed' });
    await call(admin, 'POST', `/api/admin/users/${pilot.id}/sign-out`);
    await call(admin, 'PATCH', '/api/admin/airspaces/dallas', { enabled: false });
    await call(admin, 'DELETE', `/api/admin/users/${pilot.id}`);
    const { entries } = (await call(admin, 'GET', '/api/admin/audit')).json();
    expect(
      entries.map((e: { action: string; target: string; actor: string }) => [
        e.action,
        e.target,
        e.actor,
      ]),
    ).toEqual([
      ['user.delete', 'pilot@example.com', 'admin@example.com'],
      ['airspace.update', 'dallas', 'admin@example.com'],
      ['user.signOut', 'pilot@example.com', 'admin@example.com'],
      ['user.update', 'pilot@example.com', 'admin@example.com'],
    ]);
    expect(entries[3].details).toEqual({ displayName: { from: 'Pilot', to: 'Renamed' } });
  });

  it('sums up users and saved sessions', async () => {
    await save(pilot, 'new-york');
    await call(admin, 'PATCH', `/api/admin/users/${pilot.id}`, { disabled: true });
    expect((await call(admin, 'GET', '/api/admin/summary')).json()).toEqual({
      users: 2,
      admins: 1,
      disabled: 1,
      activeToday: 2,
      savedSessions: 1,
    });
  });
});
