import type { AdminPostList, AdminThreadList, UpdateCategoryRequest } from '@vector/shared';
import type { Actor } from '../admin/admin-service';
import type { AuditRepository } from '../admin/audit-repository';
import { CategoryNotEmptyError, type ForumAdminRepository } from './forum-admin-repository';
import type { ForumRepository } from './forum-repository';

const excerpt = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 77)}…` : flat;
};

/** Managing the community's content: categories (admins), and every thread and post (staff). */
export function forumAdminService(deps: {
  admin: ForumAdminRepository;
  forum: ForumRepository;
  audit: AuditRepository;
}) {
  const { admin, forum, audit } = deps;

  return {
    async createCategory(
      actor: Actor,
      request: Parameters<ForumAdminRepository['createCategory']>[0],
    ): Promise<void> {
      await admin.createCategory(request);
      await audit.record(actor, 'forum.createCategory', request.name, {
        id: request.id,
        ...(request.adminOnly ? { adminOnly: true } : {}),
      });
    },

    async updateCategory(actor: Actor, id: string, request: UpdateCategoryRequest): Promise<void> {
      const before = await forum.category(id);
      await admin.updateCategory(id, request);
      if (request.move) await admin.moveCategory(id, request.move);
      const details: Record<string, unknown> = {};
      if (request.name !== undefined && request.name !== before.name)
        details.name = { from: before.name, to: request.name };
      if (request.description !== undefined && request.description !== before.description)
        details.description = 'changed';
      if (request.adminOnly !== undefined && request.adminOnly !== before.adminOnly)
        details.adminOnly = request.adminOnly;
      if (request.move) details.moved = request.move < 0 ? 'up' : 'down';
      if (Object.keys(details).length > 0)
        await audit.record(actor, 'forum.updateCategory', request.name ?? before.name, details);
    },

    async deleteCategory(actor: Actor, id: string, moveTo: string | undefined): Promise<void> {
      const name = await admin.categoryName(id);
      if (moveTo !== undefined) {
        if (moveTo === id) throw new CategoryNotEmptyError(await admin.threadCount(id));
        await admin.categoryName(moveTo); // Throws if it doesn't exist.
      }
      const moved = await admin.deleteCategory(id, moveTo);
      await audit.record(actor, 'forum.deleteCategory', name, {
        id,
        ...(moved ? { threadsMoved: moved, to: moveTo } : {}),
      });
    },

    searchThreads(query: Parameters<ForumAdminRepository['threads']>[0]): Promise<AdminThreadList> {
      return admin.threads(query);
    },

    searchPosts(query: Parameters<ForumAdminRepository['posts']>[0]): Promise<AdminPostList> {
      return admin.posts(query);
    },

    /** Rewrites any post; it's marked edited, and the log keeps what it said before. */
    async editPost(actor: Actor, postId: number, body: string): Promise<void> {
      const post = await forum.post(postId);
      if (post.body === body) return;
      await forum.editPost(postId, body);
      await audit.record(
        actor,
        'forum.editPost',
        excerpt(post.body),
        {
          post: postId,
          thread: post.threadId,
          before: post.body.slice(0, 2000),
          ...(post.author ? { author: post.author.handle } : {}),
        },
        post.authorId,
      );
    },
  };
}

export type ForumAdminService = ReturnType<typeof forumAdminService>;
