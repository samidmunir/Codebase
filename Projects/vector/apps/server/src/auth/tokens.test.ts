import { describe, expect, it } from 'vitest';
import { createAccessToken, hashRefreshToken, newRefreshToken, verifyAccessToken } from './tokens';

const SECRET = 'test-secret-that-is-long-enough-1234567890';

describe('access tokens', () => {
  it('round-trips the user id', async () => {
    const { token } = await createAccessToken('user-1', SECRET, 15);
    expect(await verifyAccessToken(token, SECRET)).toEqual({ userId: 'user-1' });
  });

  it('rejects tokens signed with another secret', async () => {
    const { token } = await createAccessToken('user-1', SECRET, 15);
    expect(await verifyAccessToken(token, `${SECRET}x`)).toBeUndefined();
  });

  it('rejects expired tokens', async () => {
    const { token } = await createAccessToken(
      'user-1',
      SECRET,
      1,
      new Date(Date.now() - 10 * 60_000),
    );
    expect(await verifyAccessToken(token, SECRET)).toBeUndefined();
  });

  it('rejects garbage', async () => {
    expect(await verifyAccessToken('not.a.token', SECRET)).toBeUndefined();
  });
});

describe('refresh tokens', () => {
  it('are random and stored only as a hash', () => {
    const a = newRefreshToken();
    const b = newRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashRefreshToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });
});
