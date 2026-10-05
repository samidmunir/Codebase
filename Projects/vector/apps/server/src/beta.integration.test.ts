import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { memoryMailer } from './email/mailer';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
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
  headers: { authorization: string };
}

const register = (handle: string, inviteCode?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: handle,
      ...(inviteCode !== undefined ? { inviteCode } : {}),
    },
  });

async function pilot(handle: string, role?: 'admin'): Promise<Pilot> {
  const response = await register(handle);
  const id = response.json<{ user: { id: string } }>().user.id;
  if (role) await db!.query('UPDATE users SET role = $2 WHERE id = $1', [id, role]);
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
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  as?: Pilot,
  payload?: object,
) =>
  app.inject({
    method,
    url: `/api${url}`,
    ...(as
      ? { headers: { ...as.headers, 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/131.0' } }
      : {}),
    ...(payload ? { payload } : {}),
  });

describe.skipIf(!db)('beta access (integration)', () => {
  let chief: Pilot;

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    await db!.query('TRUNCATE site_settings');
    await db!.query('TRUNCATE invite_codes, waitlist, feedback CASCADE');
    mailer.sent.length = 0;
    chief = await pilot('Chief', 'admin');
  });

  afterAll(async () => {
    await db?.query('TRUNCATE site_settings');
    await app.close();
    await db?.end();
  });

  const inviteOnly = () =>
    call('PUT', '/admin/site', chief, {
      registration: { mode: 'invite', message: 'Ask on the waitlist.' },
    });

  it('lets people in with a working invite code, and nobody else', async () => {
    await inviteOnly();
    expect((await call('GET', '/site')).json()).toMatchObject({
      registrationMode: 'invite',
      registrationOpen: true,
    });
    const without = await register('Ace');
    expect(without.statusCode).toBe(403);
    expect(without.json().error.code).toBe('invite_required');
    expect((await register('Ace', 'VEC-NOPE-NOPE')).json().error.message).toBe(
      'That isn’t an invite code we know',
    );

    const created = await call('POST', '/admin/invites', chief, {
      note: 'Friends',
      maxUses: 2,
      expiresInDays: 7,
    });
    expect(created.statusCode).toBe(201);
    const invite = created.json<{ id: string; code: string }>();
    expect(invite.code).toMatch(/^VEC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect((await call('GET', `/invites/${invite.code.toLowerCase()}`)).json()).toEqual({
      valid: true,
    });

    // Lowercase works; the account remembers its code.
    expect((await register('Ace', invite.code.toLowerCase())).statusCode).toBe(201);
    // A sign-up that fails (handle taken) gives its use back.
    expect((await register('Ace', invite.code)).statusCode).toBe(409);
    expect((await register('Bravo', invite.code)).statusCode).toBe(201);
    const usedUp = await register('Charlie', invite.code);
    expect(usedUp.json().error.message).toBe('That invite code has been used up');

    const listed = (await call('GET', '/admin/invites', chief)).json().codes[0];
    expect(listed).toMatchObject({ note: 'Friends', uses: 2, maxUses: 2 });
    expect(listed.usedBy.map((u: { handle: string }) => u.handle).sort()).toEqual(['Ace', 'Bravo']);
  });

  it('stops expired and withdrawn codes', async () => {
    await inviteOnly();
    const custom = await call('POST', '/admin/invites', chief, {
      code: 'vector-discord',
      maxUses: 50,
    });
    expect(custom.json().code).toBe('VECTOR-DISCORD');
    expect(
      (await call('POST', '/admin/invites', chief, { code: 'VECTOR-DISCORD' })).statusCode,
    ).toBe(409);
    await db!.query("UPDATE invite_codes SET expires_at = now() - interval '1 minute'");
    expect((await register('Ace', 'VECTOR-DISCORD')).json().error.message).toBe(
      'That invite code has expired',
    );
    await db!.query('UPDATE invite_codes SET expires_at = NULL');
    await call('POST', `/admin/invites/${custom.json().id}/revoke`, chief);
    expect((await call('GET', '/invites/VECTOR-DISCORD')).json()).toEqual({
      valid: false,
      reason: 'That invite code has been withdrawn',
    });
  });

  it('keeps a waitlist, and invites from it by email', async () => {
    const nosy = await pilot('Nosy');
    expect(
      (
        await call('POST', '/waitlist', undefined, {
          email: 'Keen@Example.com',
          note: 'I fly MSFS',
        })
      ).statusCode,
    ).toBe(204);
    // Asking again looks the same and changes nothing.
    expect(
      (await call('POST', '/waitlist', undefined, { email: 'keen@example.com' })).statusCode,
    ).toBe(204);
    const list = (await call('GET', '/admin/waitlist', chief)).json();
    expect(list.total).toBe(1);
    expect(list.entries[0]).toMatchObject({
      email: 'keen@example.com',
      note: 'I fly MSFS',
      invitedAt: null,
    });

    await inviteOnly();
    const invite = (
      await call('POST', `/admin/waitlist/${list.entries[0].id}/invite`, chief)
    ).json();
    expect(invite).toMatchObject({ maxUses: 1, note: 'Waitlist: keen@example.com' });
    const email = mailer.to('keen@example.com')[0]!;
    expect(email.subject).toBe('You’re invited to the Vector beta');
    expect(email.text).toContain(`https://vector.test/register?invite=${invite.code}`);

    expect((await register('Keen', invite.code)).statusCode).toBe(201);
    const after = (await call('GET', '/admin/waitlist', chief)).json().entries[0];
    expect(after.invitedAt).not.toBeNull();
    expect(after.joined).toBe(true);
    expect((await call('GET', '/admin/waitlist', nosy)).statusCode).toBe(403);
  });

  it('takes feedback from pilots, a few at a time, for admins to work through', async () => {
    const ace = await pilot('Ace');
    expect(
      (await call('POST', '/feedback', undefined, { kind: 'bug', message: 'Hi' })).statusCode,
    ).toBe(401);
    const sent = await call('POST', '/feedback', ace, {
      kind: 'bug',
      message: 'The departure list jumps when I scroll.',
      page: '/scope/new-york',
    });
    expect(sent.statusCode).toBe(204);
    const inbox = (await call('GET', '/admin/feedback', chief)).json();
    expect(inbox.counts).toEqual({ new: 1, read: 0, done: 0 });
    expect(inbox.items[0]).toMatchObject({
      kind: 'bug',
      page: '/scope/new-york',
      device: 'Firefox on macOS',
      from: { handle: 'Ace' },
    });
    await call('PATCH', `/admin/feedback/${inbox.items[0].id}`, chief, { status: 'done' });
    expect((await call('GET', '/admin/feedback?status=done', chief)).json().items).toHaveLength(1);

    for (let i = 0; i < 9; i += 1)
      await call('POST', '/feedback', ace, { kind: 'idea', message: `Idea number ${i}` });
    const tooMany = await call('POST', '/feedback', ace, {
      kind: 'idea',
      message: 'One more idea',
    });
    expect(tooMany.statusCode).toBe(429);
  });
});
