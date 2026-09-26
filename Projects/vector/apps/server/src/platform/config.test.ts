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

  it('coerces PORT from a string', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost/vector',
      PORT: '4100',
      JWT_SECRET: SECRET,
    });

    expect(config.PORT).toBe(4100);
  });
});
