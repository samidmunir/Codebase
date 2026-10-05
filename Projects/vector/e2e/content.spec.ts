import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

test('visitors can read the guide, the airspaces and the legal pages', async ({ page }) => {
  // The front page plays a live session behind the hero.
  await page.goto('/');
  await expect(page.getByRole('img', { name: /live Vector session/ })).toBeVisible();
  await expect(page.locator('.landing-hero canvas').first()).toBeVisible();
  await expect(page).toHaveTitle('Vector · Air traffic control on real airspace');

  await page.getByRole('banner').getByRole('link', { name: 'Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Controller’s Handbook' })).toBeVisible();
  await expect(page).toHaveTitle('Controller’s Handbook · Vector');
  await page.getByRole('link', { name: 'Dallas–Fort Worth' }).first().click();
  await expect(page).toHaveURL(/\/guide#dallas$/);
  await expect(page.locator('#dallas h2')).toBeInViewport();

  await page.getByRole('banner').getByRole('link', { name: 'Airspaces' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Airspaces' })).toBeVisible();
  await page.locator('.airspace-tile', { hasText: 'Chicago' }).click();
  await expect(page).toHaveURL(/\/airspaces\/chicago$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Chicago' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /ORD/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: '28C', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Chicago (C90) · Vector');
  await expect(page.getByRole('link', { name: 'Create a free account to play' })).toBeVisible();

  for (const [link, heading] of [
    ['About', 'About Vector'],
    ['Terms', 'Terms of use'],
    ['Privacy', 'Privacy'],
  ] as const) {
    await page.locator('.site-footer').getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  await page.goto('/airspaces/nowhere');
  await expect(page.getByText('There’s no airspace at this address.')).toBeVisible();
});

test('an admin publishes news that visitors read, with unsafe markup removed', async ({
  page,
  browser,
}) => {
  page.on('dialog', (dialog) => void dialog.accept());
  const email = await registerPilot(page);
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
  // Granting ends the account's sign-ins.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();

  await openFromMenu(page, 'Admin');
  await page.getByRole('button', { name: 'News', exact: true }).click();
  await page.getByRole('button', { name: 'New post' }).click();
  const title = `E2E release ${Date.now().toString(36)}`;
  await page.getByLabel('Title').fill(title);
  await page.getByLabel(/^Summary/).fill('What changed this week.');
  await page
    .getByLabel('Post (Markdown)')
    .fill(
      [
        '## Highlights',
        '',
        'Dallas is **open**. <script>window.__xss = true</script>',
        '',
        '[Click me](javascript:window.__xss=true) and <img src=x onerror="window.__xss=true">',
        '',
        '[The guide](/guide)',
      ].join('\n'),
    );
  // The preview renders as it's typed.
  await expect(page.locator('.news-editor__preview strong', { hasText: 'open' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row.getByText(/^Published/)).toBeVisible();

  // A visitor sees it on the news page and the front page.
  const visitor = await browser.newPage();
  await visitor.goto('/news');
  await visitor.getByRole('link', { name: new RegExp(title) }).click();
  await expect(visitor.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(visitor).toHaveTitle(`${title} · Vector`);
  const body = visitor.locator('.news-post__body');
  await expect(body.getByRole('heading', { name: 'Highlights' })).toBeVisible();
  await expect(body.locator('strong', { hasText: 'open' })).toBeVisible();
  await expect(body.locator('script, img')).toHaveCount(0);
  await expect(body.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(body.getByRole('link', { name: 'The guide' })).toHaveAttribute('href', '/guide');
  expect(await visitor.evaluate(() => '__xss' in globalThis)).toBe(false);
  await visitor.goto('/');
  await expect(visitor.getByRole('link', { name: new RegExp(title) })).toBeVisible();

  // Unpublished, it's gone for visitors; deleted, it's gone for good.
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Unpublish' }).click();
  await expect(row.getByText('Draft')).toBeVisible();
  await visitor.goto('/news');
  await expect(visitor.getByRole('heading', { level: 1, name: 'News' })).toBeVisible();
  await expect(visitor.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);

  // Every change is in the activity log.
  await page.getByRole('button', { name: 'Activity' }).click();
  for (const action of ['Wrote a news post', 'Edited a news post', 'Deleted a news post'])
    await expect(page.getByRole('row', { name: new RegExp(`${action}.*${title}`) })).toBeVisible();
  await visitor.close();
});
