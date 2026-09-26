import { loginRequestSchema, registerRequestSchema, type AuthResponse } from '@vector/shared';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { toAuthUser, type AuthService, type SignedIn } from '../auth/auth-service';
import { authenticate } from '../auth/authenticate';
import type { UsersRepository } from '../users/users-repository';

export const REFRESH_COOKIE = 'vector_refresh';

/** The refresh cookie is only sent to the auth routes, never readable by scripts. */
export function refreshCookieOptions(secure: boolean, expires?: Date): CookieSerializeOptions {
  return {
    path: '/api/auth',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    ...(expires ? { expires } : {}),
  };
}

export interface AuthRouteOptions {
  auth: AuthService;
  users: UsersRepository;
  jwtSecret: string;
  secureCookies: boolean;
  /** Sign-in attempts allowed per IP per minute. */
  signInRateLimit: number;
}

export async function authRoutes(app: FastifyInstance, options: AuthRouteOptions) {
  const AUTH_RATE_LIMIT = { max: options.signInRateLimit, timeWindow: '1 minute' };
  const respond = (reply: FastifyReply, signedIn: SignedIn, status = 200): AuthResponse => {
    reply.setCookie(
      REFRESH_COOKIE,
      signedIn.refreshToken,
      refreshCookieOptions(options.secureCookies, signedIn.refreshTokenExpiresAt),
    );
    reply.code(status);
    return {
      user: signedIn.user,
      accessToken: signedIn.accessToken,
      accessTokenExpiresAt: signedIn.accessTokenExpiresAt,
    };
  };

  app.post('/auth/register', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) =>
    respond(reply, await options.auth.register(registerRequestSchema.parse(request.body)), 201),
  );

  app.post('/auth/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) =>
    respond(reply, await options.auth.login(loginRequestSchema.parse(request.body))),
  );

  app.post('/auth/refresh', async (request, reply) =>
    respond(reply, await options.auth.refresh(request.cookies[REFRESH_COOKIE])),
  );

  app.post('/auth/logout', async (request, reply) => {
    await options.auth.logout(request.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(options.secureCookies));
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: authenticate(options.jwtSecret) }, async (request, reply) => {
    const user = await options.users.findById(request.userId!);
    if (!user)
      return reply
        .code(401)
        .send({ error: { code: 'unauthorized', message: 'Sign in to continue' } });
    return { user: toAuthUser(user) };
  });
}
