import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ResultNotFoundError } from '../results/results-repository';
import type { ShareService } from '../share/share-service';
import { UserNotFoundError } from '../users/users-repository';

const idParams = z.object({ id: z.uuid() });
const handleParams = z.object({ handle: z.string().min(1).max(40) });
const query = z.object({ download: z.literal('1').optional(), v: z.string().optional() });

/** Drawing a card takes real work: this many a minute per address (cached ones count too). */
const CARDS_PER_MINUTE = 60;

/** Share cards: the image a shared result or profile shows where it's posted (and to download). */
export async function shareRoutes(app: FastifyInstance, options: { share: ShareService }) {
  const limited = { config: { rateLimit: { max: CARDS_PER_MINUTE, timeWindow: '1 minute' } } };
  const send = (reply: FastifyReply, png: Buffer, download: boolean, name: string) => {
    if (download) reply.header('content-disposition', `attachment; filename="${name}"`);
    return reply.type('image/png').header('cache-control', 'public, max-age=600').send(png);
  };

  app.get('/share/results/:id/card.png', limited, async (request, reply) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) throw new ResultNotFoundError();
    const png = await options.share.resultCard(parsed.data.id);
    if (!png) throw new ResultNotFoundError();
    return send(reply, png, Boolean(query.parse(request.query).download), 'vector-session.png');
  });

  app.get('/share/pilots/:handle/card.png', limited, async (request, reply) => {
    const parsed = handleParams.safeParse(request.params);
    if (!parsed.success) throw new UserNotFoundError();
    const png = await options.share.profileCard(parsed.data.handle);
    if (!png) throw new UserNotFoundError();
    return send(reply, png, Boolean(query.parse(request.query).download), 'vector-career.png');
  });
}
