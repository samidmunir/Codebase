import {
  accountSchema,
  handleAvailabilitySchema,
  type Account,
  type ChangePasswordRequest,
  type DeleteAccountRequest,
  type HandleAvailability,
  type UpdateProfileRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

// The signed-in pilot's own account.

export async function getAccount(): Promise<Account> {
  return accountSchema.parse(await apiRequest('/account'));
}

export async function updateProfile(request: UpdateProfileRequest): Promise<Account> {
  return accountSchema.parse(
    await apiRequest('/account', { method: 'PATCH', body: JSON.stringify(request) }),
  );
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiRequest('/auth/password', { method: 'POST', body: JSON.stringify(request) });
}

export async function signOutOtherDevices(): Promise<void> {
  await apiRequest('/auth/sign-out-others', { method: 'POST' });
}

export async function deleteAccount(request: DeleteAccountRequest): Promise<void> {
  await apiRequest('/account', { method: 'DELETE', body: JSON.stringify(request) });
}

/** Whether a handle is free (works signed out, for registration). */
export async function checkHandle(handle: string): Promise<HandleAvailability> {
  const response = await fetch(`/api/handles/${encodeURIComponent(handle)}`);
  return handleAvailabilitySchema.parse(await response.json());
}
