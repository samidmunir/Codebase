import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Runs SQL on the test database (test fixtures only). */
function sql(query: string) {
  execFileSync('psql', [process.env.TEST_DATABASE_URL!, '-qtAc', query], { stdio: 'pipe' });
}

test('the admin dashboard charts what pilots did, by day', async ({ page }) => {
  const email = await registerPilot(page);
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
  // A month of test sessions for this account, more each week, so the charts have shape.
  sql(`INSERT INTO session_results (user_id, session_key, airspace_id, difficulty, sim_time_sec,
         final_tick, rp, stats, report, verification, created_at, updated_at)
       SELECT u.id, 'e2e-' || d || '-' || k,
         (ARRAY['new-york', 'chicago', 'dallas'])[1 + (d + k) % 3],
         (ARRAY['easy', 'normal', 'hard'])[1 + k % 3],
         1200 + 600 * k, 1200, 10, '{}', '{}',
         CASE WHEN k % 5 = 4 THEN 'mismatch' ELSE 'verified' END,
         now() - make_interval(days => d), now() - make_interval(days => d)
       FROM users u, generate_series(0, 27) d, generate_series(0, 4) k
       WHERE u.email = '${email}' AND k <= (30 - d) / 7`);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();
  await openFromMenu(page, 'Admin');

  await expect(page.getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('region', { name: 'Sessions played' })).toBeVisible();
  const tiles = page.locator('.admin-stat-tiles');
  await expect(tiles.getByText('Sessions played')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Right now' })).toContainText('online now');

  // Each chart's numbers are in a table too.
  const chart = page.getByRole('region', { name: 'Sessions played' });
  await chart.getByRole('button', { name: 'Table' }).click();
  await expect(chart.getByRole('table')).toBeVisible();
  await expect(chart.getByRole('row')).toHaveCount(31); // A header and 30 days.
  await chart.getByRole('button', { name: 'Chart' }).click();

  // Hovering a day shows its numbers.
  const verification = page.getByRole('region', { name: 'Verification' });
  const plot = verification.locator('svg');
  const size = (await plot.boundingBox())!;
  await plot.hover({ position: { x: size.width - 30, y: size.height / 2 } });
  await expect(verification.getByRole('status')).toContainText('Verified');

  await expect(page.getByRole('region', { name: 'Airspaces played' })).toContainText('Chicago');

  await page.getByRole('radio', { name: '1 year' }).click();
  await expect(page.getByText(/UTC weeks/)).toBeVisible();
});
