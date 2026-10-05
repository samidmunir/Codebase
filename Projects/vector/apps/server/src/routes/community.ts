import {
  moderatePostRequestSchema,
  moderateThreadRequestSchema,
  newThreadRequestSchema,
  postRequestSchema,
  reportRequestSchema,
} from '@vector/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Authenticator } from '../auth/authenticate';
import type { ForumService } from '../forum/forum-service';

export interface CommunityRouteOptions {
  forum: ForumService;
  authenticate: Authenticator;
}

const idParams = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .max(2 ** 53),
});
const categoryParams = z.object({ id: z.string().min(1).max(40) });
const reportParams = z.object({ id: z.uuid() });
const pageQuery = z.object({ offset: z.coerce.number().int().min(0).max(1_000_000).default(0) });

const actor = (request: FastifyRequest) => ({
  id: request.account!.id,
  email: request.account!.email,
  role: request.account!.role,
});

const handleParams = z.object({ handle: z.string().min(1).max(40) });
const suspensionSchema = z.object({
  postingSuspension: z.union([
    z.number().int().min(1).max(365),
    z.literal('forever'),
    z.literal('lift'),
  ]),
});

/** The community forum: reading is public, posting needs a verified account. */
export async function communityRoutes(app: FastifyInstance, options: CommunityRouteOptions) {
  const { forum, authenticate } = options;
  const optional = { preHandler: authenticate.optional };
  const signedIn = { preHandler: authenticate.user };
  // Writing is limited per IP too, on top of the per-account limits in the service.
  const writing = {
    preHandler: authenticate.user,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  };
  // Moderators and admins.
  const admin = { preHandler: authenticate.staff };

  app.get('/community', optional, async (request) => forum.overview(request.userId));

  app.get('/community/categories/:id', optional, async (request) => {
    const { id } = categoryParams.parse(request.params);
    return forum.category(id, request.userId, pageQuery.parse(request.query).offset);
  });

  app.get('/community/threads/:id', optional, async (request) => {
    const { id } = idParams.parse(request.params);
    return forum.thread(id, request.userId, pageQuery.parse(request.query).offset);
  });

  app.get('/community/following', signedIn, async (request) => forum.following(request.userId!));

  app.post('/community/threads', writing, async (request, reply) => {
    const created = await forum.createThread(
      request.userId!,
      newThreadRequestSchema.parse(request.body),
    );
    return reply.code(201).send(created);
  });

  app.post('/community/threads/:id/posts', writing, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const post = await forum.reply(request.userId!, id, postRequestSchema.parse(request.body).body);
    return reply.code(201).send(post);
  });

  app.patch('/community/posts/:id', writing, async (request) => {
    const { id } = idParams.parse(request.params);
    return forum.edit(request.userId!, id, postRequestSchema.parse(request.body).body);
  });

  for (const [method, useful] of [
    ['PUT', true],
    ['DELETE', false],
  ] as const)
    app.route({
      method,
      url: '/community/posts/:id/useful',
      ...signedIn,
      handler: async (request, reply) => {
        await forum.setUseful(request.userId!, idParams.parse(request.params).id, useful);
        return reply.code(204).send();
      },
    });

  for (const [method, following] of [
    ['PUT', true],
    ['DELETE', false],
  ] as const)
    app.route({
      method,
      url: '/community/threads/:id/follow',
      ...signedIn,
      handler: async (request, reply) => {
        await forum.follow(request.userId!, idParams.parse(request.params).id, following);
        return reply.code(204).send();
      },
    });

  app.post('/community/posts/:id/report', writing, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    await forum.report(request.userId!, id, reportRequestSchema.parse(request.body).reason);
    return reply.code(204).send();
  });

  // ---- Moderation ------------------------------------------------------------------

  app.get('/admin/community/reports', admin, async () => forum.reports());

  app.post('/admin/community/reports/:id/dismiss', admin, async (request, reply) => {
    await forum.dismissReport(actor(request), reportParams.parse(request.params).id);
    return reply.code(204).send();
  });

  app.patch('/admin/community/posts/:id', admin, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const { hidden } = moderatePostRequestSchema.parse(request.body);
    await forum.setHidden(actor(request), id, hidden);
    return reply.code(204).send();
  });

  app.delete('/admin/community/posts/:id', admin, async (request, reply) => {
    await forum.deletePost(actor(request), idParams.parse(request.params).id);
    return reply.code(204).send();
  });

  app.patch('/admin/community/threads/:id', admin, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    await forum.updateThread(actor(request), id, moderateThreadRequestSchema.parse(request.body));
    return reply.code(204).send();
  });

  app.delete('/admin/community/threads/:id', admin, async (request, reply) => {
    await forum.deleteThread(actor(request), idParams.parse(request.params).id);
    return reply.code(204).send();
  });

  /** Suspend a pilot from posting (or lift it), by handle, from the community side. */
  app.post('/admin/community/users/:handle/suspension', admin, async (request) => {
    const { handle } = handleParams.parse(request.params);
    const { postingSuspension } = suspensionSchema.parse(request.body);
    return forum.setSuspension(actor(request), handle, postingSuspension);
  });
}
