import { expect, test } from '@playwright/test';

test('the landing page shows what the next version brings, and the roadmap shows them all', async ({
  page,
}) => {
  await page.goto('/');
  const next = page.getByRole('region', { name: /Coming in v0\.2/ });
  await next.scrollIntoViewIfNeeded();
  await expect(next.getByRole('heading', { name: 'First shift' })).toBeVisible();
  await expect(next.getByRole('list', { name: 'Versions' })).toContainText('v0.1');
  // The footer says which version is out.
  await expect(page.locator('.site-footer__version')).toHaveText('v0.1');

  await next.getByRole('link', { name: 'See the whole roadmap →' }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('region', { name: 'v0.1 · The beta' })).toContainText(
    'Three real TRACONs',
  );
  await expect(page.getByRole('region', { name: 'v0.2' })).toContainText('Weekly challenge');
});

test('the landing page answers the questions people ask first', async ({ page }) => {
  await page.goto('/');
  const faq = page.getByRole('region', { name: 'Before you take the frequency' });
  await faq.scrollIntoViewIfNeeded();
  const answer = faq.getByText(/free to play while it’s in beta/);
  await expect(answer).toBeHidden();
  await faq.getByText('Is Vector free?').click();
  await expect(answer).toBeVisible();
});

test('the landing page shows activity only once there is enough of it', async ({ page }) => {
  // The test database has a handful of sessions at most: below the minimums.
  const pulse = page.waitForResponse((response) => response.url().endsWith('/api/pulse'));
  await page.goto('/');
  expect((await (await pulse).json()).totals).toBeNull();
  await expect(
    page.getByRole('region', { name: /This week on Vector|Since the beta began/ }),
  ).toHaveCount(0);
});
