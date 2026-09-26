import { useSyncExternalStore } from 'react';
import {
  defaultSettings,
  resolveSettings,
  userSettingsResponseSchema,
  type UserSettings,
} from '@vector/shared';
import { apiRequest } from '../api/api-client';

// User preferences. Signed in, they are saved to the player's account (and
// cached in this browser so the page works offline); signed out, they stay in
// this browser only.

const STORAGE_KEY = 'vector.userSettings';
/** Wait for the player to finish adjusting before saving. */
const SAVE_DELAY_MS = 500;

function loadLocal(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return resolveSettings('user', stored ? (JSON.parse(stored) as unknown) : {}).values;
  } catch {
    return defaultSettings('user');
  }
}

function saveLocal(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private browsing); settings still apply for this visit.
  }
}

let current: UserSettings = loadLocal();
const listeners = new Set<() => void>();
let syncing = false;
let pending: Partial<UserSettings> = {};
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function publish(next: UserSettings): void {
  current = next;
  saveLocal(next);
  for (const listener of listeners) listener();
}

async function flush(): Promise<void> {
  const patch = pending;
  pending = {};
  if (!syncing || Object.keys(patch).length === 0) return;
  try {
    await apiRequest('/settings', { method: 'PUT', body: JSON.stringify(patch) });
  } catch {
    // Keep the change locally; it will be sent with the next save.
    pending = { ...patch, ...pending };
  }
}

export const userSettings = {
  get(): UserSettings {
    return current;
  },
  update(patch: Partial<UserSettings>): void {
    publish({ ...current, ...patch });
    if (!syncing) return;
    pending = { ...pending, ...patch };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flush(), SAVE_DELAY_MS);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Starts syncing with the signed-in account: loads the account's settings, or
 * on first sign-in uploads the preferences already set in this browser.
 */
export async function syncUserSettings(): Promise<void> {
  syncing = true;
  try {
    const response = userSettingsResponseSchema.parse(await apiRequest('/settings'));
    const local = current;
    const defaults = defaultSettings('user');
    const localChanges = Object.fromEntries(
      Object.entries(local).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(defaults[key as keyof UserSettings]),
      ),
    ) as Partial<UserSettings>;

    if (response.updatedAt === null && Object.keys(localChanges).length > 0) {
      pending = { ...pending, ...localChanges };
      await flush();
    } else {
      publish(resolveSettings('user', response.settings).values);
    }
  } catch {
    // Offline or server unavailable: keep using local settings.
  }
}

export function stopSettingsSync(): void {
  syncing = false;
  pending = {};
  clearTimeout(saveTimer);
}

export function useUserSettings(): UserSettings {
  return useSyncExternalStore(userSettings.subscribe, userSettings.get);
}
