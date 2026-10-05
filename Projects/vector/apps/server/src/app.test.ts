import { healthResponseSchema, readinessResponseSchema } from '@vector/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('health routes', () => {
  let app: ReturnType<typeof buildApp> | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('GET /api/health reports the service is up', async () => {
    app = buildApp({ checkDatabase: async () => true });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).service).toBe('vector-api');
  });

  it('GET /api/health/ready returns 200 when the database is reachable', async () => {
    app = buildApp({ checkDatabase: async () => true });

    const response = await app.inject({ method: 'GET', url: '/api/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(readinessResponseSchema.parse(response.json())).toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('GET /api/health/ready returns 503 when the database is unreachable', async () => {
    app = buildApp({ checkDatabase: async () => false });

    const response = await app.inject({ method: 'GET', url: '/api/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable', checks: { database: 'down' } });
  });
});
