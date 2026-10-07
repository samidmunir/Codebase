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
  // It can be shared from the debrief: the menu shows the card the link will preview as.
  await debrief.getByRole('button', { name: 'Share' }).click();
  const menu = debrief.getByRole('menu', { name: 'Share' });
  await expect(menu.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Post on X' })).toHaveAttribute(
    'href',
    /x\.com\/intent\/post\?text=I%20worked%20N90%20New%20York%20on%20Vector/,
  );
  const preview = menu.getByRole('img', { name: /How the link looks/ });
  await expect
    .poll(() =>
      preview.evaluate((img) => (img as unknown as { naturalWidth: number }).naturalWidth),
    )
    .toBe(1200);
  await page.keyboard.press('Escape');
  await debrief.getByRole('button', { name: /^Leave/ }).click();
  await expect(page).toHaveURL(/\/play$/);

  await openFromMenu(page, 'Profile');
  await expect(page.locator('.pilot-tile', { hasText: 'Sessions' })).toContainText('1');
  const row = page.locator('.result-row').first();
  await expect(row).toContainText('N90 New York');
  // Checked by the server's replay a moment later.
  await expect(row).toContainText(/Checking|Verified/);
  await row.click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'N90 New York' })).toBeVisible();
  await expect(page.getByText('RP over the session')).toBeVisible();
  const resultUrl = page.url();
  const resultId = resultUrl.split('/').at(-1)!;

  // And from its page, with a link to it and a downloadable card.
  await page.getByRole('button', { name: 'Share this session' }).click();
  const share = page.getByRole('menu', { name: 'Share' });
  await expect(share.getByRole('menuitem', { name: 'Post on Reddit' })).toHaveAttribute(
    'href',
    new RegExp(
      `reddit\\.com/submit\\?url=${encodeURIComponent(resultUrl).replace(/[.?]/g, '\\$&')}`,
    ),
  );
  await expect(share.getByRole('menuitem', { name: 'Download image' })).toHaveAttribute(
    'href',
    new RegExp(`^/api/share/results/${resultId}/card\\.png\\?v=\\w+&download=1$`),
  );
  const card = await request.get(`/api/share/results/${resultId}/card.png`);
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toBe('image/png');
  await page.keyboard.press('Escape');

  // Anyone can open a public profile's session…
  const anonymous = await request.get(`/api/results/${resultId}`);
  expect(anonymous.status()).toBe(200);
  // A visitor who follows a shared link is told what Vector is, and how to join.
  const visitor = await page.context().browser()!.newPage();
  await visitor.goto(resultUrl);
  const about = visitor.getByRole('complementary', { name: 'About Vector' });
  await expect(about).toContainText('an air traffic control simulator on real airspace');
  await expect(about.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
    'href',
    '/register',
  );
  await visitor.close();

  // The career can be shared too, as its own card.
  await openFromMenu(page, 'Profile');
  await page.getByRole('button', { name: 'Share your profile' }).click();
  const profileMenu = page.getByRole('menu', { name: 'Share' });
  await expect(profileMenu.getByRole('menuitem', { name: 'Post on X' })).toHaveAttribute(
    'href',
    /text=My%20controller%20career%20on%20Vector/,
  );
  const profileCard = profileMenu.getByRole('img', { name: /How the link looks/ });
  await expect
    .poll(() =>
      profileCard.evaluate((img) => (img as unknown as { naturalWidth: number }).naturalWidth),
    )
    .toBe(1200);
  await page.keyboard.press('Escape');

  // …until the pilot makes the profile private.
  await openFromMenu(page, 'Account');
  await page.getByLabel(/Public profile/).uncheck();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  expect((await request.get(`/api/results/${resultId}`)).status()).toBe(404);
  // Nothing of it is shared any more.
  expect((await request.get(`/api/share/results/${resultId}/card.png`)).status()).toBe(404);
  await openFromMenu(page, 'Profile');
  await expect(page.locator('.pilot-pill', { hasText: 'Private' })).toBeVisible();
});
