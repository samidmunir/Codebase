import { recordsQuerySchema, type Records } from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { Authenticator } from '../auth/authenticate';
import type { RecordsRepository } from '../records/records-repository';

export interface RecordsRouteOptions {
  records: RecordsRepository;
  authenticate: Authenticator;
}

/** The leaderboards: public, with the signed-in pilot's own place when they have one. */
export async function recordsRoutes(app: FastifyInstance, options: RecordsRouteOptions) {
  app.get(
    '/records',
    {
      preHandler: options.authenticate.optional,
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request): Promise<Records> => {
      const query = recordsQuerySchema.parse(request.query);
      const { entries, you } = await options.records.board(query, request.userId);
      return { board: query.board, period: query.period, entries, you };
    },
  );
}
