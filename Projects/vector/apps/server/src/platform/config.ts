import { existsSync } from 'node:fs';
import { z } from 'zod';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  /** Secret for signing access tokens. Use a long random value; never commit it. */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  /** Sign-in and registration attempts allowed per IP per minute. */
  SIGN_IN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  /** A session result is verified once it has had no update for this long. */
  RESULT_VERIFY_SETTLE_SEC: z.coerce.number().min(0).default(180),
  /** How often the verifier looks for results to check. */
  RESULT_VERIFY_POLL_MS: z.coerce.number().int().positive().default(15_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid server configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
