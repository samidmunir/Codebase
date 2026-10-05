import { expect, test, type Page } from '@playwright/test';
import { accountMenu, emailLink, emailsTo, openFromMenu, registerPilot } from './helpers';

const PASSWORD = 'correct horse battery';

async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

const banner = (page: Page) => page.getByRole('status').filter({ hasText: 'Verify your email' });

test('a new pilot verifies their email from the link they’re sent', async ({ page }) => {
  const email = await registerPilot(page);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText(email);

  // Asking again straight away is refused politely.
  await banner(page).getByRole('button', { name: 'Send it again' }).click();
  await expect(page.getByText('We just sent you an email')).toBeVisible();

  await page.goto(await emailLink(email, 'Verify your email for Vector'));
  await expect(page.getByText('Your email is verified.')).toBeVisible();
  // The token doesn't stay in the address bar.
  expect(new URL(page.url()).hash).toBe('');
  await page.getByRole('link', { name: 'Play' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(banner(page)).toHaveCount(0);

  await openFromMenu(page, 'Account');
  const section = page.getByRole('region', { name: 'Email' });
  await expect(section.getByText('Verified', { exact: true })).toBeVisible();
});

test('a forgotten password is reset by link, without saying which emails have accounts', async ({
  page,
}) => {
  const email = await registerPilot(page);
  await accountMenu(page).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await page.getByLabel('Email').fill('nobody-e2e@example.com');
  await page.getByRole('button', { name: 'Send the link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  expect(emailsTo('nobody-e2e@example.com')).toBe(0);

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send the link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  const link = await emailLink(email, 'Reset your Vector password');
  await page.goto(link);
  await page.getByLabel('New password').fill('a brand new password');
  await page.getByRole('button', { name: 'Save the new password' }).click();
  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible();

  // The link works once. (Leave the page first: going to the same page with a new
  // fragment wouldn't load it again.)
  await page.goto('/about');
  await page.goto(link);
  await page.getByLabel('New password').fill('yet another password');
  await page.getByRole('button', { name: 'Save the new password' }).click();
  await expect(page.getByRole('alert')).toContainText('expired or has already been used');

  await signIn(page, email, PASSWORD);
  await expect(page.getByText('Email or password is incorrect')).toBeVisible();
  await signIn(page, email, 'a brand new password');
  await expect(accountMenu(page)).toBeVisible();
  // Resetting by link verifies the address too.
  await expect(banner(page)).toHaveCount(0);
});

test('the email changes once the new address confirms, and the old one can undo it', async ({
  page,
}) => {
  const email = await registerPilot(page);
  const newEmail = email.replace('e2e-', 'e2e-new-');
  await openFromMenu(page, 'Account');
  const section = page.getByRole('region', { name: 'Email' });
  await section.getByLabel('New email').fill(newEmail);
  await section.getByLabel('Current password').fill(PASSWORD);
  await section.getByRole('button', { name: 'Change email' }).click();
  await expect(section.getByText(`We sent a link to ${newEmail}`)).toBeVisible();
  await expect(section.getByText('Waiting for you to open the link')).toContainText(newEmail);

  await page.goto(await emailLink(newEmail, 'Confirm your new email for Vector'));
  await expect(page.getByText('Your account uses your new email now.')).toBeVisible();
  await page.goto('/account');
  await expect(page.getByText(`Signed in as ${newEmail}`)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Email' }).getByText('Verified', { exact: true }),
  ).toBeVisible();

  // The old address is told, and can move the account back.
  await page.goto(await emailLink(email, 'Your Vector email was changed'));
  await expect(page.getByText('Your account is back on this email')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reset my password' })).toBeVisible();
  await signIn(page, email);
  await expect(accountMenu(page)).toBeVisible();
});

test('a broken or incomplete link says so', async ({ page }) => {
  await page.goto('/verify-email');
  await expect(page.getByText('This link is incomplete')).toBeVisible();
  await page.goto(`/confirm-email#${'A'.repeat(43)}`);
  await expect(page.getByText('This link has expired or has already been used.')).toBeVisible();
});
