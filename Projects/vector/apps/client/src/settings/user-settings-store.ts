import { useSyncExternalStore } from 'react';
import { resolveSettings, type UserSettings } from '@vector/shared';

// User preferences. Until accounts arrive (Milestone 10) they are kept in this
// browser; afterwards they sync to the player's account.

const STORAGE_KEY = 'vector.userSettings';

function load(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return resolveSettings('user', stored ? (JSON.parse(stored) as unknown) : {}).values;
  } catch {
    return resolveSettings('user', {}).values;
  }
}

let current: UserSettings = load();
const listeners = new Set<() => void>();

export const userSettings = {
  get(): UserSettings {
    return current;
  },
  update(patch: Partial<UserSettings>): void {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Storage can be unavailable (private browsing); settings still apply for this visit.
    }
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useUserSettings(): UserSettings {
  return useSyncExternalStore(userSettings.subscribe, userSettings.get);
}
