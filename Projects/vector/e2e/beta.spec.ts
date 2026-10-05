import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { accountMenu, inviteLink, openFromMenu, registerPilot } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));
const sql = (command: string) =>
  execFileSync('psql', [process.env.TEST_DATABASE_URL!, '-qtAc', command], { stdio: 'pipe' });

// Every test shares the test database: put registration back, and clear the beta's rows.
test.afterEach(() => {
  sql('TRUNCATE site_settings');
  sql('DELETE FROM feedback; DELETE FROM waitlist; DELETE FROM invite_codes');
});

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Fills the rest of the registration form and creates the account. */
async function createAccount(page: Page, email: string, id: string) {
  await page.getByLabel('Display name').fill('E2E Tester');
  await page.getByLabel('Handle').fill(`e2e_${id}`.slice(0, 20));
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /create account/i }).click();
}

test('an invite-only beta: codes, the waitlist, and feedback', async ({ page, browser }) => {
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

  // Invite only, and marked as a beta.
  await page.getByRole('button', { name: 'Site', exact: true }).click();
  const registration = page.getByRole('region', { name: 'Registration' });
  await registration.getByRole('radio', { name: 'Invite only' }).click();
  await registration.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Registration is invite only.')).toBeVisible();
  const beta = page.getByRole('region', { name: 'Beta' });
  await beta.getByRole('switch', { name: 'Vector is in beta' }).click({ force: true });
  await beta.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Vector is in beta.')).toBeVisible();

  // A code for one tester.
  await page.getByRole('button', { name: 'Beta', exact: true }).click();
  const form = page.getByRole('form', { name: 'New invite code' });
  await form.getByLabel('Note (who it’s for)').fill('E2E friends');
  await form.getByRole('button', { name: 'Make code' }).click();
  const made = await page.getByText(/^Made VEC-/).textContent();
  const code = /VEC-[A-Z0-9]{4}-[A-Z0-9]{4}/.exec(made ?? '')![0];
  await expect(page.locator('.admin-table tbody')).toContainText('E2E friends');

  // A visitor: the badge, and no way in without a code; they join the waitlist.
  const visitor = await browser.newPage();
  await visitor.goto('/');
  await expect(visitor.locator('.beta-badge')).toHaveText('Beta');
  await visitor.getByRole('link', { name: 'Have an invite? Join the beta' }).click();
  await expect(visitor.getByLabel('Invite code')).toBeVisible();
  await visitor.getByLabel('Invite code').fill('VEC-NOPE-NOPE');
  await expect(visitor.getByText('That isn’t an invite code we know')).toBeVisible();
  await visitor.getByRole('button', { name: 'Join the waitlist' }).click();
  const keen = `e2e-wait-${unique()}@example.com`;
  const waitlist = visitor.getByRole('form', { name: 'Join the waitlist' });
  await waitlist.getByLabel('Email').fill(keen);
  await waitlist.getByLabel(/What brings you/).fill('I work approach on VATSIM');
  await waitlist.getByRole('button', { name: 'Ask for an invite' }).click();
  await expect(visitor.getByText('You’re on the list.')).toBeVisible();

  // A tester with the code (from the link): it's filled in and works.
  const tester = await browser.newPage();
  await tester.goto(`/register?invite=${code}`);
  await expect(tester.getByLabel('Invite code')).toHaveValue(code);
  await expect(tester.getByText('That code works')).toBeVisible();
  const testerId = unique();
  await createAccount(tester, `e2e-${testerId}@example.com`, testerId);
  await expect(tester).toHaveURL(/\/play$/);

  // Their feedback goes to the admins.
  await accountMenu(tester).click();
  await tester.getByRole('menuitem', { name: 'Send feedback' }).click();
  const dialog = tester.getByRole('dialog', { name: 'Send feedback' });
  await dialog.getByRole('radio', { name: 'An idea' }).click();
  await dialog.getByRole('textbox').fill('A dark-room mode for the strips, please.');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(tester.getByText('Thanks: it’s with the team')).toBeVisible();

  // The code is used up now.
  const late = await browser.newPage();
  await late.goto(`/register?invite=${code}`);
  await expect(late.getByText('That invite code has been used up')).toBeVisible();

  // The admin invites the waitlisted visitor, who gets in with the emailed link.
  await page.getByRole('button', { name: 'Waitlist' }).click();
  const row = page.locator('.admin-table tbody tr', { hasText: keen });
  await expect(row).toContainText('I work approach on VATSIM');
  await row.getByRole('button', { name: 'Invite' }).click();
  await expect(page.getByText(`Emailed ${keen} the code`)).toBeVisible();
  await visitor.goto(await inviteLink(keen));
  await expect(visitor.getByText('That code works')).toBeVisible();
  await createAccount(visitor, keen, unique());
  await expect(visitor).toHaveURL(/\/play$/);
  await page.reload();
  await expect(row).toContainText('Joined');

  // The feedback, worked through.
  await page.getByRole('button', { name: 'Feedback' }).click();
  const item = page.locator('.admin-beta__item', { hasText: 'A dark-room mode' });
  await expect(item).toContainText(`@e2e_${testerId}`.slice(0, 21));
  await expect(item).toContainText('/play');
  await item.getByRole('button', { name: 'Done' }).click();
  await expect(item).toHaveCount(0);
  await page.getByRole('radio', { name: /Done/ }).click();
  await expect(item).toBeVisible();

  // It's all in the log.
  await page.getByRole('button', { name: 'Activity' }).click();
  const log = page.locator('.admin-table tbody');
  await expect(log).toContainText('registration invite only');
  await expect(log).toContainText('Made an invite code');
  await expect(log).toContainText('Invited from the waitlist');

  await Promise.all([visitor.close(), tester.close(), late.close()]);
});
