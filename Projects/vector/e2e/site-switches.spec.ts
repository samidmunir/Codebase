import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot, verifyEmail } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

// Every test shares the test database: put the switches back however this one ends.
test.afterEach(() => {
  execFileSync('psql', [process.env.TEST_DATABASE_URL!, '-qtAc', 'TRUNCATE site_settings'], {
    stdio: 'pipe',
  });
});

test('an admin closes registration, puts up a banner, and makes the community read-only', async ({
  page,
  browser,
}) => {
  // A player, before anything closes.
  const player = await browser.newPage();
  const playerEmail = await registerPilot(player);
  await verifyEmail(player, playerEmail);

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
  await page.getByRole('button', { name: 'Site', exact: true }).click();

  const registration = page.getByRole('region', { name: 'Registration' });
  await registration.getByRole('radio', { name: 'Closed' }).click();
  await registration.getByLabel(/Message on the registration page/).fill('Back in November.');
  await registration.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Registration is closed.')).toBeVisible();

  const banner = page.getByRole('region', { name: 'Banner' });
  await banner.getByRole('switch', { name: 'Show the banner' }).click({ force: true });
  await banner.getByLabel('Message').fill('Maintenance tonight at 22:00Z.');
  await banner.getByRole('radio', { name: 'Warning' }).click();
  await banner.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('The banner is up.')).toBeVisible();

  const community = page.getByRole('region', { name: 'Community' });
  await community.getByRole('switch', { name: 'Community is read-only' }).click({ force: true });
  await community.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('The community is read-only.')).toBeVisible();

  // A visitor: the banner, and no way to register.
  const visitor = await browser.newPage();
  await visitor.goto('/');
  const notice = visitor.getByRole('status').filter({ hasText: 'Maintenance tonight at 22:00Z.' });
  await expect(notice).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Start controlling, free' })).toHaveCount(0);
  await visitor.goto('/register');
  await expect(visitor.getByText('New accounts are paused.')).toBeVisible();
  await expect(visitor.getByText('Back in November.')).toBeVisible();
  await expect(visitor.getByLabel('Display name')).toHaveCount(0);
  // Dismissed, it stays dismissed.
  await visitor.goto('/records');
  await visitor.getByRole('button', { name: 'Dismiss this message' }).click();
  await expect(notice).toHaveCount(0);
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: 'Records' })).toBeVisible();
  await expect(notice).toHaveCount(0);

  // The player can read, not post.
  await player.goto('/community/general');
  await expect(player.getByText('The community is read-only for now')).toBeVisible();
  await expect(player.getByRole('link', { name: 'New thread' })).toHaveCount(0);

  // It's all in the log.
  await page.getByRole('button', { name: 'Activity' }).click();
  await expect(page.locator('.admin-table tbody')).toContainText('registration closed');
  await expect(page.locator('.admin-table tbody')).toContainText('community read-only');

  await visitor.close();
  await player.close();
});
