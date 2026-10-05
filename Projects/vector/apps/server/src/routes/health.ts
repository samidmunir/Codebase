import type { HealthResponse, ReadinessResponse } from '@vector/shared';
import type { FastifyInstance } from 'fastify';

export interface HealthRouteOptions {
  version: string;
  checkDatabase: () => Promise<boolean>;
}

export async function healthRoutes(app: FastifyInstance, options: HealthRouteOptions) {
  app.get('/health', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      service: 'vector-api',
      version: options.version,
      time: new Date().toISOString(),
    };
  });

  app.get('/health/ready', async (_request, reply): Promise<ReadinessResponse> => {
    const databaseUp = await options.checkDatabase();
    reply.code(databaseUp ? 200 : 503);
    return {
      status: databaseUp ? 'ready' : 'unavailable',
      checks: { database: databaseUp ? 'up' : 'down' },
    };
  });
}
