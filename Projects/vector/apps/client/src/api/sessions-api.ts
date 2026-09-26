import {
  savedSessionListSchema,
  savedSessionSchema,
  savedSessionSummarySchema,
  type CreateSavedSessionRequest,
  type ReplaceSavedSessionRequest,
  type SavedSession,
  type SavedSessionList,
  type SavedSessionSummary,
} from '@vector/shared';
import { apiRequest } from './api-client';

// Saved sessions on the server. Snapshots are validated again by sim-core
// when a session is resumed.

export async function listSavedSessions(): Promise<SavedSessionList> {
  return savedSessionListSchema.parse(await apiRequest('/sessions'));
}

export async function getSavedSession(id: string): Promise<SavedSession> {
  return savedSessionSchema.parse(await apiRequest(`/sessions/${encodeURIComponent(id)}`));
}

export async function createSavedSession(
  request: CreateSavedSessionRequest,
): Promise<SavedSessionSummary> {
  return savedSessionSummarySchema.parse(
    await apiRequest('/sessions', { method: 'POST', body: JSON.stringify(request) }),
  );
}

export async function replaceSavedSession(
  id: string,
  request: ReplaceSavedSessionRequest,
): Promise<SavedSessionSummary> {
  return savedSessionSummarySchema.parse(
    await apiRequest(`/sessions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),
  );
}

export async function renameSavedSession(id: string, name: string): Promise<SavedSessionSummary> {
  return savedSessionSummarySchema.parse(
    await apiRequest(`/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  );
}

export async function deleteSavedSession(id: string): Promise<void> {
  await apiRequest(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
