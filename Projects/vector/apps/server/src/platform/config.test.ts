import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('applies defaults for optional values', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://localhost:5432/vector_dev' });

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 4000,
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('coerces PORT from a string', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://localhost/vector', PORT: '4100' });

    expect(config.PORT).toBe(4100);
  });
});
