import { releaseRequestSchema, type Release, type ReleaseList } from '@vector/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuditRepository } from '../admin/audit-repository';
import type { Authenticator } from '../auth/authenticate';
import { ReleaseNotFoundError, type ReleasesRepository } from '../releases/releases-repository';

/** Releases: anyone reads them (the roadmap); admins write them. */
export async function releasesRoutes(
  app: FastifyInstance,
  options: { releases: ReleasesRepository; audit: AuditRepository; authenticate: Authenticator },
) {
  const { releases, audit } = options;
  const admin = { preHandler: options.authenticate.admin };
  const actor = (request: FastifyRequest) => ({
    id: request.account!.id,
    email: request.account!.email,
  });
  const releaseId = (request: FastifyRequest) => {
    const parsed = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!parsed.success) throw new ReleaseNotFoundError();
    return parsed.data.id;
  };
  const describe = (release: Release) => ({
    status: release.status,
    features: release.features.length,
  });

  app.get('/releases', async (): Promise<ReleaseList> => ({ releases: await releases.list() }));

  app.post('/admin/releases', admin, async (request, reply): Promise<Release> => {
    const release = await releases.create(releaseRequestSchema.parse(request.body));
    await audit.record(actor(request), 'release.create', `v${release.version}`, describe(release));
    return reply.code(201).send(release);
  });

  app.put('/admin/releases/:id', admin, async (request): Promise<Release> => {
    const release = await releases.update(
      releaseId(request),
      releaseRequestSchema.parse(request.body),
    );
    await audit.record(actor(request), 'release.update', `v${release.version}`, describe(release));
    return release;
  });

  app.delete('/admin/releases/:id', admin, async (request, reply) => {
    const release = await releases.delete(releaseId(request));
    await audit.record(actor(request), 'release.delete', `v${release.version}`);
    return reply.code(204).send();
  });
}
