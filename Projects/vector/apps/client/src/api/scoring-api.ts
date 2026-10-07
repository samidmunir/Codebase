import {
  adminScoringSchema,
  defaultScoring,
  officialScoringSchema,
  scoringValuesSchema,
  type AdminScoring,
  type ScoringValues,
} from '@vector/shared';
import { apiRequest } from './api-client';

// The official RP scoring: every new session uses it (admins change it).

/** The scoring to start a session with (the defaults if the server can't be reached). */
export async function getOfficialScoring(): Promise<ScoringValues> {
  try {
    const { values } = officialScoringSchema.parse(await apiRequest('/scoring'));
    return scoringValuesSchema.parse(values);
  } catch {
    return defaultScoring();
  }
}

export async function getAdminScoring(): Promise<AdminScoring> {
  return adminScoringSchema.parse(await apiRequest('/admin/scoring'));
}

export async function updateAdminScoring(values: ScoringValues): Promise<void> {
  await apiRequest('/admin/scoring', { method: 'PUT', body: JSON.stringify(values) });
}
