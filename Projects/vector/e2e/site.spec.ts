import { expect, test } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot } from './helpers';

test('shows the landing page and a not-found page to visitors', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Work real airspace.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start controlling, free' })).toBeVisible();
  for (const name of ['New York', 'Chicago', 'Dallas–Fort Worth'])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

  await page.goto('/no-such-page');
  await expect(page.getByText('Radar contact lost')).toBeVisible();
  // Signed-in pages send visitors to sign in.
  await page.goto('/play');
  await expect(page).toHaveURL(/\/login\?next=%2Fplay$/);
});

test('registers with a handle, edits the profile, and signs out from the menu', async ({
  page,
  request,
}) => {
  // A handle someone already has is flagged while typing.
  const taken = `taken_${Date.now().toString(36)}`;
  await request.post('/api/auth/register', {
    data: {
      email: `e2e-${taken}@example.com`,
      handle: taken,
      password: 'correct horse battery',
      displayName: 'Taken',
    },
  });
  await page.goto('/register');
  await page.getByLabel('Handle').fill(taken.toUpperCase());
  await expect(page.getByText('That handle is taken')).toBeVisible();

  await registerPilot(page);
  await openFromMenu(page, 'Account');
  const profile = page.getByRole('region', { name: 'Profile' });
  const handle = `pilot_${Date.now().toString(36)}`;
  await profile.locator('input[name="handle"]').fill(handle);
  await expect(profile.getByText(`✓ ${handle} is free`)).toBeVisible();
  await profile.getByLabel('Display name').fill('Night Shift');
  await profile.getByRole('button', { name: 'Save profile' }).click();
  await expect(profile.getByText('Saved.')).toBeVisible();
  // The header follows at once.
  await expect(accountMenu(page)).toContainText(`@${handle}`);
  await expect(profile.getByText('You changed your handle recently')).toBeVisible();

  await accountMenu(page).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('the sign-in pages help: tabs keep where you were going, and passwords can be checked', async ({
  page,
}) => {
  await page.goto('/login?next=%2Frecords');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  // A live session runs beside the form.
  await expect(page.getByRole('img', { name: /live Vector session in Chicago/ })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Account' })
    .getByRole('link', { name: 'Create account' })
    .click();
  await expect(page).toHaveURL(/\/register\?next=%2Frecords$/);

  const password = page.getByLabel('Password', { exact: true });
  await password.fill('abc');
  await expect(page.getByText('5 more characters')).toBeVisible();
  await password.fill('Correct horse battery 9');
  await expect(page.getByText('Strong')).toBeVisible();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  // How you'll appear, as you type.
  await page.getByLabel('Display name').fill('Night Shift');
  await page.getByLabel('Handle').fill('night_owl');
  const preview = page.getByLabel('How you’ll appear');
  await expect(preview).toContainText('Night Shift');
  await expect(preview).toContainText('@night_owl');
  await expect(preview).toContainText('NS');

  await page
    .getByRole('navigation', { name: 'Account' })
    .getByRole('link', { name: 'Sign in' })
    .click();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
});
