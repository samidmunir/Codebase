import { expect, test } from '@playwright/test';
import { newSession, openFromMenu, registerPilot, scopeState } from './helpers';

// The browser plays the session; the server replays it with its own copy of the
// engine and must get exactly the same result, whichever browser played it.
test('a session played in this browser is verified by the server’s replay', async ({ page }) => {
  test.setTimeout(150_000);
  await registerPilot(page);
  await newSession(page, 'New York');
  await page.getByRole('radio', { name: 'Normal' }).click();
  await page.getByRole('radio', { name: 'Manual' }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
  await scopeState(page);

  // Work some traffic: release a departure, and give an aircraft a speed.
  await page
    .getByRole('region', { name: 'JFK departures' })
    .locator('.departure__summary')
    .first()
    .click();
  await page
    .getByRole('region', { name: 'JFK departures' })
    .locator('.departure__runway')
    .first()
    .click();
  await page.locator('.comms-log__entry button:not([disabled])').first().click();
  const panel = page.locator('.command-panel');
  await panel.getByRole('button', { name: 'Speed' }).click();
  const transmit = panel.getByRole('button', { name: 'Transmit' });
  for (const option of await panel.locator('.option-grid--speeds button').all()) {
    await option.click();
    if (await transmit.isEnabled()) break;
    await option.click();
  }
  await transmit.click();
  await page.getByRole('button', { name: '4×' }).click();
  await page.waitForTimeout(8_000);

  const inputs = await page.evaluate(
    () =>
      (globalThis as unknown as { __vector: { engine: { replay?: { inputs: unknown[] } } } })
        .__vector.engine.replay?.inputs.length ?? 0,
  );
  expect(inputs).toBeGreaterThanOrEqual(2);

  await page.getByRole('link', { name: 'Vector home' }).click();
  await page
    .getByRole('dialog', { name: 'Session debrief' })
    .getByRole('button', { name: /^Leave/ })
    .click();
  await openFromMenu(page, 'Profile');
  const row = page.locator('.result-row').first();
  await expect(async () => {
    await page.reload();
    await expect(row).toContainText('Verified', { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
});
