import { parseSettingsPatch, type UserSettingsResponse } from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { Authenticator } from '../auth/authenticate';
import type { SettingsRepository } from '../settings/settings-repository';

export interface SettingsRouteOptions {
  settings: SettingsRepository;
  authenticate: Authenticator;
}

export async function settingsRoutes(app: FastifyInstance, options: SettingsRouteOptions) {
  const preHandler = options.authenticate.user;

  app.get('/settings', { preHandler }, async (request): Promise<UserSettingsResponse> => {
    const { settings, updatedAt } = await options.settings.get(request.userId!);
    return { settings, updatedAt: updatedAt?.toISOString() ?? null };
  });

  /** Applies a partial update; any unknown key or invalid value rejects the whole update. */
  app.put('/settings', { preHandler }, async (request): Promise<UserSettingsResponse> => {
    const patch = parseSettingsPatch('user', request.body);
    const current = await options.settings.get(request.userId!);
    const settings = { ...current.settings, ...patch };
    const updatedAt = await options.settings.save(request.userId!, settings);
    return { settings, updatedAt: updatedAt.toISOString() };
  });
}
