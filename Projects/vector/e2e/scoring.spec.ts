import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { accountMenu, newSession, openFromMenu, registerPilot, scopeState } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

// Every test shares the test database: put the official scoring back.
test.afterEach(() => {
  execFileSync(
    'psql',
    [process.env.TEST_DATABASE_URL!, '-qtAc', 'TRUNCATE session_rules_versions'],
    {
      stdio: 'pipe',
    },
  );
});

test('an admin sets the official scoring, and every new session uses it', async ({ page }) => {
  const email = await registerPilot(page);
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();
  await openFromMenu(page, 'Admin');
  await page.getByRole('button', { name: 'Session rules', exact: true }).click();

  const card = page.getByRole('region', { name: 'Session rules' });
  await expect(card).toContainText('The defaults: never changed.');
  await card.getByLabel('Landing', { exact: false }).first().fill('150');
  await card.getByRole('button', { name: 'Save 1 change' }).click();
  await expect(page.getByText(/Saved: new sessions use them from now on/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Earlier versions' })).toContainText('Current');

  // A new session (from any player) uses it, whatever was stored on the device.
  await page.goto('/play');
  await newSession(page, 'New York');
  await page.getByRole('button', { name: 'Start session' }).click();
  expect((await scopeState(page)).settings['scoring.landingRp']).toBe(150);

  // And it's in the log.
  await page.goto('/admin?tab=activity');
  await expect(page.locator('.admin-table tbody')).toContainText('Changed the session rules');
});
