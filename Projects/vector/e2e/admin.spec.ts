import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Makes an account an admin the way an operator does: `npm run admin:grant`, on the test database. */
function grantAdmin(email: string): void {
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();
}

test('keeps players out of the admin pages', async ({ page }) => {
  await registerPilot(page);
  await accountMenu(page).click();
  await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/play$/);
});

test('an admin manages users and airspaces, and every change is logged', async ({ page }) => {
  page.on('dialog', (dialog) => void dialog.accept());
  const email = await registerPilot(page);
  grantAdmin(email);
  // Granting ends the account's sign-ins, so the new role applies on the next sign-in.
  await signIn(page, email);
  await openFromMenu(page, 'Admin');
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
  await expect(page.locator('.admin-tile', { hasText: 'Admins' })).toBeVisible();
  // Their own sign-in shows the device it's on.
  await page.goto('/account');
  await expect(page.getByRole('region', { name: 'Devices' })).toContainText('This device');
  await page.goto('/admin');

  // Create an account, then edit, disable and delete it.
  await page.getByRole('button', { name: 'Users' }).click();
  await page.getByRole('button', { name: 'New user' }).click();
  const created = `e2e-created-${Date.now()}@example.com`;
  const form = page.getByRole('form', { name: 'New user' });
  await form.getByLabel('Display name').fill('Night Shift');
  await form.getByLabel('Handle').fill(`night_${Date.now().toString(36)}`);
  await form.getByLabel('Email').fill(created);
  await form.getByLabel('Password', { exact: true }).fill('a long enough password');
  await form.getByRole('button', { name: 'Create user' }).click();

  // The new account opens on its own page.
  await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Night Shift' })).toBeVisible();
  const details = page.getByRole('form', { name: 'Account details' });
  await details.getByLabel('Display name').fill('Day Shift');
  await details.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Day Shift' })).toBeVisible();

  await page.getByRole('button', { name: 'Disable account' }).click();
  await expect(page.locator('.admin-pill', { hasText: 'Disabled' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'History' })).toContainText('Edited account');
  await page.getByRole('link', { name: 'Users' }).first().click();
  await page.getByLabel('Search users').fill('day shift');
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);

  // Several at once: select it and mark its email verified.
  await page.getByRole('checkbox', { name: `Select ${created}` }).check();
  await page
    .getByRole('toolbar', { name: 'Selected users' })
    .getByRole('button', { name: 'Mark email verified' })
    .click();
  await expect(page.getByText('Mark email verified: done for 1')).toBeVisible();
  // And the list as a spreadsheet.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^vector-users-\d{4}-\d{2}-\d{2}\.csv$/);

  // Close Chicago: the start screen shows it closed.
  await page.getByRole('button', { name: 'Airspaces' }).click();
  const chicago = page.getByRole('switch', { name: 'Chicago open to players' });
  await chicago.click({ force: true });
  await expect(chicago).not.toBeChecked();
  await page.getByRole('link', { name: 'Play', exact: true }).click();
  await expect(page.locator('.airspace-card--closed', { hasText: 'Chicago' })).toContainText(
    'Closed',
  );
  await page.goto('/setup/chicago');
  await expect(page.getByText('Chicago is closed right now')).toBeVisible();

  // Open it again, delete the account, and see it all in the activity log.
  await page.goto('/admin?tab=airspaces');
  await page.getByRole('switch', { name: 'Chicago open to players' }).click({ force: true });
  await expect(page.getByRole('switch', { name: 'Chicago open to players' })).toBeChecked();
  await page.goto('/admin?tab=users');
  await page.getByLabel('Search users').fill(created);
  await page.getByRole('link', { name: new RegExp(created) }).click();
  await page.getByRole('button', { name: 'Delete account…' }).click();
  await page.getByLabel('Type the email to confirm').fill(created);
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page).toHaveURL(/\/admin\?tab=users$/);

  await page.getByRole('button', { name: 'Activity' }).click();
  const log = page.locator('.admin-table tbody');
  for (const action of [
    'Created account',
    'Edited account',
    'Changed airspace',
    'Deleted account',
    'Exported users',
    'Made admin',
  ])
    await expect(log).toContainText(action);
});

test('a moderator sees the community tools, and nothing else', async ({ page }) => {
  const email = await registerPilot(page);
  // Admins grant the role from a user's page; here it's set directly in the test database
  // (ending their sign-ins, as a role change does).
  execFileSync(
    'psql',
    [
      process.env.TEST_DATABASE_URL!,
      '-qtAc',
      `UPDATE users SET role = 'moderator' WHERE email = '${email}';
       UPDATE auth_sessions SET revoked_at = now()
         WHERE user_id = (SELECT id FROM users WHERE email = '${email}')`,
    ],
    { stdio: 'pipe' },
  );
  await signIn(page, email);
  await openFromMenu(page, 'Moderation');
  await expect(page.getByRole('heading', { name: 'Moderation' })).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Administration' }).getByRole('button');
  await expect(tabs).toHaveText(['Community']);
  await expect(page.getByText('No open reports.')).toBeVisible();
  await page.goto('/admin?tab=users');
  await expect(page.getByRole('heading', { name: 'Moderation' })).toBeVisible();
  await expect(page.getByLabel('Search users')).toHaveCount(0);
});
