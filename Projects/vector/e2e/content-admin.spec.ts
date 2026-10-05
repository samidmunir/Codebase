import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { accountMenu, openFromMenu, registerPilot } from './helpers';

const root = fileURLToPath(new URL('..', import.meta.url));

test('an admin manages categories, finds and edits any post, and sees every saved session', async ({
  page,
}) => {
  page.on('dialog', (dialog) => void dialog.accept());
  const email = await registerPilot(page);
  execFileSync('npx', ['tsx', 'apps/server/src/cli/admin.ts', 'grant', email, '--test'], {
    cwd: root,
    stdio: 'pipe',
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(accountMenu(page)).toBeVisible();
  await openFromMenu(page, 'Admin');
  await page.getByRole('button', { name: 'Community', exact: true }).click();

  // A new category, which shows on the Community page.
  const stamp = Date.now().toString(36);
  const name = `Tower talk ${stamp}`;
  const sections = page.getByRole('navigation', { name: 'Community' });
  await sections.getByRole('button', { name: 'Categories' }).click();
  await page.getByRole('button', { name: 'New category' }).click();
  const form = page.getByRole('form', { name: 'New category' });
  await form.getByLabel('Name').fill(name);
  await expect(form.getByText(`/community/tower-talk-${stamp}`)).toBeVisible();
  await form.getByLabel('Description').fill('Ground, tower and ramp.');
  await form.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByText(`Created “${name}”.`)).toBeVisible();

  // Post in it, then find and edit the post from the admin pages.
  await page.goto(`/community/tower-talk-${stamp}/new`);
  await page.getByLabel('Title').fill(`Ramp frequencies ${stamp}`);
  await page.getByLabel('Post', { exact: true }).fill(`Original text ${stamp}`);
  await page.getByRole('button', { name: 'Post thread' }).click();
  await expect(page.getByText(`Original text ${stamp}`)).toBeVisible();

  await page.goto('/admin?tab=community&section=posts');
  await page.getByLabel('Search posts').fill(stamp);
  const post = page.getByRole('listitem', { name: `Post in Ramp frequencies ${stamp}` });
  await expect(post).toContainText(`Original text ${stamp}`);
  await post.getByRole('button', { name: 'Edit' }).click();
  await post.getByLabel('Post text').fill(`Edited by staff ${stamp}`);
  await post.getByRole('button', { name: 'Save edit' }).click();
  await expect(page.getByText('Post edited.')).toBeVisible();
  await expect(post).toContainText('edited');

  // Delete the category, moving its thread to General.
  await page
    .getByRole('navigation', { name: 'Community' })
    .getByRole('button', { name: 'Categories' })
    .click();
  const row = page.locator('.admin-categories li', { hasText: name });
  await row.getByRole('button', { name: 'Delete' }).click();
  await row.getByRole('combobox').selectOption('general');
  await row.getByRole('button', { name: 'Move and delete' }).click();
  await expect(page.getByText(`Moved its threads and deleted “${name}”.`)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Community' })
    .getByRole('button', { name: 'Threads' })
    .click();
  await page.getByLabel('Search threads').fill(stamp);
  await expect(
    page.getByRole('combobox', { name: `Move “Ramp frequencies ${stamp}”` }),
  ).toHaveValue('general');

  // Every saved session, and the records' filters.
  await page.getByRole('button', { name: 'Saved sessions' }).click();
  await expect(page.getByLabel('Search saved sessions')).toBeVisible();
  await page.getByRole('button', { name: 'Results' }).click();
  await page.getByLabel('Order').selectOption('rp');
  await expect(page.getByLabel('Airspace')).toBeVisible();

  await page.getByRole('button', { name: 'Activity' }).click();
  for (const action of ['Created a category', 'Edited a community post', 'Deleted a category'])
    await expect(page.locator('.admin-table tbody')).toContainText(action);
});
