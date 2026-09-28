import { metarResponseSchema } from '@vector/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';
import { metarService } from './weather/metar-service';

// Runs against the real test database (TEST_DATABASE_URL), with a stand-in weather source.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;
const JWT_SECRET = 'integration-test-secret-long-enough-0123456789';
let sourceUp = true;

const app = buildApp({
  checkDatabase: async () => true,
  ...(db
    ? {
        accounts: {
          db,
          auth: { jwtSecret: JWT_SECRET, accessTokenMinutes: 15, refreshTokenDays: 30 },
          secureCookies: false,
          signInRateLimit: 1_000,
          metars: metarService({
            cacheSeconds: 0,
            fetch: () =>
              Promise.resolve(
                sourceUp
                  ? new Response(
                      JSON.stringify([
                        {
                          icaoId: 'KJFK',
                          obsTime: 1790560260,
                          rawOb: 'METAR KJFK 280151Z 03016KT 7SM OVC011 17/16 A2974',
                          wdir: 30,
                          wspd: 16,
                        },
                      ]),
                    )
                  : new Response('', { status: 500 }),
              ),
          }),
        },
      }
    : {}),
});

describe.skipIf(!db)('live weather', () => {
  let headers: { authorization: string };

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    sourceUp = true;
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'wx@example.com', password: 'correct horse battery', displayName: 'Pilot' },
    });
    headers = { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` };
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('returns METARs for signed-in players', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/weather/metar?ids=kjfk,KLGA',
      headers,
    });
    expect(response.statusCode).toBe(200);
    const body = metarResponseSchema.parse(response.json());
    expect(body.observations).toMatchObject([{ icao: 'KJFK', windSpeedKts: 16 }]);
  });

  it('requires sign-in and valid station ids, and reports the source being down', async () => {
    expect(
      (await app.inject({ method: 'GET', url: '/api/weather/metar?ids=KJFK' })).statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ method: 'GET', url: '/api/weather/metar?ids=K$JFK', headers }))
        .statusCode,
    ).toBe(400);
    sourceUp = false;
    const down = await app.inject({ method: 'GET', url: '/api/weather/metar?ids=KJFK', headers });
    expect(down.statusCode).toBe(503);
    expect(down.json()).toMatchObject({ error: { code: 'weather_unavailable' } });
  });
});
