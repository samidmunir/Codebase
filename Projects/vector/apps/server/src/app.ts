import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { authService, type AuthConfig } from './auth/auth-service';
import { sessionsRepository } from './auth/sessions-repository';
import type { Database } from './platform/database';
import { authRoutes } from './routes/auth';
import { errorHandler } from './routes/errors';
import { healthRoutes } from './routes/health';
import { settingsRoutes } from './routes/settings';
import { settingsRepository } from './settings/settings-repository';
import { usersRepository } from './users/users-repository';

export const API_VERSION = '0.0.0';

export interface AppDependencies {
  checkDatabase: () => Promise<boolean>;
  /** Accounts and settings; omitted in tests that only need health checks. */
  accounts?: {
    db: Database;
    auth: AuthConfig;
    /** Mark cookies Secure (true in production, behind HTTPS). */
    secureCookies: boolean;
    /** Sign-in attempts allowed per IP per minute (register and login). Defaults to 10. */
    signInRateLimit?: number;
  };
}

export function buildApp(deps: AppDependencies, options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  app.setErrorHandler(errorHandler);

  app.register(
    async (api) => {
      await api.register(healthRoutes, { version: API_VERSION, checkDatabase: deps.checkDatabase });

      if (deps.accounts) {
        const { db, auth: authConfig, secureCookies, signInRateLimit = 10 } = deps.accounts;
        await api.register(cookie);
        await api.register(rateLimit, { global: false });
        const users = usersRepository(db);
        const auth = authService(users, sessionsRepository(db), authConfig);
        await api.register(authRoutes, {
          auth,
          users,
          jwtSecret: authConfig.jwtSecret,
          secureCookies,
          signInRateLimit,
        });
        await api.register(settingsRoutes, {
          settings: settingsRepository(db),
          jwtSecret: authConfig.jwtSecret,
        });
      }
    },
    { prefix: '/api' },
  );

  return app;
}
