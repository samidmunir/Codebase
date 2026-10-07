import { useSyncExternalStore } from 'react';

// Which build of Vector this tab is running, and whether the server has a newer
// one. Each deploy replaces the hashed files (code and airspace data) an older tab
// would ask for, so a tab that's out of date offers a reload instead of failing.

declare const __BUILD_ID__: string;

/** This tab's build (set by vite.config.ts; 'dev' in development). */
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Ask again this often, and when the tab comes back into view. */
const CHECK_MS = 5 * 60_000;

let outdated = false;
let started = false;
const listeners = new Set<() => void>();

/** This tab is out of date (a newer build is live, or one of its files is gone). */
export function markOutdated(): void {
  if (outdated) return;
  outdated = true;
  for (const listener of listeners) listener();
}

/** Asks the server which build it's serving now. */
async function check(): Promise<void> {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    if (!response.ok) return;
    const { build } = (await response.json()) as { build?: string };
    if (build && build !== BUILD_ID) markOutdated();
  } catch {
    // Offline: try again later.
  }
}

/** Starts watching for new builds (only a built app has a version to compare). */
export function watchForUpdates(): void {
  if (started || BUILD_ID === 'dev') return;
  started = true;
  setInterval(() => void check(), CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  // A part of the app that's no longer on the server (after a deploy).
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    markOutdated();
  });
}

/** True once this tab is out of date. */
export function useAppOutdated(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => outdated,
  );
}

/**
 * A failed load of one of the app's own files: if it's gone, the tab is out of date.
 * Returns the message to show.
 */
export function missingFileMessage(status: number, what: string): string {
  if (status === 404) {
    markOutdated();
    return `Vector has been updated since this page was opened. Reload to load ${what}.`;
  }
  return `Couldn’t load ${what} (${status}). Check your connection and try again.`;
}
