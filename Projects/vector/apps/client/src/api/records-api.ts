import { recordsSchema, type Records, type RecordsQuery } from '@vector/shared';
import { apiRequest } from './api-client';

/** A leaderboard (public; with your own place when signed in). */
export async function getRecords(query: RecordsQuery): Promise<Records> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value));
  return recordsSchema.parse(await apiRequest(`/records?${params}`));
}
