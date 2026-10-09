import {
  OFFICIAL_KEYS,
  officialValuesSchema,
  type AdminSessionRules,
  type OfficialSettings,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { AuditRepository } from '../admin/audit-repository';
import type { Authenticator } from '../auth/authenticate';
import type { SessionRulesRepository } from '../results/session-rules-repository';

/** The official settings (scoring, rules, conditions): every session uses them; only admins change them. */
export async function sessionRulesRoutes(
  app: FastifyInstance,
  options: { rules: SessionRulesRepository; audit: AuditRepository; authenticate: Authenticator },
) {
  const { rules, audit } = options;
  const current = async () => (await rules.versions()).at(-1)!;

  /** What a new session starts with. */
  app.get('/session-rules', async (): Promise<OfficialSettings> => {
    const version = await current();
    return { values: version.values, changedAt: version.id ? version.from.toISOString() : null };
  });

  app.get(
    '/admin/session-rules',
    { preHandler: options.authenticate.admin },
    async (): Promise<AdminSessionRules> => {
      const versions = await rules.versions();
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

  /** A new version (sessions under the last one keep counting for a week). */
  app.put(
    '/admin/session-rules',
    { preHandler: options.authenticate.admin },
    async (request, reply) => {
      const values = officialValuesSchema.parse(request.body);
      const before = (await current()).values;
      const changed = OFFICIAL_KEYS.filter(
        (key) => JSON.stringify(values[key]) !== JSON.stringify(before[key]),
      );
      if (changed.length > 0) {
        await rules.add(values, request.account!.id);
        await audit.record(
          { id: request.account!.id, email: request.account!.email },
          'rules.update',
          'session rules',
          Object.fromEntries(changed.map((key) => [key, { from: before[key], to: values[key] }])),
        );
      }
      return reply.code(204).send();
    },
  );
}
