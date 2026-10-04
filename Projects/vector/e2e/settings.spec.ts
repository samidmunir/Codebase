import { expect, test } from '@playwright/test';
import { openFromMenu, registerPilot } from './helpers';

test('rebinds a key, warns about the conflict and keeps settings on the account', async ({
  page,
}) => {
  await registerPilot(page);
  await openFromMenu(page, 'Settings');
  const sections = page.getByRole('navigation', { name: 'Settings sections' });
  await sections.getByRole('button', { name: /^Keyboard/ }).click();

  // Map layers is already M: binding the traffic panel to M conflicts.
  await page.locator('#setting-controls-keys-toggleTraffic').click();
  await expect(page.getByText('Press a key…')).toBeVisible();
  await page.keyboard.press('KeyM');
  await expect(page.getByText('Also used by Traffic panel')).toBeVisible();

  // Escape while capturing cancels without leaving the screen.
  await page.locator('#setting-controls-keys-toggleTraffic').click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole('button', { name: 'Reset Traffic panel to default' }).click();
  await expect(page.getByText('Also used by')).toHaveCount(0);

  // A display setting persists to the account and survives a reload.
  await sections.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('radio', { name: 'STARS' }).click();
  await page.waitForTimeout(800); // Settings save after a short pause.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await sections.getByRole('button', { name: /^Display/ }).click();
  await expect(page.getByRole('radio', { name: 'STARS' })).toHaveAttribute('aria-checked', 'true');

  // Search finds settings across sections.
  await page.getByLabel('Search settings').fill('volume');
  await expect(page.getByText('Master volume')).toBeVisible();
});
