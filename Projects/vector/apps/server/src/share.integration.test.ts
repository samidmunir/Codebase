import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePerformanceCatalog, SimEngine } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import performanceData from '../../../data/aircraft-types/performance.json';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';

// Runs against the real test database (TEST_DATABASE_URL), with a stand-in client.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const dir = mkdtempSync(join(tmpdir(), 'vector-share-'));
writeFileSync(
  join(dir, 'index.html'),
  `<html><head><title>Vector</title>
    <meta name="description" content="An ATC simulator." />
    <meta property="og:title" content="Vector" />
    <meta property="og:description" content="An ATC simulator." />
    <meta property="og:image" content="/og-image.jpg" />
  </head><body></body></html>`,
);

const app = buildApp({
  checkDatabase: async () => true,
  client: { dir, hsts: false, origin: 'https://vector.test' },
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
          email: { appUrl: 'https://vector.test' },
        },
      }
    : {}),
});

const performance = parsePerformanceCatalog(performanceData);

/** A two-minute session with this RP. */
function session(sessionId: string, rp: number) {
  const engine = SimEngine.create({
    performance,
    world: { magneticVariationDeg: -13 },
    seed: 3,
    startTimeUtc: '2026-10-04T14:00:00Z',
    sessionId,
  });
  for (let i = 0; i < 120; i++) engine.step();
  const data = engine.toSnapshot();
  data.state.score.total = rp;
  data.state.score.tally = { landing: { count: 12, rp } };
  return data;
}

describe.skipIf(!db)('sharing results (integration)', () => {
  let headers: { authorization: string };
  let id: string;

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ace@example.com',
        handle: 'Ace',
        password: 'correct horse battery',
        displayName: 'Ace Controller',
      },
    });
    headers = { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` };
    id = (
      await app.inject({
        method: 'PUT',
        url: '/api/results/s1',
        headers,
        payload: { airspaceId: 'new-york', difficulty: 'hard', snapshot: session('s1', 1240) },
      })
    ).json<{ id: string }>().id;
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
    rmSync(dir, { recursive: true, force: true });
  });

  it('draws a result’s card, and lets it be downloaded', async () => {
    const card = await app.inject({ method: 'GET', url: `/api/share/results/${id}/card.png` });
    expect(card.statusCode).toBe(200);
    expect(card.headers['content-type']).toBe('image/png');
    // A PNG, 1200 × 630.
    expect(card.rawPayload.subarray(1, 4).toString()).toBe('PNG');
    expect(card.rawPayload.readUInt32BE(16)).toBe(1200);
    expect(card.rawPayload.readUInt32BE(20)).toBe(630);
    const download = await app.inject({
      method: 'GET',
      url: `/api/share/results/${id}/card.png?download=1`,
    });
    expect(download.headers['content-disposition']).toContain('attachment');
  });

  it('gives a result’s page its own link preview', async () => {
    const page = (await app.inject({ method: 'GET', url: `/results/${id}` })).body;
    expect(page).toContain('<title>Ace Controller worked N90 New York: +1,240 RP · Vector</title>');
    expect(page).toContain('content="Ace Controller worked N90 New York: +1,240 RP · Vector"');
    expect(page).toMatch(
      /og:description" content="12 arrivals and 0 departures · no losses of separation · Hard · 2 min of sim time\. (Being verified|Verified)/,
    );
    expect(page).toMatch(
      new RegExp(
        `og:image" content="https://vector\\.test/api/share/results/${id}/card\\.png\\?v=\\w+"`,
      ),
    );
    expect(page).toContain(
      `<meta property="og:url" content="https://vector.test/results/${id}" />`,
    );
    expect(page).toContain('<meta property="og:image:width" content="1200" />');
  });

  it('makes every other page’s preview image an absolute address', async () => {
    const page = (await app.inject({ method: 'GET', url: '/records' })).body;
    expect(page).toContain(
      '<meta property="og:image" content="https://vector.test/og-image.jpg" />',
    );
    expect(page).toContain('<meta property="og:url" content="https://vector.test/records" />');
    expect(page).toContain('<title>Vector</title>');
    // A result that doesn't exist previews as the site.
    const missing = (
      await app.inject({ method: 'GET', url: '/results/00000000-0000-4000-8000-000000000000' })
    ).body;
    expect(missing).toContain('<title>Vector</title>');
  });

  it('gives a pilot’s page their career card and preview', async () => {
    const card = await app.inject({ method: 'GET', url: '/api/share/pilots/ace/card.png' });
    expect(card.statusCode).toBe(200);
    expect(card.rawPayload.readUInt32BE(16)).toBe(1200);
    const page = (await app.inject({ method: 'GET', url: '/pilots/Ace' })).body;
    expect(page).toContain('<title>Ace Controller (@Ace) · Vector</title>');
    expect(page).toMatch(
      /og:description" content="\+1,240 RP over 1 session · 12 landings · 2 min controlled/,
    );
    expect(page).toMatch(
      /og:image" content="https:\/\/vector\.test\/api\/share\/pilots\/Ace\/card\.png\?v=1-1240-/,
    );
    expect(
      (await app.inject({ method: 'GET', url: '/api/share/pilots/nobody_here/card.png' }))
        .statusCode,
    ).toBe(404);
  });

  it('draws only so many cards a minute for one address', async () => {
    const url = `/api/share/results/${id}/card.png`;
    const codes = [];
    for (let i = 0; i < 61; i += 1)
      codes.push(
        (await app.inject({ method: 'GET', url, remoteAddress: '203.0.113.9' })).statusCode,
      );
    expect(codes.slice(0, 60).every((code) => code === 200)).toBe(true);
    expect(codes[60]).toBe(429);
    // Others aren't held up.
    expect(
      (await app.inject({ method: 'GET', url, remoteAddress: '203.0.113.10' })).statusCode,
    ).toBe(200);
  });

  it('shares nothing from a private profile', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/api/account',
      headers,
      payload: { profilePublic: false },
    });
    const card = await app.inject({ method: 'GET', url: `/api/share/results/${id}/card.png` });
    expect(card.statusCode).toBe(404);
    expect(
      (await app.inject({ method: 'GET', url: '/api/share/pilots/Ace/card.png' })).statusCode,
    ).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/pilots/Ace' })).body).toContain(
      '<title>Vector</title>',
    );
    expect((await app.inject({ method: 'GET', url: `/results/${id}` })).body).toContain(
      '<title>Vector</title>',
    );
  });
});
