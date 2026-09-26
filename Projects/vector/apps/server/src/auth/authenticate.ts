import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './tokens';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set on authenticated routes. */
    userId?: string;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Sign in to continue');
    this.name = 'UnauthorizedError';
  }
}

/** preHandler that requires a valid `Authorization: Bearer <access token>`. */
export function authenticate(jwtSecret: string) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const claims = token ? await verifyAccessToken(token, jwtSecret) : undefined;
    if (!claims) throw new UnauthorizedError();
    request.userId = claims.userId;
  };
}
