import {
  releaseListSchema,
  releaseSchema,
  type Release,
  type ReleaseRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

// Releases: the roadmap (public), and editing it (admins).

export async function getReleases(): Promise<Release[]> {
  return releaseListSchema.parse(await apiRequest('/releases')).releases;
}

export async function createRelease(request: ReleaseRequest): Promise<Release> {
  return releaseSchema.parse(
    await apiRequest('/admin/releases', { method: 'POST', body: JSON.stringify(request) }),
  );
}

export async function updateRelease(id: string, request: ReleaseRequest): Promise<Release> {
  return releaseSchema.parse(
    await apiRequest(`/admin/releases/${id}`, { method: 'PUT', body: JSON.stringify(request) }),
  );
}

export async function deleteRelease(id: string): Promise<void> {
  await apiRequest(`/admin/releases/${id}`, { method: 'DELETE' });
}
