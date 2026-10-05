import {
  updateSiteSettingsRequestSchema,
  type AdminSiteSettings,
  type SiteStatus,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { Authenticator } from '../auth/authenticate';
import type { SiteSettingsRepository } from '../site/site-settings-repository';

export interface SiteRouteOptions {
  site: SiteSettingsRepository;
  authenticate: Authenticator;
}

/** What the site is doing (for everyone), and the switches (for admins). */
export async function siteRoutes(app: FastifyInstance, options: SiteRouteOptions) {
  const { site } = options;
  const admin = { preHandler: options.authenticate.admin };

  app.get('/site', async (_request, reply): Promise<SiteStatus> => {
    reply.header('cache-control', 'no-store');
    return site.status();
  });

  app.get('/admin/site', admin, async (): Promise<AdminSiteSettings> => site.admin());

  app.put('/admin/site', admin, async (request): Promise<AdminSiteSettings> => {
    await site.update(
      { id: request.account!.id, email: request.account!.email },
      updateSiteSettingsRequestSchema.parse(request.body),
    );
    return site.admin();
  });
}
