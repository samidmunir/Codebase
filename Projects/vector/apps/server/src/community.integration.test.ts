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
  handle: string;
  headers: { authorization: string };
}

async function register(handle: string, options: { verified?: boolean } = {}): Promise<Pilot> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: `${handle.toLowerCase()}@example.com`,
      handle,
      password: 'correct horse battery',
      displayName: `${handle} Pilot`,
    },
  });
  const body = response.json<{ accessToken: string; user: { id: string } }>();
  if (options.verified ?? true)
    await db!.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [body.user.id]);
  return { id: body.user.id, handle, headers: { authorization: `Bearer ${body.accessToken}` } };
}

const request = (
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  pilot?: Pilot,
  payload?: object,
) =>
  app.inject({
    method,
    url: `/api${url}`,
    ...(pilot ? { headers: pilot.headers } : {}),
    ...(payload ? { payload } : {}),
  });

async function newThread(pilot: Pilot, title = 'Sequencing 22L at JFK', category = 'techniques') {
  const response = await request('POST', '/community/threads', pilot, {
    categoryId: category,
    title,
    body: 'How do you **space** the rush?',
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: number; slug: string }>();
}

const reply = (pilot: Pilot, threadId: number, body = 'Speed control early.') =>
  request('POST', `/community/threads/${threadId}/posts`, pilot, { body });

const thread = async (id: number, pilot?: Pilot) =>
  (await request('GET', `/community/threads/${id}`, pilot)).json<{
    thread: { title: string; replies: number; views: number; following: boolean; unread: boolean };
    posts: {
      id: number;
      body: string | null;
      hidden: boolean;
      author: { handle: string } | null;
      useful: number;
      usefulByYou: boolean;
      canEdit: boolean;
      opening: boolean;
      editedAt: string | null;
    }[];
    posting: { allowed: boolean; reason?: string };
  }>();

/** Lets a pilot post freely: past the new-poster limits, as if they'd posted a while. */
async function establish(pilot: Pilot) {
  const { id } = await newThread(pilot, `Warm-up for ${pilot.handle}`, 'general');
  for (let i = 0; i < 3; i += 1) expect((await reply(pilot, id, `Note ${i}`)).statusCode).toBe(201);
  await db!.query(
    "UPDATE forum_posts SET created_at = now() - interval '2 hours' WHERE author_id = $1",
    [pilot.id],
  );
}

async function makeAdmin(pilot: Pilot) {
  await db!.query("UPDATE users SET role = 'admin' WHERE id = $1", [pilot.id]);
}

describe.skipIf(!db)('community (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    await db!.query('TRUNCATE forum_threads CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('lets anyone read, and verified pilots start threads and reply', async () => {
    const overview = (await request('GET', '/community')).json();
    expect(overview.categories.map((c: { id: string }) => c.id)).toEqual([
      'announcements',
      'general',
      'airspaces',
      'techniques',
      'bug-reports',
      'feature-requests',
    ]);

    const unverified = await register('Rookie', { verified: false });
    const refused = await request('POST', '/community/threads', unverified, {
      categoryId: 'general',
      title: 'Hello',
      body: 'Hi all',
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.code).toBe('forum_unverified');

    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const created = await newThread(ace);
    expect(created.slug).toBe('sequencing-22l-at-jfk');
    expect((await reply(bravo, created.id)).statusCode).toBe(201);

    const visitor = await thread(created.id);
    expect(visitor.thread).toMatchObject({ title: 'Sequencing 22L at JFK', replies: 1 });
    expect(visitor.posts.map((p) => p.author?.handle)).toEqual(['Ace', 'Bravo']);
    expect(visitor.posts[0]).toMatchObject({ opening: true, canEdit: false });
    expect(visitor.posting).toMatchObject({ allowed: false, reason: 'signedOut' });
    expect((await thread(created.id, unverified)).posting).toMatchObject({
      allowed: false,
      reason: 'unverified',
    });

    const category = (await request('GET', '/community/categories/techniques')).json();
    expect(category.threads).toHaveLength(1);
    expect(category.category).toMatchObject({ threads: 1, posts: 2 });
    expect((await request('GET', '/community/categories/nope')).statusCode).toBe(404);
  });

  it('marks what’s new to you, and follows threads you post in', async () => {
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const { id } = await newThread(ace);
    const listed = async (pilot: Pilot) =>
      (await request('GET', '/community/categories/techniques', pilot)).json().threads[0];

    // A new thread is new to Bravo until he opens it.
    expect((await listed(bravo)).unread).toBe(true);
    await thread(id, bravo);
    expect((await listed(bravo)).unread).toBe(false);
    expect((await listed(ace)).unread).toBe(false);

    await reply(bravo, id);
    expect((await listed(ace)).unread).toBe(true);
    const following = (await request('GET', '/community/following', ace)).json();
    expect(following).toMatchObject({ unread: 1 });
    expect(following.threads[0].id).toBe(id);
    expect((await thread(id, bravo)).thread.following).toBe(true);

    await thread(id, ace);
    expect((await request('GET', '/community/following', ace)).json().unread).toBe(0);
    expect((await request('DELETE', `/community/threads/${id}/follow`, ace)).statusCode).toBe(204);
    expect((await request('GET', '/community/following', ace)).json().threads).toHaveLength(0);
  });

  it('limits new posters: no links to other sites at first, and new accounts a few posts an hour', async () => {
    const ace = await register('Ace');
    const { id } = await newThread(ace, 'First thread', 'general');
    const link = await reply(ace, id, 'See https://example.com for more');
    expect(link.statusCode).toBe(400);
    expect(link.json().error.code).toBe('forum_links');
    expect((await reply(ace, id, 'Links [inside Vector](/guide) are fine')).statusCode).toBe(201);
    expect((await reply(ace, id, 'Third')).statusCode).toBe(201);
    // After three posts, links are fine.
    expect((await reply(ace, id, 'See https://example.com')).statusCode).toBe(201);
    expect((await reply(ace, id, 'Fifth')).statusCode).toBe(201);
    const sixth = await reply(ace, id, 'Sixth');
    expect(sixth.statusCode).toBe(429);
    expect(sixth.json().error.code).toBe('forum_rateLimited');

    // An hour later they can post again; an older account gets more.
    await db!.query("UPDATE forum_posts SET created_at = now() - interval '2 hours'");
    await db!.query("UPDATE users SET created_at = now() - interval '4 days'");
    for (let i = 0; i < 6; i += 1) expect((await reply(ace, id, `More ${i}`)).statusCode).toBe(201);
  });

  it('keeps Announcements for admins, and locked threads closed to replies', async () => {
    const ace = await register('Ace');
    const chief = await register('Chief');
    await makeAdmin(chief);
    const refused = await request('POST', '/community/threads', ace, {
      categoryId: 'announcements',
      title: 'Not mine to post',
      body: 'Hi',
    });
    expect(refused.json().error.code).toBe('forum_adminOnly');
    const { id } = await newThread(chief, 'Dallas is open', 'announcements');
    expect((await reply(ace, id, 'Great!')).statusCode).toBe(201);

    const locked = await request('PATCH', `/admin/community/threads/${id}`, chief, {
      locked: true,
      pinned: true,
    });
    expect(locked.statusCode).toBe(204);
    expect((await reply(ace, id, 'One more')).json().error.code).toBe('forum_locked');
    expect((await thread(id, ace)).posting).toMatchObject({ allowed: false, reason: 'locked' });
    expect((await reply(chief, id, 'Admins still can')).statusCode).toBe(201);
    expect(
      (await request('PATCH', `/admin/community/threads/${id}`, ace, { locked: false })).statusCode,
    ).toBe(403);
  });

  it('lets authors edit for a day, and anyone else mark posts useful', async () => {
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const { id } = await newThread(ace);
    const opening = (await thread(id, ace)).posts[0]!;
    expect(opening.canEdit).toBe(true);

    const edited = await request('PATCH', `/community/posts/${opening.id}`, ace, {
      body: 'Edited: how do you space it?',
    });
    expect(edited.json()).toMatchObject({ body: 'Edited: how do you space it?' });
    expect(edited.json().editedAt).not.toBeNull();
    expect(
      (await request('PATCH', `/community/posts/${opening.id}`, bravo, { body: 'Mine now' }))
        .statusCode,
    ).toBe(403);
    await db!.query("UPDATE forum_posts SET created_at = now() - interval '25 hours'");
    expect(
      (await request('PATCH', `/community/posts/${opening.id}`, ace, { body: 'Too late' }))
        .statusCode,
    ).toBe(403);

    expect((await request('PUT', `/community/posts/${opening.id}/useful`, bravo)).statusCode).toBe(
      204,
    );
    expect((await request('PUT', `/community/posts/${opening.id}/useful`, bravo)).statusCode).toBe(
      204,
    );
    expect((await request('PUT', `/community/posts/${opening.id}/useful`, ace)).statusCode).toBe(
      403,
    );
    expect((await thread(id, bravo)).posts[0]).toMatchObject({ useful: 1, usefulByYou: true });
    await request('DELETE', `/community/posts/${opening.id}/useful`, bravo);
    expect((await thread(id)).posts[0]!.useful).toBe(0);
  });

  it('takes reports, and lets admins hide, delete and audit', async () => {
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const chief = await register('Chief');
    await makeAdmin(chief);
    await establish(bravo);
    const { id } = await newThread(ace);
    const bad = (await reply(bravo, id, 'Something rude')).json<{ id: number }>();

    expect(
      (await request('POST', `/community/posts/${bad.id}/report`, ace, { reason: 'Rude' }))
        .statusCode,
    ).toBe(204);
    // Reporting twice adds nothing.
    await request('POST', `/community/posts/${bad.id}/report`, ace, { reason: 'Still rude' });
    expect((await request('GET', '/admin/community/reports', ace)).statusCode).toBe(403);
    const reports = (await request('GET', '/admin/community/reports', chief)).json().reports;
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      reason: 'Rude',
      reporter: { handle: 'Ace' },
      post: { id: bad.id, author: { handle: 'Bravo' } },
      thread: { id },
    });

    await request('PATCH', `/admin/community/posts/${bad.id}`, chief, { hidden: true });
    expect((await thread(id)).posts[1]).toMatchObject({ hidden: true, body: null });
    expect((await thread(id, chief)).posts[1]).toMatchObject({
      hidden: true,
      body: 'Something rude',
    });
    expect((await request('GET', '/admin/community/reports', chief)).json().reports).toHaveLength(
      0,
    );

    const opening = (await thread(id)).posts[0]!.id;
    expect((await request('DELETE', `/admin/community/posts/${opening}`, chief)).statusCode).toBe(
      409,
    );
    expect((await request('DELETE', `/admin/community/posts/${bad.id}`, chief)).statusCode).toBe(
      204,
    );
    expect((await thread(id)).posts).toHaveLength(1);

    await request('PATCH', `/admin/community/threads/${id}`, chief, { categoryId: 'general' });
    expect((await request('GET', `/community/threads/${id}`)).json().thread.categoryId).toBe(
      'general',
    );
    expect((await request('DELETE', `/admin/community/threads/${id}`, chief)).statusCode).toBe(204);
    expect((await request('GET', `/community/threads/${id}`)).statusCode).toBe(404);

    const { rows } = await db!.query<{ action: string }>(
      "SELECT action FROM admin_audit_log WHERE action LIKE 'forum.%' ORDER BY created_at",
    );
    expect(rows.map((row) => row.action)).toEqual([
      'forum.hidePost',
      'forum.deletePost',
      'forum.updateThread',
      'forum.deleteThread',
    ]);
  });

  it('suspends a pilot from posting for a time or for good', async () => {
    const ace = await register('Ace');
    const chief = await register('Chief');
    await makeAdmin(chief);
    const { id } = await newThread(ace);
    const suspend = (postingSuspension: number | 'forever' | 'lift') =>
      request('PATCH', `/admin/users/${ace.id}`, chief, { postingSuspension });

    const week = await suspend(7);
    expect(week.json().postingSuspendedUntil).toMatch(/^\d{4}-/);
    const refused = await reply(ace, id);
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.message).toMatch(/suspended from posting until/);
    expect((await thread(id, ace)).posting).toMatchObject({ allowed: false, reason: 'suspended' });

    expect((await suspend('forever')).json().postingSuspendedUntil).toBe('forever');
    expect((await reply(ace, id)).json().error.message).toBe('You’re suspended from posting');
    expect((await suspend('lift')).json().postingSuspendedUntil).toBeNull();
    expect((await reply(ace, id)).statusCode).toBe(201);
  });

  it('shows a deleted pilot’s posts without them, and only shares your own sessions', async () => {
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const { id } = await newThread(ace);
    const other = await request('POST', '/community/threads', bravo, {
      categoryId: 'general',
      title: 'Look at this one',
      body: 'Nice session',
      resultId: '00000000-0000-4000-8000-000000000000',
    });
    expect(other.json().error.code).toBe('forum_result');

    await db!.query('DELETE FROM users WHERE id = $1', [ace.id]);
    const after = await thread(id);
    expect(after.posts[0]!.author).toBeNull();
    expect(after.posts[0]!.body).toBe('How do you **space** the rush?');
  });
});
