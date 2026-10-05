import {
  NEWS_PAGE_SIZE,
  newsPostRequestSchema,
  newsSlugSchema,
  slugify,
  type NewsList,
  type NewsPost,
} from '@vector/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuditRepository } from '../admin/audit-repository';
import type { Authenticator } from '../auth/authenticate';
import { NewsNotFoundError, type NewsRepository } from '../news/news-repository';

export interface NewsRouteOptions {
  news: NewsRepository;
  audit: AuditRepository;
  authenticate: Authenticator;
}

const pageQuery = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(NEWS_PAGE_SIZE),
});

/** News: anyone reads what's published; admins write, publish and delete. */
export async function newsRoutes(app: FastifyInstance, options: NewsRouteOptions) {
  const { news, audit } = options;
  const admin = options.authenticate.admin;
  const actor = (request: FastifyRequest) => ({
    id: request.account!.id,
    email: request.account!.email,
  });
  const postId = (request: FastifyRequest) => {
    const parsed = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!parsed.success) throw new NewsNotFoundError();
    return parsed.data.id;
  };
  const input = (body: unknown) => {
    const request = newsPostRequestSchema.parse(body);
    return { ...request, slug: request.slug ?? slugify(request.title) };
  };

  app.get('/news', async (request): Promise<NewsList> => {
    const { offset, limit } = pageQuery.parse(request.query);
    return news.list(offset, limit);
  });

  app.get('/news/:slug', async (request): Promise<NewsPost> => {
    const parsed = z.object({ slug: newsSlugSchema }).safeParse(request.params);
    if (!parsed.success) throw new NewsNotFoundError();
    return news.bySlug(parsed.data.slug);
  });

  app.get('/admin/news', { preHandler: admin }, async (request): Promise<NewsList> => {
    const { offset, limit } = pageQuery.parse(request.query);
    return news.list(offset, limit, true);
  });

  app.post('/admin/news', { preHandler: admin }, async (request, reply): Promise<NewsPost> => {
    const post = await news.create(request.account!.id, input(request.body));
    await audit.record(actor(request), 'news.create', post.title, {
      slug: post.slug,
      published: post.publishedAt !== null,
    });
    reply.code(201);
    return post;
  });

  app.patch('/admin/news/:id', { preHandler: admin }, async (request): Promise<NewsPost> => {
    const { before, after } = await news.update(postId(request), input(request.body));
    const details: Record<string, unknown> = {};
    if (before.title !== after.title) details.title = { from: before.title, to: after.title };
    if ((before.publishedAt === null) !== (after.publishedAt === null))
      details.published = after.publishedAt !== null;
    await audit.record(actor(request), 'news.update', after.title, details);
    return after;
  });

  app.delete('/admin/news/:id', { preHandler: admin }, async (request, reply) => {
    const post = await news.delete(postId(request));
    await audit.record(actor(request), 'news.delete', post.title, { slug: post.slug });
    return reply.code(204).send();
  });
}
