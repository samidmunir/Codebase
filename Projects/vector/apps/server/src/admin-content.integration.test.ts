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

async function register(handle: string, role?: 'admin' | 'moderator'): Promise<Pilot> {
  const email = `${handle.toLowerCase()}@example.com`;
  const first = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, handle, password: 'correct horse battery', displayName: handle },
  });
  const id = first.json<{ user: { id: string } }>().user.id;
  await db!.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [id]);
  if (role) await db!.query('UPDATE users SET role = $2 WHERE id = $1', [id, role]);
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'correct horse battery' },
  });
  return {
    id,
    headers: { authorization: `Bearer ${login.json<{ accessToken: string }>().accessToken}` },
  };
}

const call = (
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  as: Pilot,
  payload?: object,
) =>
  app.inject({ method, url: `/api${url}`, headers: as.headers, ...(payload ? { payload } : {}) });

async function thread(as: Pilot, categoryId: string, title: string, body = 'Hello there') {
  const response = await call('POST', '/community/threads', as, { categoryId, title, body });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: number }>().id;
}

const actions = async () =>
  (
    await db!.query<{ action: string }>(
      'SELECT action FROM admin_audit_log ORDER BY created_at, id',
    )
  ).rows.map((row) => row.action);

describe.skipIf(!db)('site-wide content (integration)', () => {
  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    await db!.query('TRUNCATE released_handles');
    await db!.query('TRUNCATE forum_threads CASCADE');
    await db!.query('TRUNCATE admin_audit_log');
    await db!.query(
      "DELETE FROM forum_categories WHERE id NOT IN ('announcements', 'general', 'airspaces', 'techniques', 'bug-reports', 'feature-requests')",
    );
  });

  afterAll(async () => {
    await db?.query(
      "DELETE FROM forum_categories WHERE id NOT IN ('announcements', 'general', 'airspaces', 'techniques', 'bug-reports', 'feature-requests')",
    );
    await app.close();
    await db?.end();
  });

  it('lets admins create, edit, reorder and delete categories', async () => {
    const chief = await register('Chief', 'admin');
    const morgan = await register('Morgan', 'moderator');
    const payload = {
      id: 'Tower-Talk',
      name: 'Tower talk',
      description: 'Ground, tower and ramp.',
    };
    expect((await call('POST', '/admin/community/categories', morgan, payload)).statusCode).toBe(
      403,
    );
    const created = await call('POST', '/admin/community/categories', chief, payload);
    expect(created.statusCode).toBe(201);
    const ids = created.json().categories.map((c: { id: string }) => c.id);
    expect(ids.at(-1)).toBe('tower-talk');
    expect((await call('POST', '/admin/community/categories', chief, payload)).statusCode).toBe(
      409,
    );
    expect(
      (await call('POST', '/admin/community/categories', chief, { ...payload, id: 'Not ok!' }))
        .statusCode,
    ).toBe(400);

    await call('PATCH', '/admin/community/categories/tower-talk', chief, {
      name: 'Tower & ground',
      adminOnly: true,
      move: -1,
    });
    const overview = (await call('GET', '/community', chief)).json();
    const ordered = overview.categories.map((c: { id: string }) => c.id);
    expect(ordered.slice(-2)).toEqual(['tower-talk', 'feature-requests']);
    expect(overview.categories.find((c: { id: string }) => c.id === 'tower-talk')).toMatchObject({
      name: 'Tower & ground',
      adminOnly: true,
    });

    // A category with threads goes only once they have somewhere to go.
    await thread(chief, 'tower-talk', 'Ramp frequencies');
    const refused = await call('DELETE', '/admin/community/categories/tower-talk', chief);
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('category_not_empty');
    const deleted = await call('DELETE', '/admin/community/categories/tower-talk', chief, {
      moveTo: 'general',
    });
    expect(deleted.statusCode).toBe(204);
    const general = (await call('GET', '/community/categories/general', chief)).json();
    expect(general.threads.map((t: { title: string }) => t.title)).toEqual(['Ramp frequencies']);
    expect(await actions()).toEqual([
      'forum.createCategory',
      'forum.updateCategory',
      'forum.deleteCategory',
    ]);
  });

  it('lets staff search every thread and post, and rewrite any post', async () => {
    await register('Chief', 'admin');
    const morgan = await register('Morgan', 'moderator');
    const ace = await register('Ace');
    const bravo = await register('Bravo');
    const first = await thread(ace, 'techniques', 'Spacing on the ILS', 'Use speed early');
    await thread(bravo, 'general', 'Hello all', 'New here');
    const reply = await call('POST', `/community/threads/${first}/posts`, bravo, {
      body: 'Something rude about vectors',
    });
    const replyId = reply.json<{ id: number }>().id;
    await call('POST', `/community/posts/${replyId}/report`, ace, { reason: 'Rude' });

    const threads = (await call('GET', '/admin/community/threads?q=ils', morgan)).json();
    expect(threads.threads.map((t: { title: string }) => t.title)).toEqual(['Spacing on the ILS']);
    expect(threads.threads[0]).toMatchObject({ replies: 1, openReports: 1 });
    const inGeneral = (
      await call('GET', '/admin/community/threads?category=general', morgan)
    ).json();
    expect(inGeneral.total).toBe(1);

    const byBravo = (await call('GET', '/admin/community/posts?author=Bravo', morgan)).json();
    expect(byBravo.total).toBe(2);
    const reported = (await call('GET', '/admin/community/posts?state=reported', morgan)).json();
    expect(reported.posts.map((p: { id: number }) => p.id)).toEqual([replyId]);
    const found = (await call('GET', '/admin/community/posts?q=vectors', morgan)).json();
    expect(found.posts[0]).toMatchObject({ opening: false, thread: { id: first } });
    expect((await call('GET', '/admin/community/posts', ace)).statusCode).toBe(403);

    const edit = await call('PUT', `/admin/community/posts/${replyId}/body`, morgan, {
      body: '[Removed by a moderator]',
    });
    expect(edit.statusCode).toBe(204);
    const shown = (await call('GET', `/community/threads/${first}`, ace)).json();
    expect(shown.posts[1]).toMatchObject({ body: '[Removed by a moderator]' });
    expect(shown.posts[1].editedAt).not.toBeNull();
    const { rows } = await db!.query<{ details: { before: string; author: string } }>(
      "SELECT details FROM admin_audit_log WHERE action = 'forum.editPost'",
    );
    expect(rows[0]!.details).toMatchObject({
      before: 'Something rude about vectors',
      author: 'Bravo',
    });
    expect((await call('GET', '/admin/community/posts?state=edited', morgan)).json().total).toBe(1);
  });

  it('lists every saved session, and filters and hides results for the records', async () => {
    const chief = await register('Chief', 'admin');
    const ace = await register('Ace');
    await db!.query(
      `INSERT INTO saved_sessions (user_id, name, airspace_id, snapshot, snapshot_version,
         sim_time_sec, aircraft_count, rp)
       VALUES ($1, 'JFK rush', 'new-york', '{"state": {}}', 1, 1800, 12, 120),
              ($1, 'Quiet Chicago', 'chicago', '{"state": {}}', 1, 600, 3, 10)`,
      [ace.id],
    );
    const sessions = (await call('GET', '/admin/sessions?q=ace', chief)).json();
    expect(sessions.total).toBe(2);
    expect(sessions.totalBytes).toBeGreaterThan(0);
    expect(sessions.sessions[0].owner).toMatchObject({ handle: 'Ace' });
    expect((await call('GET', '/admin/sessions?airspace=chicago', chief)).json().total).toBe(1);
    expect((await call('GET', '/admin/sessions', ace)).statusCode).toBe(403);

    for (const [key, airspace, rp] of [
      ['a', 'new-york', 50],
      ['b', 'chicago', 90],
      ['c', 'chicago', 20],
    ] as const)
      await db!.query(
        `INSERT INTO session_results (user_id, session_key, airspace_id, difficulty, sim_time_sec,
           final_tick, rp, stats, report, verification)
         VALUES ($1, $2, $3, 'hard', 1800, 1800, $4, '{}', '{}', 'verified')`,
        [ace.id, key, airspace, rp],
      );
    const chicago = (
      await call('GET', '/admin/results?airspace=chicago&sort=rp&difficulty=hard', chief)
    ).json();
    expect(chicago.results.map((r: { rp: number }) => r.rp)).toEqual([90, 20]);
    expect(chicago.results[0]).toMatchObject({ handle: 'Ace', userId: ace.id, onRecords: true });

    const hidden = await call('POST', '/admin/results/bulk', chief, {
      ids: chicago.results.map((r: { id: string }) => r.id),
      hidden: true,
    });
    expect(hidden.json()).toEqual({ done: 2 });
    expect((await call('GET', '/admin/results?hidden=true', chief)).json().total).toBe(2);
  });
});
