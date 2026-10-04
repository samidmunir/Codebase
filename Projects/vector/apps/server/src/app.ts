import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { MAX_SNAPSHOT_BYTES } from '@vector/shared';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { accountService } from './account/account-service';
import { adminService } from './admin/admin-service';
import { auditRepository } from './admin/audit-repository';
import { airspacesRepository } from './airspaces/airspaces-repository';
import { authService, type AuthConfig } from './auth/auth-service';
import { authenticator } from './auth/authenticate';
import { sessionsRepository } from './auth/sessions-repository';
import type { Database } from './platform/database';
import { accountRoutes } from './routes/account';
import { adminRoutes } from './routes/admin';
import { airspacesRoutes } from './routes/airspaces';
import { authRoutes } from './routes/auth';
import { errorHandler } from './routes/errors';
import { healthRoutes } from './routes/health';
import { sessionsRoutes } from './routes/sessions';
import { settingsRoutes } from './routes/settings';
import { weatherRoutes } from './routes/weather';
import { savedSessionsRepository } from './sessions/sessions-repository';
import { settingsRepository } from './settings/settings-repository';
import { usersRepository } from './users/users-repository';
import { metarService, type MetarService } from './weather/metar-service';

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
    /** Saved sessions allowed per account. Defaults to MAX_SAVED_SESSIONS. */
    savedSessionLimit?: number;
    /** Live METARs; defaults to fetching from aviationweather.gov. */
    metars?: MetarService;
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
        const signIns = sessionsRepository(db);
        const savedSessions = savedSessionsRepository(db);
        const airspaces = airspacesRepository(db);
        const auth = authService(users, signIns, authConfig);
        const authenticate = authenticator(authConfig.jwtSecret, users);
        await api.register(authRoutes, {
          auth,
          users,
          authenticate,
          secureCookies,
          signInRateLimit,
        });
        await api.register(settingsRoutes, { settings: settingsRepository(db), authenticate });
        await api.register(sessionsRoutes, {
          sessions: savedSessions,
          airspaces,
          authenticate,
          bodyLimit: MAX_SNAPSHOT_BYTES,
          ...(deps.accounts.savedSessionLimit ? { limit: deps.accounts.savedSessionLimit } : {}),
        });
        await api.register(weatherRoutes, {
          metars: deps.accounts.metars ?? metarService(),
          authenticate,
        });
        await api.register(airspacesRoutes, { airspaces });
        await api.register(accountRoutes, {
          account: accountService(users, signIns),
          authenticate,
          secureCookies,
        });
        await api.register(adminRoutes, {
          admin: adminService({
            users,
            signIns,
            savedSessions,
            airspaces,
            audit: auditRepository(db),
          }),
          authenticate,
        });
      }
    },
    { prefix: '/api' },
  );

  return app;
}
