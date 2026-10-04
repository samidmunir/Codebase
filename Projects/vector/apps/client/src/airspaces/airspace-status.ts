import { useEffect, useSyncExternalStore } from 'react';
import { airspaceStatusListSchema } from '@vector/shared';

// Which airspaces are open to players, from the server. An admin can close one;
// until the list arrives (or if it can't be fetched), every airspace counts as open
// and the server still refuses sessions in a closed one.

let closed = new Set<string>();
let loaded = false;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Fetches the list again (on the start screen, and after an admin changes it). */
export function refreshAirspaceStatus(): Promise<void> {
  loading ??= (async () => {
    try {
      const response = await fetch('/api/airspaces');
      if (!response.ok) return;
      const { airspaces } = airspaceStatusListSchema.parse(await response.json());
      closed = new Set(airspaces.filter((a) => !a.enabled).map((a) => a.id));
      loaded = true;
      notify();
    } catch {
      // Keep what we had.
    }
  })().finally(() => {
    loading = undefined;
  });
  return loading;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The closed airspaces (and whether the list has arrived), refreshed when first used. */
export function useAirspaceStatus(): { isOpen: (id: string) => boolean; loaded: boolean } {
  useEffect(() => {
    void refreshAirspaceStatus();
  }, []);
  const snapshot = useSyncExternalStore(subscribe, () => closed);
  const isLoaded = useSyncExternalStore(subscribe, () => loaded);
  return { isOpen: (id) => !snapshot.has(id), loaded: isLoaded };
}
