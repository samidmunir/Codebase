import {
  RESULTS_PAGE_SIZE,
  uploadResultRequestSchema,
  type PilotProfile,
  type ResultDetail,
  type ResultPage,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Authenticator } from '../auth/authenticate';
import { ResultNotFoundError } from '../results/results-repository';
import type { ResultsService } from '../results/results-service';
import { UserNotFoundError } from '../users/users-repository';

export interface ResultsRouteOptions {
  results: ResultsService;
  authenticate: Authenticator;
  /** Largest request body accepted for a snapshot, in bytes. */
  bodyLimit: number;
}

const sessionKeyParams = z.object({ sessionKey: z.string().min(1).max(64) });
const idParams = z.object({ id: z.uuid() });
const handleParams = z.object({ handle: z.string().min(1).max(40) });
const pageQuery = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(RESULTS_PAGE_SIZE),
});

/** Session results (recorded by their pilot) and pilot profiles (public, unless made private). */
export async function resultsRoutes(app: FastifyInstance, options: ResultsRouteOptions) {
  const { results, authenticate, bodyLimit } = options;

  /** Records (or updates) the result of the session with this id. */
  app.put(
    '/results/:sessionKey',
    { preHandler: authenticate.user, bodyLimit },
    async (request, reply) => {
      const { sessionKey } = sessionKeyParams.parse(request.params);
      const summary = await results.upload(
        request.userId!,
        sessionKey,
        uploadResultRequestSchema.parse(request.body),
      );
      return summary ?? reply.code(204).send();
    },
  );

  app.get(
    '/results/:id',
    { preHandler: authenticate.optional },
    async (request): Promise<ResultDetail> => {
      const parsed = idParams.safeParse(request.params);
      if (!parsed.success) throw new ResultNotFoundError();
      return results.get(parsed.data.id, request.userId);
    },
  );

  app.get(
    '/pilots/:handle',
    { preHandler: authenticate.optional },
    async (request): Promise<PilotProfile> => {
      const parsed = handleParams.safeParse(request.params);
      if (!parsed.success) throw new UserNotFoundError();
      return results.profile(parsed.data.handle, request.userId);
    },
  );

  app.get(
    '/pilots/:handle/results',
    { preHandler: authenticate.optional },
    async (request): Promise<ResultPage> => {
      const parsed = handleParams.safeParse(request.params);
      if (!parsed.success) throw new UserNotFoundError();
      const { offset, limit } = pageQuery.parse(request.query);
      return results.page(parsed.data.handle, request.userId, offset, limit);
    },
  );
}
