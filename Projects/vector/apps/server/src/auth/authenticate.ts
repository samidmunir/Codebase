import type { UserRole } from '@vector/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UsersRepository } from '../users/users-repository';
import { verifyAccessToken } from './tokens';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set on authenticated routes. */
    userId?: string;
    /** The signed-in account, as it is now in the database. */
    account?: { id: string; email: string; role: UserRole };
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Sign in to continue');
    this.name = 'UnauthorizedError';
  }
}

/** Signed in, but not allowed (an admin route for a player). */
export class ForbiddenError extends Error {
  constructor() {
    super('Only administrators can do that');
    this.name = 'ForbiddenError';
  }
}

export type PreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export interface Authenticator {
  /** Requires a valid access token for an account that still exists and isn't disabled. */
  user: PreHandler;
  /** As `user` when there is a valid access token; otherwise carries on signed out. */
  optional: PreHandler;
  /** As `user`, and the account must be an admin. */
  admin: PreHandler;
}

/**
 * Builds the preHandlers for signed-in routes. The account is read from the
 * database on every request, so a deleted, disabled or demoted account loses
 * access at once rather than when its access token expires.
 */
export function authenticator(jwtSecret: string, users: UsersRepository): Authenticator {
  const user: PreHandler = async (request) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const claims = token ? await verifyAccessToken(token, jwtSecret) : undefined;
    if (!claims) throw new UnauthorizedError();
    const account = await users.findById(claims.userId);
    if (!account || account.disabledAt) throw new UnauthorizedError();
    request.userId = account.id;
    request.account = { id: account.id, email: account.email, role: account.role };
  };
  return {
    user,
    async optional(request, reply) {
      if (!request.headers.authorization) return;
      try {
        await user(request, reply);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) throw error;
      }
    },
    async admin(request, reply) {
      await user(request, reply);
      if (request.account?.role !== 'admin') throw new ForbiddenError();
    },
  };
}
