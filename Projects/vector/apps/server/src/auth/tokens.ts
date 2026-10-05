import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

// Access tokens: short-lived JWTs (HS256) kept in client memory.
// Refresh tokens: random 256-bit values in an HttpOnly cookie; only their SHA-256 hash is stored.

const ISSUER = 'vector';
const AUDIENCE = 'vector-client';

export interface AccessTokenClaims {
  userId: string;
}

export async function createAccessToken(
  userId: string,
  secret: string,
  minutes: number,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(now.getTime() + minutes * 60_000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(secret));
  return { token, expiresAt };
}

/** Returns the claims, or undefined if the token is invalid or expired. */
export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenClaims | undefined> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    return payload.sub ? { userId: payload.sub } : undefined;
  } catch {
    return undefined;
  }
}

export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
