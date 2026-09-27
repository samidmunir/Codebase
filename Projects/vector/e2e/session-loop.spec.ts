import { expect, test } from '@playwright/test';
import { registerPilot, scopeState } from './helpers';

test('sets up a session, controls traffic, saves it and resumes exactly', async ({ page }) => {
  await registerPilot(page);

  // Session setup: Normal traffic and a manual wind from the southwest.
  await page.getByRole('link', { name: /New session/ }).click();
  await page.getByRole('radio', { name: 'Normal' }).click();
  await page.getByRole('radio', { name: 'Manual' }).click();
  await page.locator('#setting-weather-manualWindDirectionDeg').fill('220');
  await page.locator('#setting-weather-manualWindSpeedKts').fill('14');
  const jfk = page.locator('.setup-airport', { hasText: 'JFK' });
  await expect(jfk).toContainText('220° 14 kt');
  await expect(jfk.locator('.setup-airport__runways')).toContainText('ARR 22L');
  await page.getByRole('button', { name: 'Start session' }).click();

  const started = await scopeState(page);
  expect(started.settings['traffic.arrivalRatePerHour']).toBe(10);
  expect(started.settings['weather.windMode']).toBe('manual');
  // A light southwest wind: JFK runs dual arrivals on the 22s.
  expect(started.runways.KJFK!.arrivals).toEqual(['22L', '22R']);

  // Select an aircraft from the radio log and give it a speed through the command menu.
  await page.locator('.comms-log__entry button:not([disabled])').first().click();
  const panel = page.locator('.command-panel');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Speed' }).click();
  const transmit = panel.getByRole('button', { name: 'Transmit' });
  for (const option of await panel.locator('.option-grid--speeds button').all()) {
    await option.click();
    if (await transmit.isEnabled()) break;
    await option.click();
  }
  await transmit.click();
  await expect(page.locator('.comms-log__entry--controller').last()).toContainText(
    /(reduce|increase|maintain) speed/i,
  );

  // Ctrl-click a fix on the scope: the selected aircraft is sent direct to it.
  const ccc = await page.evaluate(() => {
    const w = globalThis as unknown as {
      __vector: { pack: { fix(id: string): { position: { lat: number; lon: number } } } };
      __vectorProject(p: { lat: number; lon: number }): { x: number; y: number };
    };
    return w.__vectorProject(w.__vector.pack.fix('CCC').position);
  });
  await page.keyboard.down('Control');
  await page.mouse.move(ccc.x + 2, ccc.y + 2);
  await page.mouse.click(ccc.x + 2, ccc.y + 2);
  await page.keyboard.up('Control');
  await expect(page.locator('.comms-log__entry--controller').last()).toContainText(
    'proceed direct CCC',
  );

  // Save (Shift+S pauses first), then leave the scope.
  await page.keyboard.press('Shift+KeyS');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('E2E evening rush');
  await dialog.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  const saved = await scopeState(page);
  expect(saved.paused).toBe(true);

  await page.goto('/');
  const card = page.locator('.saved-session', { hasText: 'E2E evening rush' });
  await expect(card).toContainText('Normal');
  await card.getByRole('link', { name: 'Resume' }).click();

  await expect(page.locator('.scope-notice')).toContainText('E2E evening rush');
  const resumed = await scopeState(page);
  expect(resumed).toMatchObject({
    tick: saved.tick,
    paused: true,
    aircraft: saved.aircraft,
    savedName: 'E2E evening rush',
  });
  expect(resumed.runways).toEqual(saved.runways);
  expect(resumed.settings).toEqual(saved.settings);
});

test('tunes traffic during a session', async ({ page }) => {
  await registerPilot(page);
  await page.getByRole('link', { name: /New session/ }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
  await scopeState(page);

  await page.keyboard.press('KeyT');
  const panel = page.getByRole('complementary', { name: 'Traffic' });
  await panel.locator('label', { hasText: 'Transit rate' }).locator('input').fill('12');
  await expect(page.locator('.scope-notice')).toContainText('Custom');
  expect((await scopeState(page)).settings['traffic.transitRatePerHour']).toBe(12);

  await panel.getByRole('radio', { name: 'Hard' }).click();
  await expect(page.locator('.scope-notice')).toContainText('Hard');
});
