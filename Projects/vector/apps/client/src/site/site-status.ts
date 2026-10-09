import { useEffect, useSyncExternalStore } from 'react';
import type { SiteStatus } from '@vector/shared';
import { getSiteStatus } from '../api/site-api';

// What the site is doing (registration open, a banner, the community read-only),
// fetched at startup and kept fresh while the page is open.

/** Ask again this often, and when the tab comes back into view. */
const REFRESH_MS = 5 * 60_000;

/** Until the server answers: everything as normal. */
const NORMAL: SiteStatus = {
  registrationMode: 'open',
  registrationOpen: true,
  registrationMessage: '',
  banner: null,
  communityReadOnly: false,
  communityMessage: '',
  beta: false,
  version: null,
};

let status: SiteStatus = NORMAL;
let started = false;
const listeners = new Set<() => void>();

/** Fetches the status now (e.g. after an admin changes it). */
export function refreshSiteStatus(): void {
  getSiteStatus()
    .then((next) => {
      status = next;
      for (const listener of listeners) listener();
    })
    .catch(() => undefined);
}

function start() {
  if (started) return;
  started = true;
  refreshSiteStatus();
  setInterval(refreshSiteStatus, REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSiteStatus();
  });
}

export function useSiteStatus(): SiteStatus {
  useEffect(start, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
}
