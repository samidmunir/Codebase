import {
  adminSiteSettingsSchema,
  siteStatusSchema,
  type AdminSiteSettings,
  type SiteStatus,
  type UpdateSiteSettingsRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

export async function getSiteStatus(): Promise<SiteStatus> {
  return siteStatusSchema.parse(await apiRequest('/site'));
}

export async function getAdminSite(): Promise<AdminSiteSettings> {
  return adminSiteSettingsSchema.parse(await apiRequest('/admin/site'));
}

export async function updateAdminSite(
  request: UpdateSiteSettingsRequest,
): Promise<AdminSiteSettings> {
  return adminSiteSettingsSchema.parse(
    await apiRequest('/admin/site', { method: 'PUT', body: JSON.stringify(request) }),
  );
}
