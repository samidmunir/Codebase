import { useSyncExternalStore } from 'react';
import { authUserSchema, type AuthUser } from '@vector/shared';
import * as api from '../api/api-client';
import { stopSettingsSync, syncUserSettings } from '../settings/user-settings-store';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: AuthUser };

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();

function set(next: AuthState): void {
  state = next;
  for (const listener of listeners) listener();
}

async function signedIn(user: AuthUser): Promise<void> {
  set({ status: 'signedIn', user });
  await syncUserSettings();
}

api.setSessionEndedHandler(() => {
  stopSettingsSync();
  set({ status: 'signedOut' });
});

export const auth = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Restores the session from the refresh cookie, once at startup. */
  async restore(): Promise<void> {
    try {
      const session = await api.refreshSession();
      if (session) await signedIn(session.user);
      else set({ status: 'signedOut' });
    } catch {
      set({ status: 'signedOut' });
    }
  },

  async login(email: string, password: string): Promise<void> {
    await signedIn((await api.login(email, password)).user);
  },

  async register(
    email: string,
    password: string,
    displayName: string,
    handle: string,
    inviteCode?: string,
  ): Promise<void> {
    await signedIn((await api.register(email, password, displayName, handle, inviteCode)).user);
  },

  /** Reloads the signed-in user from the server (after their email changes or is verified). */
  async reload(): Promise<void> {
    if (state.status !== 'signedIn') return;
    const response = await api.apiRequest<{ user: unknown }>('/auth/me');
    set({ status: 'signedIn', user: authUserSchema.parse(response.user) });
  },

  /** After the account page changes the handle or display name. */
  updateUser(changes: Partial<AuthUser>): void {
    if (state.status === 'signedIn')
      set({ status: 'signedIn', user: { ...state.user, ...changes } });
  },

  /** After deleting the account: the session is gone on the server already. */
  signedOutLocally(): void {
    stopSettingsSync();
    api.clearSession();
    set({ status: 'signedOut' });
  },

  async logout(): Promise<void> {
    stopSettingsSync();
    await api.logout();
    set({ status: 'signedOut' });
  },
};

export function useAuth(): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.get);
}
