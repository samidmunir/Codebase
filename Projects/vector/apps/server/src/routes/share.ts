import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ResultNotFoundError } from '../results/results-repository';
import type { ShareService } from '../share/share-service';

const idParams = z.object({ id: z.uuid() });
const query = z.object({ download: z.literal('1').optional() });

/** Share cards: the image a shared result shows where it's posted (and to download). */
export async function shareRoutes(app: FastifyInstance, options: { share: ShareService }) {
  app.get('/share/results/:id/card.png', async (request, reply) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) throw new ResultNotFoundError();
    const png = await options.share.resultCard(parsed.data.id);
    if (!png) throw new ResultNotFoundError();
    if (query.parse(request.query).download)
      reply.header('content-disposition', 'attachment; filename="vector-session.png"');
    return reply.type('image/png').header('cache-control', 'public, max-age=600').send(png);
  });
}
