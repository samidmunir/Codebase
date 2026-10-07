import {
  SCORING_KEYS,
  scoringValuesSchema,
  type AdminScoring,
  type OfficialScoring,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { AuditRepository } from '../admin/audit-repository';
import type { Authenticator } from '../auth/authenticate';
import type { ScoringRepository } from '../results/scoring-repository';

/** Official RP scoring: every session uses it; only admins change it. */
export async function scoringRoutes(
  app: FastifyInstance,
  options: { scoring: ScoringRepository; audit: AuditRepository; authenticate: Authenticator },
) {
  const { scoring, audit } = options;
  const current = async () => (await scoring.versions()).at(-1)!;

  /** The scoring a new session starts with. */
  app.get('/scoring', async (): Promise<OfficialScoring> => {
    const version = await current();
    return { values: version.values, changedAt: version.id ? version.from.toISOString() : null };
  });

  app.get(
    '/admin/scoring',
    { preHandler: options.authenticate.admin },
    async (): Promise<AdminScoring> => {
      const versions = await scoring.versions();
      const latest = versions.at(-1)!;
      return {
        current: {
          values: latest.values,
          changedAt: latest.id ? latest.from.toISOString() : null,
          changedBy: latest.createdBy,
        },
        versions: versions
          .filter((version) => version.id > 0)
          .reverse()
          .map((version) => ({
            id: version.id,
            changedAt: version.from.toISOString(),
            changedBy: version.createdBy,
          })),
      };
    },
  );

  /** A new version of the scoring (sessions under the last one keep counting for a week). */
  app.put('/admin/scoring', { preHandler: options.authenticate.admin }, async (request, reply) => {
    const values = scoringValuesSchema.parse(request.body);
    const before = (await current()).values;
    const changed = SCORING_KEYS.filter(
      (key) => JSON.stringify(values[key]) !== JSON.stringify(before[key]),
    );
    if (changed.length > 0) {
      await scoring.add(values, request.account!.id);
      await audit.record(
        { id: request.account!.id, email: request.account!.email },
        'scoring.update',
        'scoring',
        Object.fromEntries(changed.map((key) => [key, { from: before[key], to: values[key] }])),
      );
    }
    return reply.code(204).send();
  });
}
