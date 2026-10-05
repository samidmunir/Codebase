import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run their own API server against the test database, and
// their own client dev server, on ports that don't clash with `npm run dev`.

const serverEnv = new URL('../apps/server/.env', import.meta.url);
if (existsSync(serverEnv)) process.loadEnvFile(serverEnv);

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL (see apps/server/.env.example)');

const API_PORT = 4100;
const WEB_PORT = 5273;

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: '../test-results/e2e',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Sessions played in other browsers' JavaScript engines must verify on the server too.
    {
      name: 'firefox',
      testMatch: 'verification.spec.ts',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit',
      testMatch: 'verification.spec.ts',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'npx tsx apps/server/src/index.ts',
      cwd: '..',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: TEST_DATABASE_URL,
        CLIENT_ORIGIN: `http://localhost:${WEB_PORT}`,
        LOG_LEVEL: 'warn',
        // Verify session results at once, so tests can see them verified.
        RESULT_VERIFY_SETTLE_SEC: '0',
        RESULT_VERIFY_POLL_MS: '1000',
        // Every test registers an account; don't let the sign-in limit get in the way.
        SIGN_IN_RATE_LIMIT: '1000',
      },
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -w @vector/client -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      env: { VECTOR_API_PROXY: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
