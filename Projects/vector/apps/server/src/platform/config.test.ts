import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const SECRET = 'x'.repeat(32);

describe('loadConfig', () => {
  it('applies defaults for optional values', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost:5432/vector_dev',
      JWT_SECRET: SECRET,
    });

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 4000,
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => loadConfig({ JWT_SECRET: SECRET })).toThrow(/DATABASE_URL/);
  });

  it('requires a long JWT secret', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgres://localhost/vector', JWT_SECRET: 'short' }),
    ).toThrow(/JWT_SECRET must be at least 32 characters/);
  });

  it('drops a trailing slash from CLIENT_ORIGIN, so links don’t get a double slash', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost/vector',
      JWT_SECRET: SECRET,
      CLIENT_ORIGIN: 'https://staging.vector.example/',
    });

    expect(config.CLIENT_ORIGIN).toBe('https://staging.vector.example');
  });

  it('coerces PORT from a string', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost/vector',
      PORT: '4100',
      JWT_SECRET: SECRET,
    });

    expect(config.PORT).toBe(4100);
  });

  it('logs email outside production, and needs Resend set up in production', () => {
    const base = { DATABASE_URL: 'postgres://localhost/vector', JWT_SECRET: SECRET };
    expect(loadConfig(base).EMAIL_DELIVERY).toBe('log');
    const production = { ...base, NODE_ENV: 'production', CLIENT_ORIGIN: 'https://vector.example' };
    expect(() => loadConfig(production)).toThrow(/RESEND_API_KEY/);
    expect(() => loadConfig({ ...production, RESEND_API_KEY: 're_test' })).toThrow(/EMAIL_FROM/);
    expect(
      loadConfig({
        ...production,
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'Vector <hello@example.com>',
      }).EMAIL_DELIVERY,
    ).toBe('resend');
    expect(() => loadConfig({ ...base, EMAIL_DELIVERY: 'outbox' })).toThrow(/EMAIL_OUTBOX_DIR/);
  });

  it('refuses unsafe production settings', () => {
    const production = {
      DATABASE_URL: 'postgres://localhost/vector',
      JWT_SECRET: SECRET,
      NODE_ENV: 'production',
      EMAIL_DELIVERY: 'log',
      CLIENT_ORIGIN: 'https://vector.example',
    };
    expect(loadConfig(production).NODE_ENV).toBe('production');
    expect(() => loadConfig({ ...production, CLIENT_ORIGIN: 'http://vector.example' })).toThrow(
      /https/,
    );
    expect(() =>
      loadConfig({
        ...production,
        JWT_SECRET: 'change-me-to-a-long-random-value-at-least-32-chars',
      }),
    ).toThrow(/JWT_SECRET/);
  });
});
