import { expect, test } from '@playwright/test';
import { newSession, registerPilot, scopeState } from './helpers';

test('sets up a session, controls traffic, saves it and resumes exactly', async ({ page }) => {
  await registerPilot(page);

  // Session setup: Normal traffic and a manual wind from the southwest.
  await newSession(page, 'New York');
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

  // The debrief follows the save; back to the start screen from it.
  const debrief = page.getByRole('dialog', { name: 'Session debrief' });
  await expect(debrief).toContainText('Saved “E2E evening rush”');
  await expect(debrief).toContainText('Timing');
  await debrief.getByRole('button', { name: 'Back to start' }).click();
  await expect(page).toHaveURL(/\/play$/);
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

test('a session is played on official scoring and rules, its traffic fixed once it starts', async ({
  page,
}) => {
  await registerPilot(page);
  await newSession(page, 'New York');
  // Setup offers the difficulty and the player's own options, not scoring or the rules.
  await expect(page.getByText('RP scoring')).toHaveCount(0);
  await expect(page.getByText('Separation minima')).toHaveCount(0);
  await expect(page.locator('.setup-summary__ranked')).toContainText('Ranked.');
  await page.getByRole('radio', { name: 'Hard' }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
  const state = await scopeState(page);
  expect(state.settings['scoring.landingRp']).toBe(100);
  expect(state.settings['separation.lateralNm']).toBe(3);

  // The traffic panel shows the session's traffic, and can't change it.
  await page.keyboard.press('KeyT');
  const panel = page.getByRole('complementary', { name: 'Traffic' });
  await expect(panel).toContainText('Hard');
  await expect(panel.locator('input')).toHaveCount(0);
  await expect(panel.getByRole('radio')).toHaveCount(0);
});

test('works Chicago the same way: O’Hare and Midway on their wind, saved and resumed as C90', async ({
  page,
}) => {
  await registerPilot(page);
  await newSession(page, 'Chicago');
  await page.getByRole('radio', { name: 'Normal' }).click();
  await page.getByRole('radio', { name: 'Manual' }).click();
  await page.locator('#setting-weather-manualWindDirectionDeg').fill('270');
  await page.locator('#setting-weather-manualWindSpeedKts').fill('14');
  await expect(page.locator('.setup-airport', { hasText: 'ORD' })).toContainText('ARR 27L');
  await page.getByRole('button', { name: 'Start session' }).click();

  const started = await scopeState(page);
  // West flow: triple arrivals at O'Hare; Midway lands 31R and departs 22L.
  expect(started.runways.KORD).toMatchObject({
    arrivals: ['27L', '28C', '27R'],
    departures: ['28R', '22L'],
  });
  expect(started.runways.KMDW).toMatchObject({ arrivals: ['31R'], departures: ['22L'] });
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { __vector: { engine: { playerId: string } } }).__vector.engine
          .playerId,
    ),
  ).toBe('C90');

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
  await expect(page.locator('.comms-log__entry--controller').last()).toContainText(
    /(reduce|increase|maintain) speed/i,
  );

  await page.keyboard.press('Shift+KeyS');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('E2E Chicago');
  await dialog.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  const saved = await scopeState(page);
  await page
    .getByRole('dialog', { name: 'Session debrief' })
    .getByRole('button', { name: 'Back to start' })
    .click();
  const card = page.locator('.saved-session', { hasText: 'E2E Chicago' });
  await expect(card).toContainText('C90');
  await card.getByRole('link', { name: 'Resume' }).click();
  const resumed = await scopeState(page);
  expect(resumed).toMatchObject({
    tick: saved.tick,
    aircraft: saved.aircraft,
    savedName: 'E2E Chicago',
  });
  expect(resumed.runways).toEqual(saved.runways);
});

test('works Dallas–Fort Worth: DFW in south flow on four runways, departures climbing via their SIDs', async ({
  page,
}) => {
  await registerPilot(page);
  await newSession(page, 'Dallas');
  await page.getByRole('radio', { name: 'Normal' }).click();
  await page.getByRole('radio', { name: 'Manual' }).click();
  await page.locator('#setting-weather-manualWindDirectionDeg').fill('180');
  await page.locator('#setting-weather-manualWindSpeedKts').fill('12');
  await expect(page.locator('.setup-airport', { hasText: 'DFW' })).toContainText('ARR 17C');
  await page.getByRole('button', { name: 'Start session' }).click();

  const started = await scopeState(page);
  expect(started.runways.KDFW).toMatchObject({
    arrivals: ['17C', '17L', '18R', '13R'],
    departures: ['17R', '18L'],
  });
  expect(started.runways.KDAL).toMatchObject({ arrivals: ['13L'], departures: ['13R'] });

  // Release a DFW departure: it checks in with Regional Departure, climbing via its SID.
  const dfw = page.getByRole('region', { name: 'DFW departures' });
  await dfw.locator('.departure__summary').first().click();
  await dfw.getByRole('button', { name: 'Runway 17R' }).click();
  await page.getByRole('button', { name: '4×' }).click();
  await expect(
    page
      .locator('.comms-log__entry', {
        hasText: /Regional Departure, .*climbing via the [A-Z]+ [a-z]+ departure/,
      })
      .first(),
  ).toBeVisible({ timeout: 60_000 });
});
