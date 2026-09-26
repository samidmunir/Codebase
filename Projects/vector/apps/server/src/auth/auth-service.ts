import type { AuthResponse, AuthUser } from '@vector/shared';
import type { UserRecord, UsersRepository } from '../users/users-repository';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './passwords';
import type { SessionsRepository } from './sessions-repository';
import { createAccessToken, hashRefreshToken, newRefreshToken } from './tokens';

export interface AuthConfig {
  jwtSecret: string;
  accessTokenMinutes: number;
  refreshTokenDays: number;
}

/** Login failed. One generic error so responses don't reveal which emails have accounts. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email or password is incorrect');
    this.name = 'InvalidCredentialsError';
  }
}

/** The refresh token is missing, expired, revoked or reused. */
export class InvalidSessionError extends Error {
  constructor(readonly reason: 'missing' | 'expired' | 'revoked' | 'reused' | 'stale') {
    super('Your session has ended. Please sign in again.');
    this.name = 'InvalidSessionError';
  }
}

/**
 * A rotated token presented again within this window is most likely a race
 * (two tabs refreshing at once), not theft: reject it without revoking everything.
 */
const ROTATION_GRACE_MS = 30_000;

export interface SignedIn extends AuthResponse {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export const toAuthUser = (user: UserRecord): AuthUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

export function authService(
  users: UsersRepository,
  sessions: SessionsRepository,
  config: AuthConfig,
) {
  async function signIn(user: UserRecord): Promise<SignedIn> {
    const refresh = newRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + config.refreshTokenDays * 86_400_000);
    await sessions.create(user.id, refresh.hash, refreshTokenExpiresAt);
    const access = await createAccessToken(user.id, config.jwtSecret, config.accessTokenMinutes);
    return {
      user: toAuthUser(user),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt,
    };
  }

  return {
    async register(input: {
      email: string;
      password: string;
      displayName: string;
    }): Promise<SignedIn> {
      const user = await users.create({
        email: input.email,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
      });
      return signIn(user);
    },

    async login(input: { email: string; password: string }): Promise<SignedIn> {
      const user = await users.findByEmail(input.email);
      // Always verify a hash, so response time doesn't reveal whether the account exists.
      const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
      if (!user || !valid) throw new InvalidCredentialsError();
      return signIn(user);
    },

    /** Exchanges a refresh token for new tokens, rotating the refresh token. */
    async refresh(refreshToken: string | undefined): Promise<SignedIn> {
      if (!refreshToken) throw new InvalidSessionError('missing');
      const session = await sessions.findByTokenHash(hashRefreshToken(refreshToken));
      if (!session) throw new InvalidSessionError('missing');
      if (session.revokedAt) throw new InvalidSessionError('revoked');
      if (session.rotatedAt) {
        if (Date.now() - session.rotatedAt.getTime() <= ROTATION_GRACE_MS)
          throw new InvalidSessionError('stale');
        // An old token came back long after it was replaced: assume it was stolen.
        await sessions.revokeAllForUser(session.userId);
        throw new InvalidSessionError('reused');
      }
      if (session.expiresAt.getTime() <= Date.now()) throw new InvalidSessionError('expired');
      if (!(await sessions.markRotated(session.id))) throw new InvalidSessionError('stale');

      const user = await users.findById(session.userId);
      if (!user) throw new InvalidSessionError('revoked');
      return signIn(user);
    },

    async logout(refreshToken: string | undefined): Promise<void> {
      if (!refreshToken) return;
      const session = await sessions.findByTokenHash(hashRefreshToken(refreshToken));
      if (session) await sessions.revoke(session.id);
    },
  };
}

export type AuthService = ReturnType<typeof authService>;
