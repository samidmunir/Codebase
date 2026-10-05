import {
  adminAirspaceListSchema,
  adminResultListSchema,
  type AdminResultList,
  type AdminResultListQuery,
  adminAirspaceSchema,
  adminSummarySchema,
  adminUserDetailSchema,
  adminUserListSchema,
  adminUserSchema,
  auditLogSchema,
  type AdminAirspace,
  type AdminCreateUserRequest,
  type AdminSummary,
  type AdminUpdateUserRequest,
  type AdminUser,
  type AdminUserDetail,
  type AdminUserList,
  type AdminUserListQuery,
  type AuditEntry,
  adminStatsSchema,
  type AdminStats,
  type StatsRange,
  adminBulkResultSchema,
  type AdminBulkRequest,
  type AdminBulkResult,
} from '@vector/shared';
import { apiDownload, apiRequest } from './api-client';

// The administration API (/api/admin). The server checks the admin role on every request.

const user = (id: string) => `/admin/users/${encodeURIComponent(id)}`;

export async function getAdminStats(range: StatsRange): Promise<AdminStats> {
  return adminStatsSchema.parse(await apiRequest(`/admin/stats?range=${range}`));
}

export async function getAdminSummary(): Promise<AdminSummary> {
  return adminSummarySchema.parse(await apiRequest('/admin/summary'));
}

export async function listAdminUsers(query: AdminUserListQuery = {}): Promise<AdminUserList> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  const search = params.size > 0 ? `?${params}` : '';
  return adminUserListSchema.parse(await apiRequest(`/admin/users${search}`));
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  return adminUserDetailSchema.parse(await apiRequest(user(id)));
}

export async function createAdminUser(request: AdminCreateUserRequest): Promise<AdminUser> {
  return adminUserSchema.parse(
    await apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(request) }),
  );
}

export async function updateAdminUser(
  id: string,
  request: AdminUpdateUserRequest,
): Promise<AdminUser> {
  return adminUserSchema.parse(
    await apiRequest(user(id), { method: 'PATCH', body: JSON.stringify(request) }),
  );
}

export async function deleteAdminUser(id: string): Promise<void> {
  await apiRequest(user(id), { method: 'DELETE' });
}

export async function signOutAdminUser(id: string): Promise<void> {
  await apiRequest(`${user(id)}/sign-out`, { method: 'POST' });
}

export async function deleteAdminUserSession(id: string, sessionId: string): Promise<void> {
  await apiRequest(`${user(id)}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}

export async function listAdminAirspaces(): Promise<AdminAirspace[]> {
  return adminAirspaceListSchema.parse(await apiRequest('/admin/airspaces')).airspaces;
}

export async function setAdminAirspace(id: string, enabled: boolean): Promise<AdminAirspace> {
  return adminAirspaceSchema.parse(
    await apiRequest(`/admin/airspaces/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  );
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return auditLogSchema.parse(await apiRequest('/admin/audit')).entries;
}

export async function listAdminResults(query: AdminResultListQuery = {}): Promise<AdminResultList> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return adminResultListSchema.parse(await apiRequest(`/admin/results?${params}`));
}

export async function setAdminResultHidden(id: string, hidden: boolean): Promise<void> {
  await apiRequest(`/admin/results/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ hidden }),
  });
}

export async function reverifyAdminResult(id: string): Promise<void> {
  await apiRequest(`/admin/results/${encodeURIComponent(id)}/verify`, { method: 'POST' });
}

export const endAdminSignIn = (userId: string, signInId: string) =>
  apiRequest<void>(`/admin/users/${userId}/sign-ins/${signInId}`, { method: 'DELETE' });

export const sendAdminPasswordReset = (userId: string) =>
  apiRequest<void>(`/admin/users/${userId}/send-reset`, { method: 'POST' });

export const sendAdminVerification = (userId: string) =>
  apiRequest<void>(`/admin/users/${userId}/send-verification`, { method: 'POST' });

export async function bulkAdminUsers(request: AdminBulkRequest): Promise<AdminBulkResult> {
  return adminBulkResultSchema.parse(
    await apiRequest('/admin/users/bulk', { method: 'POST', body: JSON.stringify(request) }),
  );
}

/** Downloads the users matching the filters as a CSV file. */
export async function exportAdminUsers(query: Omit<AdminUserListQuery, 'offset' | 'limit'>) {
  const params = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const blob = await apiDownload(`/admin/users/export.csv?${params.toString()}`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vector-users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Suspends a pilot from posting, or lifts it (moderators and admins). */
export const setPostingSuspension = (
  handle: string,
  postingSuspension: number | 'forever' | 'lift',
) =>
  apiRequest<unknown>(`/admin/community/users/${encodeURIComponent(handle)}/suspension`, {
    method: 'POST',
    body: JSON.stringify({ postingSuspension }),
  });
