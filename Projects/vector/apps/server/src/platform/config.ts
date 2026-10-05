import { existsSync } from 'node:fs';
import { z } from 'zod';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  /** The site's address, for links in emails (a trailing slash is dropped). */
  CLIENT_ORIGIN: z
    .url()
    .default('http://localhost:5173')
    .transform((url) => url.replace(/\/+$/, '')),
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
  /**
   * Behind a proxy or load balancer, how many hops to trust for the client's IP
   * (X-Forwarded-For). 0 (default): use the connection's address.
   */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /**
   * The built client to serve (production does by default, from apps/client/dist).
   * Unset in development, where Vite serves it.
   */
  CLIENT_DIR: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /**
   * Where emails go: `resend` sends them; `log` writes them to the server log;
   * `outbox` writes each to a file in EMAIL_OUTBOX_DIR (for end-to-end tests).
   * Defaults to `resend` in production and `log` otherwise.
   */
  EMAIL_DELIVERY: z.enum(['resend', 'log', 'outbox']).optional(),
  /** Resend API key; never commit it. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** The sender, e.g. "Vector <hello@example.com>", on a domain verified in Resend. */
  EMAIL_FROM: z.string().min(3).default('Vector <onboarding@resend.dev>'),
  EMAIL_OUTBOX_DIR: z.string().min(1).optional(),
});

export type Config = z.infer<typeof configSchema> & {
  EMAIL_DELIVERY: 'resend' | 'log' | 'outbox';
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid server configuration:\n${z.prettifyError(result.error)}`);
  }
  const config = result.data;
  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET.startsWith('change-me'))
      throw new Error('Invalid server configuration: set JWT_SECRET to a long random value');
    if (!config.CLIENT_ORIGIN.startsWith('https://'))
      throw new Error(
        'Invalid server configuration: CLIENT_ORIGIN must be the site’s https:// address',
      );
  }
  const delivery = config.EMAIL_DELIVERY ?? (config.NODE_ENV === 'production' ? 'resend' : 'log');
  if (delivery === 'resend' && !config.RESEND_API_KEY)
    throw new Error('Invalid server configuration: set RESEND_API_KEY to send email');
  if (delivery === 'resend' && config.NODE_ENV === 'production' && !env.EMAIL_FROM)
    throw new Error('Invalid server configuration: set EMAIL_FROM to an address on your domain');
  if (delivery === 'outbox' && !config.EMAIL_OUTBOX_DIR)
    throw new Error('Invalid server configuration: set EMAIL_OUTBOX_DIR for EMAIL_DELIVERY=outbox');
  return { ...config, EMAIL_DELIVERY: delivery };
}
