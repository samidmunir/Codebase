import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot, verifyEmail } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

/** A signed-in, verified pilot in a browser of their own. */
async function pilot(browser: Browser): Promise<{ page: Page; email: string; handle: string }> {
  const page = await browser.newPage();
  const email = await registerPilot(page);
  await verifyEmail(page, email);
  // registerPilot makes the handle from the same id as the email.
  const handle = `e2e_${email.slice('e2e-'.length, -'@example.com'.length)}`.slice(0, 20);
  return { page, email, handle };
}

test('pilots talk in threads: posting safely, replying, quoting and following', async ({
  page,
  browser,
}) => {
  // Anyone can read; posting needs a verified email.
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Community' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Community' })).toBeVisible();
  await expect(page.locator('.forum-category', { hasText: 'Techniques' })).toBeVisible();
  const rookie = await registerPilot(page);
  expect(rookie).toBeTruthy();
  await page.goto('/community/techniques');
  await expect(page.getByText('Verify your email to post')).toBeVisible();
  await expect(page.getByRole('link', { name: 'New thread' })).toHaveCount(0);

  const ace = await pilot(browser);
  await ace.page.goto('/community/techniques');
  await ace.page.getByRole('link', { name: 'New thread' }).click();
  const title = `Spacing the JFK rush ${Date.now().toString(36)}`;
  await ace.page.getByLabel('Title').fill(title);
  await ace.page
    .getByLabel('Post', { exact: true })
    .fill(
      'Speed control **early**. <script>window.__xss = true</script> <img src=x onerror="window.__xss = true">',
    );
  await ace.page.getByRole('tab', { name: 'Preview' }).click();
  await expect(ace.page.locator('.forum-composer__preview strong')).toHaveText('early');
  await ace.page.getByRole('button', { name: 'Post thread' }).click();

  await expect(ace.page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const opening = ace.page.locator('.forum-post').first();
  await expect(opening.locator('strong')).toHaveText('early');
  // Raw HTML shows as the text that was typed, and never runs.
  await expect(opening).toContainText('<script>window.__xss = true</script>');
  await expect(opening.locator('script, img')).toHaveCount(0);
  expect(await ace.page.evaluate(() => '__xss' in globalThis)).toBe(false);
  const threadUrl = ace.page.url();

  // Another pilot quotes it, replies and marks it useful.
  const bravo = await pilot(browser);
  await bravo.page.goto(threadUrl);
  await bravo.page.locator('.forum-post').first().getByRole('button', { name: 'Quote' }).click();
  await expect(bravo.page.getByLabel('Your reply')).toHaveValue(new RegExp(`@${ace.handle}`));
  await bravo.page.getByLabel('Your reply').press('End');
  await bravo.page.getByLabel('Your reply').pressSequentially('Agreed, and slow them at the fix.');
  await bravo.page.getByRole('button', { name: 'Post reply' }).click();
  const reply = bravo.page.locator('.forum-post').nth(1);
  await expect(reply).toContainText('Agreed, and slow them at the fix.');
  await expect(reply.locator('blockquote')).toContainText(`@${ace.handle} wrote:`);
  await bravo.page.locator('.forum-post').first().getByRole('button', { name: 'Useful' }).click();
  await expect(
    bravo.page.locator('.forum-post').first().getByRole('button', { name: 'Useful · 1' }),
  ).toBeVisible();

  // Ace follows his thread, so the header tells him about the reply.
  await ace.page.goto('/community');
  const badge = ace.page.getByRole('banner').locator('.site-header__badge');
  await expect(badge).toHaveText('1');
  await expect(ace.page.getByRole('region', { name: 'Following' }).getByText('New')).toBeVisible();
  await ace.page.goto(threadUrl);
  await expect(ace.page.getByText('Agreed, and slow them at the fix.')).toBeVisible();
  await expect(badge).toHaveCount(0);

  // Ace can edit his post for a while; Bravo can't.
  await ace.page.locator('.forum-post').first().getByRole('button', { name: 'Edit' }).click();
  await ace.page.getByLabel('Edit your post').fill('Speed control **early**, at the feeder fix.');
  await ace.page.getByRole('button', { name: 'Save' }).click();
  await expect(ace.page.locator('.forum-post').first()).toContainText('at the feeder fix');
  await expect(ace.page.locator('.forum-post').first()).toContainText('edited');
  await expect(
    bravo.page.locator('.forum-post').first().getByRole('button', { name: 'Edit' }),
  ).toHaveCount(0);

  await ace.page.close();
  await bravo.page.close();
});

test('pilots report posts, and an admin hides them and locks the thread', async ({
  page,
  browser,
}) => {
  page.on('dialog', (dialog) => void dialog.accept());
  const ace = await pilot(browser);
  await ace.page.goto('/community/general/new');
  const stamp = Date.now().toString(36);
  const title = `Rude thread ${stamp}`;
  await ace.page.getByLabel('Title').fill(title);
  await ace.page.getByLabel('Post', { exact: true }).fill(`Something unkind ${stamp}.`);
  await ace.page.getByRole('button', { name: 'Post thread' }).click();
  await expect(ace.page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const threadUrl = ace.page.url();

  const bravo = await pilot(browser);
  await bravo.page.goto(threadUrl);
  await bravo.page.locator('.forum-post').first().getByRole('button', { name: 'Report' }).click();
  await bravo.page.getByLabel('What’s wrong with this post?').fill('Not kind to other pilots');
  await bravo.page.getByRole('button', { name: 'Send report' }).click();
  await expect(bravo.page.getByText('Thanks. The Vector team will take a look.')).toBeVisible();

  // An admin sees the report, and hides the post.
  const email = await registerPilot(page);
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();
  await openFromMenu(page, 'Admin');
  await page.getByRole('button', { name: 'Community', exact: true }).click();
  const report = page.getByRole('article', { name: `Report on a post in ${title}` });
  await expect(report).toContainText('Not kind to other pilots');
  await expect(report).toContainText(`Something unkind ${stamp}.`);
  await report.getByRole('button', { name: 'Hide post' }).click();
  await expect(page.getByText('Post hidden.')).toBeVisible();
  await expect(report).toHaveCount(0);

  await bravo.page.reload();
  await expect(bravo.page.getByText('A moderator hid this post.')).toBeVisible();
  await expect(bravo.page.getByText(`Something unkind ${stamp}.`)).toHaveCount(0);

  // The admin locks the thread from its page.
  await page.goto(threadUrl);
  await expect(page.getByText('Hidden from pilots')).toBeVisible();
  await page
    .getByRole('group', { name: 'Moderate thread' })
    .getByRole('button', { name: 'Lock' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Locked');
  await bravo.page.reload();
  await expect(bravo.page.getByText('This thread is locked')).toBeVisible();
  await expect(bravo.page.getByLabel('Your reply')).toHaveCount(0);

  // And it's all in the activity log.
  await page.goto('/admin?tab=activity');
  await expect(
    page.getByRole('row', { name: new RegExp(`Hid a community post.*Something unkind ${stamp}`) }),
  ).toBeVisible();
  await expect(
    page.getByRole('row', { name: new RegExp(`Moderated a thread.*${title}.*locked`) }),
  ).toBeVisible();

  await ace.page.close();
  await bravo.page.close();
});
