import { expect, type Page } from '@playwright/test';

/** Registers a new account with a unique email and lands on the start screen. */
export async function registerPilot(page: Page): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Display name').fill('E2E Pilot');
  await page
    .getByLabel('Email')
    .fill(`e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();
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
