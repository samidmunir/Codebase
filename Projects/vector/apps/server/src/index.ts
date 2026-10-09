import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { outboxMailer, resendMailer, type Mailer } from './email/mailer';
import { loadConfig } from './platform/config';
import { createDatabase, pingDatabase } from './platform/database';

const config = loadConfig();
const db = createDatabase(config.DATABASE_URL);

let mailer: Mailer | undefined;
if (config.EMAIL_DELIVERY === 'resend')
  mailer = resendMailer({ apiKey: config.RESEND_API_KEY!, from: config.EMAIL_FROM });
if (config.EMAIL_DELIVERY === 'outbox') mailer = outboxMailer(config.EMAIL_OUTBOX_DIR!);

const app = buildApp(
  {
    checkDatabase: () => pingDatabase(db),
    accounts: {
      db,
      auth: {
        jwtSecret: config.JWT_SECRET,
        accessTokenMinutes: config.ACCESS_TOKEN_MINUTES,
        refreshTokenDays: config.REFRESH_TOKEN_DAYS,
      },
      secureCookies: config.NODE_ENV === 'production',
      signInRateLimit: config.SIGN_IN_RATE_LIMIT,
      verification: {
        settleSec: config.RESULT_VERIFY_SETTLE_SEC,
        pollMs: config.RESULT_VERIFY_POLL_MS,
      },
      email: { ...(mailer ? { mailer } : {}), appUrl: config.CLIENT_ORIGIN },
    },
    // Production serves the built client too (from the image's apps/client/dist).
    ...(config.CLIENT_DIR || config.NODE_ENV === 'production'
      ? {
          client: {
            dir: config.CLIENT_DIR ?? fileURLToPath(new URL('../../client/dist', import.meta.url)),
            hsts: config.NODE_ENV === 'production',
            origin: config.CLIENT_ORIGIN,
            indexing: config.SEARCH_INDEXING === 'on',
          },
        }
      : {}),
  },
  {
    logger: { level: config.LOG_LEVEL },
    // Trust the nearest TRUST_PROXY hops' X-Forwarded-For for the client's IP.
    ...(config.TRUST_PROXY > 0
      ? { trustProxy: (_address: string, hop: number) => hop < config.TRUST_PROXY }
      : {}),
  },
);

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await db.end();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
  app.verifier?.start();
  void app
    .rankEarlierResults?.()
    .then((count) => count > 0 && app.log.info({ count }, 'ranked earlier results'))
    .catch((error: unknown) => app.log.error({ err: error }, 'ranking earlier results failed'));
  app.housekeeping?.start();
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}
