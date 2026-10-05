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
