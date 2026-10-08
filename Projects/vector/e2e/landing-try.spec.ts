import { expect, test } from '@playwright/test';

test('a visitor works an aircraft in the hero: one instruction, its readback, and what next', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const tryIt = page.getByRole('button', { name: /Try it: work an aircraft/ });
  // It appears once the live session has warmed up.
  await expect(tryIt).toBeVisible({ timeout: 60_000 });
  await tryIt.click();

  const panel = page.getByRole('region', { name: 'Try Vector' });
  await expect(panel).toContainText('It’s yours. Give it an instruction:');
  await panel.getByRole('button', { name: 'Turn left 30°' }).click();
  // The instruction, then the pilot reads it back.
  await expect(panel.getByText(/turn left heading/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByText('That’s the job.')).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByRole('link', { name: 'Work the whole sector, free' })).toHaveAttribute(
    'href',
    '/register',
  );

  // Another, then done.
  await panel.getByRole('button', { name: 'Try another' }).click();
  await expect(panel).toContainText('It’s yours.');
  await panel.getByRole('button', { name: 'Stop trying' }).click();
  await expect(panel).toHaveCount(0);

  // The scope doesn't take over the wheel: the page still scrolls over it.
  await page.mouse.move(1000, 250);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() =>
      page
        .locator('.site__main')
        .evaluate((main) => (main as unknown as { scrollTop: number }).scrollTop),
    )
    .toBeGreaterThan(0);
});
