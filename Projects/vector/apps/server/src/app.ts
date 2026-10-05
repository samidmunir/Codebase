import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { MAX_SNAPSHOT_BYTES } from '@vector/shared';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { accountService } from './account/account-service';
import { adminService } from './admin/admin-service';
import { auditRepository } from './admin/audit-repository';
import { statsRepository } from './admin/stats-repository';
import { userDetailRepository } from './admin/user-detail-repository';
import { airspacesRepository } from './airspaces/airspaces-repository';
import { authService, type AuthConfig } from './auth/auth-service';
import { authenticator } from './auth/authenticate';
import { sessionsRepository } from './auth/sessions-repository';
import { emailService } from './email/email-service';
import { emailTokensRepository } from './email/email-tokens-repository';
import { logMailer, type Mailer } from './email/mailer';
import type { Database } from './platform/database';
import { emailRoutes } from './routes/email';
import { siteRoutes } from './routes/site';
import { RegistrationClosedError, siteSettingsRepository } from './site/site-settings-repository';
import { accountRoutes } from './routes/account';
import { adminRoutes } from './routes/admin';
import { forumRepository } from './forum/forum-repository';
import { forumService } from './forum/forum-service';
import { forumAdminRepository } from './forum/forum-admin-repository';
import { forumAdminService } from './forum/forum-admin-service';
import { communityRoutes } from './routes/community';
import { newsRepository } from './news/news-repository';
import { newsRoutes } from './routes/news';
import { recordsRoutes } from './routes/records';
import { recordsRepository } from './records/records-repository';
import { resultsRoutes } from './routes/results';
import { resultsRepository } from './results/results-repository';
import { resultsService } from './results/results-service';
import { createVerifier, type Verifier } from './results/verifier';
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
    /** Replaying results to verify them (defaults: 3 minutes after a session's last update, checked every 15 s). */
    verification?: { settleSec?: number; pollMs?: number };
    /** Sending email (defaults: to the server log, with links to http://localhost:5173). */
    email?: { mailer?: Mailer; appUrl?: string };
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Verifies session results by replaying them (start it once the server is listening). */
    verifier?: Verifier;
    /** Hourly tidying: forgetting the devices of sign-ins that have run out. */
    housekeeping?: { start(): void; stop(): void };
  }
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
        const resultsRepo = resultsRepository(db);
        const records = recordsRepository(db);
        const audit = auditRepository(db);
        const results = resultsService({ results: resultsRepo, users, airspaces, records });
        const verifier = createVerifier({
          results: resultsRepo,
          settleSec: deps.accounts.verification?.settleSec ?? 180,
          pollMs: deps.accounts.verification?.pollMs ?? 15_000,
          log: app.log,
        });
        app.decorate('verifier', verifier);
        app.addHook('onClose', () => verifier.stop());
        const emailTokens = emailTokensRepository(db);
        const emails = emailService({
          users,
          tokens: emailTokens,
          signIns,
          mailer: deps.accounts.email?.mailer ?? logMailer(app.log),
          appUrl: deps.accounts.email?.appUrl ?? 'http://localhost:5173',
          log: app.log,
        });
        const sendVerification = (userId: string) =>
          emails.sendVerification(userId, { ignoreCooldown: true });
        let housekeepingTimer: ReturnType<typeof setInterval> | undefined;
        const tidy = () =>
          void signIns
            .forgetEndedDevices()
            .catch((error: unknown) => app.log.error({ err: error }, 'housekeeping failed'));
        app.decorate('housekeeping', {
          start() {
            tidy();
            housekeepingTimer ??= setInterval(tidy, 3_600_000);
          },
          stop() {
            clearInterval(housekeepingTimer);
            housekeepingTimer = undefined;
          },
        });
        app.addHook('onClose', () => app.housekeeping?.stop());
        const site = siteSettingsRepository(db, audit);
        const auth = authService(users, signIns, authConfig);
        const authenticate = authenticator(authConfig.jwtSecret, users);
        await api.register(authRoutes, {
          auth,
          users,
          authenticate,
          secureCookies,
          signInRateLimit,
          onRegistered: sendVerification,
          signIns,
          checkRegistrationOpen: async () => {
            const { registration } = await site.settings();
            if (!registration.open) throw new RegistrationClosedError(registration.message);
          },
        });
        await api.register(siteRoutes, { site, authenticate });
        await api.register(emailRoutes, { emails, authenticate, rateLimit: signInRateLimit });
        await api.register(settingsRoutes, { settings: settingsRepository(db), authenticate });
        await api.register(sessionsRoutes, {
          sessions: savedSessions,
          careerTotals: results.careerTotals,
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
        await api.register(recordsRoutes, { records, authenticate });
        await api.register(newsRoutes, { news: newsRepository(db), audit, authenticate });
        const forum = forumRepository(db);
        await api.register(communityRoutes, {
          forum: forumService({
            forum,
            users,
            audit,
            readOnly: async () => (await site.settings()).community,
          }),
          content: forumAdminService({ admin: forumAdminRepository(db), forum, audit }),
          authenticate,
        });
        await api.register(resultsRoutes, {
          results,
          authenticate,
          bodyLimit: MAX_SNAPSHOT_BYTES,
        });
        await api.register(accountRoutes, {
          account: accountService(users, signIns, emailTokens),
          authenticate,
          secureCookies,
        });
        await api.register(adminRoutes, {
          stats: statsRepository(db),
          admin: adminService({
            users,
            signIns,
            savedSessions,
            airspaces,
            audit,
            results: resultsRepo,
            verifier,
            sendVerification,
            sendPasswordReset: (userId) => emails.sendPasswordReset(userId),
            details: userDetailRepository(db),
            pendingEmail: (userId) => emailTokens.pendingEmail(userId),
          }),
          authenticate,
        });
      }
    },
    { prefix: '/api' },
  );

  return app;
}
