import {
  adminSessionRulesSchema,
  defaultOfficial,
  officialSettingsSchema,
  officialValuesSchema,
  type AdminSessionRules,
  type OfficialValues,
} from '@vector/shared';
import { apiRequest } from './api-client';

// The official settings (scoring, the rules, the conditions): every new session uses
// them, and admins change them.

/** What a session starts with (the defaults if the server can't be reached). */
export async function getOfficialSettings(): Promise<OfficialValues> {
  try {
    const { values } = officialSettingsSchema.parse(await apiRequest('/session-rules'));
    return officialValuesSchema.parse(values);
  } catch {
    return defaultOfficial();
  }
}

export async function getAdminSessionRules(): Promise<AdminSessionRules> {
  return adminSessionRulesSchema.parse(await apiRequest('/admin/session-rules'));
}

export async function updateSessionRules(values: OfficialValues): Promise<void> {
  await apiRequest('/admin/session-rules', { method: 'PUT', body: JSON.stringify(values) });
}
