import { stationIdsSchema, type MetarResponse } from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Authenticator } from '../auth/authenticate';
import type { MetarService } from '../weather/metar-service';

export interface WeatherRouteOptions {
  metars: MetarService;
  authenticate: Authenticator;
}

const querySchema = z.object({ ids: stationIdsSchema });

export async function weatherRoutes(app: FastifyInstance, options: WeatherRouteOptions) {
  const preHandler = options.authenticate.user;

  /** Latest METARs, e.g. GET /api/weather/metar?ids=KJFK,KLGA,KEWR. */
  app.get(
    '/weather/metar',
    { preHandler, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request): Promise<MetarResponse> => {
      const { ids } = querySchema.parse(request.query);
      return options.metars.latest(ids);
    },
  );
}
