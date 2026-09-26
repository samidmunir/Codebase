import Fastify, { type FastifyServerOptions } from 'fastify';
import { healthRoutes } from './routes/health';

export const API_VERSION = '0.0.0';

export interface AppDependencies {
  checkDatabase: () => Promise<boolean>;
}

export function buildApp(deps: AppDependencies, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.register(
    async (api) => {
      await api.register(healthRoutes, { version: API_VERSION, checkDatabase: deps.checkDatabase });
    },
    { prefix: '/api' },
  );

  return app;
}
