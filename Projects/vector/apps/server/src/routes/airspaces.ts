import type { AirspaceStatusList } from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { AirspacesRepository } from '../airspaces/airspaces-repository';

export interface AirspacesRouteOptions {
  airspaces: AirspacesRepository;
}

/** Which airspaces players can fly (public: the start screen shows them before sign-in completes). */
export async function airspacesRoutes(app: FastifyInstance, options: AirspacesRouteOptions) {
  app.get('/airspaces', async (): Promise<AirspaceStatusList> => ({
    airspaces: await options.airspaces.list(),
  }));
}
