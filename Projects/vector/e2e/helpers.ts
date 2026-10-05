import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { EMAIL_OUTBOX } from './outbox';

/** Registers a new account with a unique email and lands on the start screen. Returns the email. */
export async function registerPilot(page: Page): Promise<string> {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const email = `e2e-${id}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Display name').fill('E2E Pilot');
  await page.getByLabel('Handle').fill(`e2e_${id}`.slice(0, 20));
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(accountMenu(page)).toBeVisible();
  return email;
}

/** The signed-in pilot's menu button in the site header. */
export const accountMenu = (page: Page) => page.locator('.account-menu__button');

/** Opens the account menu and follows one of its links (Account, Settings, Admin…). */
export async function openFromMenu(page: Page, item: string): Promise<void> {
  await accountMenu(page).click();
  await page.getByRole('menuitem', { name: item }).click();
}

/** Opens session setup for an airspace from the start screen. */
export async function newSession(page: Page, airspace: string): Promise<void> {
  await page.locator('.airspace-card', { hasText: airspace }).click();
}

interface ScopeState {
  tick: number;
  paused: boolean;
  aircraft: number;
  savedName: string | undefined;
  settings: Record<string, unknown>;
  runways: Record<string, { arrivals: string[]; departures: string[] }>;
  winds: Record<string, { directionDeg: number; speedKts: number }>;
}

/** The parts of the scope session the tests read (the client's ScopeSession). */
interface ScopeSessionHandle {
  saved?: { name: string };
  engine: {
    tick: number;
    paused: boolean;
    settings: Record<string, unknown>;
    activeRunways: ScopeState['runways'];
    winds: ScopeState['winds'];
    listAircraft(): unknown[];
  };
}

/** Reads the running session through the development-only `window.__vector` hook. */
export async function scopeState(page: Page): Promise<ScopeState> {
  await page.waitForFunction(() => '__vector' in globalThis);
  return page.evaluate(() => {
    const session = (globalThis as unknown as { __vector: ScopeSessionHandle }).__vector;
    return {
      tick: session.engine.tick,
      paused: session.engine.paused,
      aircraft: session.engine.listAircraft().length,
      savedName: session.saved?.name,
      settings: session.engine.settings,
      runways: session.engine.activeRunways,
      winds: session.engine.winds,
    };
  });
}

interface SentEmail {
  to: string;
  subject: string;
  text: string;
}

function sentTo(address: string): SentEmail[] {
  let files: string[];
  try {
    files = readdirSync(EMAIL_OUTBOX).sort();
  } catch {
    return []; // Nothing sent yet.
  }
  return files
    .map((file) => JSON.parse(readFileSync(join(EMAIL_OUTBOX, file), 'utf8')) as SentEmail)
    .filter((email) => email.to === address);
}

/**
 * The link in the latest email to an address with this subject, as a path on the
 * client (e.g. "/verify-email#…"). Waits for it to arrive.
 */
export async function emailLink(address: string, subject: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(() => {
      const email = sentTo(address).findLast((e) => e.subject === subject);
      link = email && /https?:\/\/[^/\s]+(\/[a-z-]+#[A-Za-z0-9_-]{43})/.exec(email.text)?.[1];
      return link;
    })
    .toBeTruthy();
  return link!;
}

/** How many emails have gone to an address. */
export const emailsTo = (address: string) => sentTo(address).length;

/** Verifies a pilot's email by opening the link they were sent. */
export async function verifyEmail(page: Page, email: string): Promise<void> {
  await page.goto(await emailLink(email, 'Verify your email for Vector'));
  await expect(page.getByText('Your email is verified.')).toBeVisible();
}
