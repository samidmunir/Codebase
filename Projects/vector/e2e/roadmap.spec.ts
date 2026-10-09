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
