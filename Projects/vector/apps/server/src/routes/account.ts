import {
  changePasswordRequestSchema,
  deleteAccountRequestSchema,
  updateProfileRequestSchema,
  type Account,
  type HandleAvailability,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AccountService } from '../account/account-service';
import type { Authenticator } from '../auth/authenticate';
import { REFRESH_COOKIE, refreshCookieOptions } from './auth';

export interface AccountRouteOptions {
  account: AccountService;
  authenticate: Authenticator;
  secureCookies: boolean;
}

const handleParams = z.object({ handle: z.string().max(40) });

/**
 * A pilot's own account. Password changes and "sign out other devices" are under
 * /api/auth, where the refresh cookie (which identifies this device) is sent.
 */
export async function accountRoutes(app: FastifyInstance, options: AccountRouteOptions) {
  const { account } = options;
  const preHandler = options.authenticate.user;

  app.get('/account', { preHandler }, async (request): Promise<Account> =>
    account.get(request.userId!),
  );

  app.patch('/account', { preHandler }, async (request): Promise<Account> =>
    account.updateProfile(request.userId!, updateProfileRequestSchema.parse(request.body)),
  );

  app.delete('/account', { preHandler }, async (request, reply) => {
    await account.delete(request.userId!, deleteAccountRequestSchema.parse(request.body));
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(options.secureCookies));
    return reply.code(204).send();
  });

  app.post('/auth/password', { preHandler }, async (request, reply) => {
    await account.changePassword(
      request.userId!,
      changePasswordRequestSchema.parse(request.body),
      request.cookies[REFRESH_COOKIE],
    );
    return reply.code(204).send();
  });

  app.post('/auth/sign-out-others', { preHandler }, async (request, reply) => {
    await account.signOutOthers(request.userId!, request.cookies[REFRESH_COOKIE]);
    return reply.code(204).send();
  });

  /** Whether a handle is free (for the registration and account forms). */
  app.get(
    '/handles/:handle',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request): Promise<HandleAvailability> => {
      const { handle } = handleParams.parse(request.params);
      return account.handleAvailability(handle);
    },
  );
}
