import { loginRequestSchema, registerRequestSchema, type AuthResponse } from '@vector/shared';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { toAuthUser, type AuthService, type SignedIn } from '../auth/auth-service';
import type { Authenticator } from '../auth/authenticate';
import { hashRefreshToken } from '../auth/tokens';
import type { ClientInfo, SessionsRepository } from '../auth/sessions-repository';
import type { UsersRepository } from '../users/users-repository';

export const REFRESH_COOKIE = 'vector_refresh';

/** Which device a request comes from. */
export const clientInfo = (request: FastifyRequest): ClientInfo => ({
  userAgent: request.headers['user-agent'],
  ip: request.ip,
});

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
  authenticate: Authenticator;
  secureCookies: boolean;
  /** Sign-in attempts allowed per IP per minute. */
  signInRateLimit: number;
  /** Runs once an account is created (sends the verification email). */
  onRegistered?: (userId: string) => Promise<void>;
  signIns: SessionsRepository;
}

const signInParams = z.object({ id: z.uuid() });

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

  app.post('/auth/register', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const signedIn = await options.auth.register(
      registerRequestSchema.parse(request.body),
      clientInfo(request),
    );
    await options.onRegistered?.(signedIn.user.id);
    return respond(reply, signedIn, 201);
  });

  app.post('/auth/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) =>
    respond(
      reply,
      await options.auth.login(loginRequestSchema.parse(request.body), clientInfo(request)),
    ),
  );

  app.post('/auth/refresh', async (request, reply) =>
    respond(
      reply,
      await options.auth.refresh(request.cookies[REFRESH_COOKIE], clientInfo(request)),
    ),
  );

  app.post('/auth/logout', async (request, reply) => {
    await options.auth.logout(request.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(options.secureCookies));
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: options.authenticate.user }, async (request, reply) => {
    const user = await options.users.findById(request.userId!);
    if (!user)
      return reply
        .code(401)
        .send({ error: { code: 'unauthorized', message: 'Sign in to continue' } });
    return { user: toAuthUser(user) };
  });

  // The pilot's own sign-ins (here, where the refresh cookie says which is this device).
  app.get('/auth/sign-ins', { preHandler: options.authenticate.user }, async (request) => {
    const token = request.cookies[REFRESH_COOKIE];
    const current = token
      ? await options.signIns.findByTokenHash(hashRefreshToken(token))
      : undefined;
    const signIns = await options.signIns.listActive(request.userId!);
    return {
      signIns: signIns.map((signIn) => ({ ...signIn, current: signIn.id === current?.familyId })),
    };
  });

  app.delete(
    '/auth/sign-ins/:id',
    { preHandler: options.authenticate.user },
    async (request, reply) => {
      const { id } = signInParams.parse(request.params);
      await options.signIns.revokeFamily(request.userId!, id);
      return reply.code(204).send();
    },
  );
}
