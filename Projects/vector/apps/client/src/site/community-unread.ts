import { useEffect, useSyncExternalStore } from 'react';
import { getFollowing } from '../api/community-api';
import { useAuth } from '../auth/auth-store';

// How many followed threads have posts the pilot hasn't read, for the header.

/** Don't ask more often than this while moving around the site. */
const REFRESH_MS = 60_000;

let unread = 0;
let fetchedAt = 0;
const listeners = new Set<() => void>();

function set(next: number) {
  unread = next;
  for (const listener of listeners) listener();
}

/** Asks the server again (now, or only if it's been a while). */
export function refreshCommunityUnread(force = true): void {
  if (!force && Date.now() - fetchedAt < REFRESH_MS) return;
  fetchedAt = Date.now();
  getFollowing()
    .then((following) => set(following.unread))
    .catch(() => undefined);
}

/** The count, kept fresh while signed in. */
export function useCommunityUnread(path: string): number {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  useEffect(() => {
    if (signedIn) refreshCommunityUnread(false);
    else {
      fetchedAt = 0;
      set(0);
    }
  }, [signedIn, path]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unread,
  );
}
