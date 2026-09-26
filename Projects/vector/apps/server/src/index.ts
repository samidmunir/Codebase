import { buildApp } from './app';
import { loadConfig } from './platform/config';
import { createDatabase, pingDatabase } from './platform/database';

const config = loadConfig();
const db = createDatabase(config.DATABASE_URL);

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
    },
  },
  { logger: { level: config.LOG_LEVEL } },
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
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}
