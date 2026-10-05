import { expect, test } from '@playwright/test';
import { newSession, openFromMenu, registerPilot, scopeState } from './helpers';

test('a session played goes into the career, with its overview; a private profile is hidden', async ({
  page,
  request,
}) => {
  await registerPilot(page);
  await newSession(page, 'New York');
  await page.getByRole('radio', { name: 'Easy' }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
  await scopeState(page);

  // Leave from the debrief: the session is recorded on the way out.
  await page.getByRole('link', { name: 'Vector home' }).click();
  const debrief = page.getByRole('dialog', { name: 'Session debrief' });
  await expect(debrief).toBeVisible();
  await debrief.getByRole('button', { name: /^Leave/ }).click();
  await expect(page).toHaveURL(/\/play$/);

  await openFromMenu(page, 'Profile');
  await expect(page.locator('.pilot-tile', { hasText: 'Sessions' })).toContainText('1');
  const row = page.locator('.result-row').first();
  await expect(row).toContainText('N90 New York');
  await expect(row).toContainText('Checking');
  await row.click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'N90 New York' })).toBeVisible();
  await expect(page.getByText('RP over the session')).toBeVisible();
  const resultUrl = page.url();

  // Anyone can open a public profile's session…
  const anonymous = await request.get(`/api/results/${resultUrl.split('/').at(-1)}`);
  expect(anonymous.status()).toBe(200);

  // …until the pilot makes the profile private.
  await openFromMenu(page, 'Account');
  await page.getByLabel(/Public profile/).uncheck();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  expect((await request.get(`/api/results/${resultUrl.split('/').at(-1)}`)).status()).toBe(404);
  await openFromMenu(page, 'Profile');
  await expect(page.locator('.pilot-pill', { hasText: 'Private' })).toBeVisible();
});
