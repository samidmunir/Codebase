import {
  EXTERNAL_LINK_PATTERN,
  FORUM_EDIT_HOURS,
  FORUM_NEW_ACCOUNT_DAYS,
  FORUM_NEW_POSTER_POSTS,
  FORUM_POSTS_PAGE_SIZE,
  FORUM_POSTS_PER_HOUR,
  FORUM_THREADS_PAGE_SIZE,
  threadSlug,
  type CreatedThread,
  type ForumCategoryList,
  type ForumFollowing,
  type ForumPost,
  type ForumPosting,
  type ForumReportList,
  type ForumThread,
  type ForumThreadList,
  type ForumThreadSummary,
  type ModerateThreadRequest,
  type NewThreadRequest,
} from '@vector/shared';
import type { Actor } from '../admin/admin-service';
import type { AuditRepository } from '../admin/audit-repository';
import type { UserRecord, UsersRepository } from '../users/users-repository';
import {
  ForumCategoryNotFoundError,
  publicPost,
  type ForumRepository,
  type ThreadRecord,
} from './forum-repository';

/** Can't post: why, in words for the pilot. */
export class ForumPostingError extends Error {
  constructor(
    readonly reason: 'unverified' | 'suspended' | 'locked' | 'adminOnly' | 'rateLimited' | 'links',
    message: string,
  ) {
    super(message);
    this.name = 'ForumPostingError';
  }
}

/** Editing someone else's post, or after the edit window. */
export class ForumEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForumEditError';
  }
}

/** A session result that isn't the poster's own (or is hidden). */
export class ForumResultError extends Error {
  constructor() {
    super('You can only share your own sessions');
    this.name = 'ForumResultError';
  }
}

/** Deleting a thread's opening post: delete the thread instead. */
export class OpeningPostError extends Error {
  constructor() {
    super('That’s the thread’s opening post: delete the thread instead');
    this.name = 'OpeningPostError';
  }
}

const HOUR_MS = 3_600_000;

const summary = (thread: ThreadRecord): ForumThreadSummary => ({
  id: thread.id,
  slug: thread.slug,
  title: thread.title,
  categoryId: thread.categoryId,
  author: thread.author,
  createdAt: thread.createdAt,
  lastPostAt: thread.lastPostAt,
  lastPoster: thread.lastPoster,
  replies: thread.replies,
  views: thread.views,
  pinned: thread.pinned,
  locked: thread.locked,
  unread: thread.unread,
});

/** Suspended right now: until when ('forever'), or undefined. */
function suspension(user: UserRecord): Date | 'forever' | undefined {
  const until = user.postingSuspendedUntil;
  if (until === 'forever') return until;
  return until && until.getTime() > Date.now() ? until : undefined;
}

const excerpt = (text: string) => (text.length > 80 ? `${text.slice(0, 77)}…` : text);

/** The community forum: reading, posting and moderation. */
export function forumService(deps: {
  forum: ForumRepository;
  users: UsersRepository;
  audit: AuditRepository;
}) {
  const { forum, users, audit } = deps;
  const editableSince = () => new Date(Date.now() - FORUM_EDIT_HOURS * HOUR_MS);

  /** Whether this pilot may post at all, and in this thread or category if given. */
  async function posting(
    user: UserRecord | undefined,
    where: { locked?: boolean; adminOnly?: boolean } = {},
  ): Promise<ForumPosting> {
    if (!user) return { allowed: false, reason: 'signedOut' };
    const isAdmin = user.role === 'admin';
    if (!user.emailVerifiedAt && !isAdmin) return { allowed: false, reason: 'unverified' };
    const suspended = suspension(user);
    if (suspended)
      return {
        allowed: false,
        reason: 'suspended',
        until: suspended === 'forever' ? null : suspended.toISOString(),
      };
    if (where.locked && !isAdmin) return { allowed: false, reason: 'locked' };
    if (where.adminOnly && !isAdmin) return { allowed: false, reason: 'adminOnly' };
    const { total } = await forum.postCounts(user.id);
    return { allowed: true, newPoster: !isAdmin && total < FORUM_NEW_POSTER_POSTS };
  }

  const REFUSALS: Record<Extract<ForumPosting, { allowed: false }>['reason'], string> = {
    signedOut: 'Sign in to post',
    unverified: 'Verify your email to post in the community',
    suspended: 'You’re suspended from posting',
    locked: 'This thread is locked',
    adminOnly: 'Only the Vector team posts new threads here',
  };

  /** Throws unless the pilot can post this, now. */
  async function checkPost(
    user: UserRecord,
    body: string,
    where: { locked?: boolean; adminOnly?: boolean },
  ): Promise<void> {
    const allowed = await posting(user, where);
    if (!allowed.allowed) {
      const reason = allowed.reason === 'signedOut' ? 'unverified' : allowed.reason;
      let message = REFUSALS[allowed.reason];
      if (allowed.reason === 'suspended')
        message = allowed.until
          ? `You’re suspended from posting until ${new Date(allowed.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : 'You’re suspended from posting';
      throw new ForumPostingError(reason, message);
    }
    if (user.role === 'admin') return;
    const counts = await forum.postCounts(user.id);
    const newAccount = user.createdAt.getTime() > Date.now() - FORUM_NEW_ACCOUNT_DAYS * 86_400_000;
    const limit = newAccount ? FORUM_POSTS_PER_HOUR.newAccount : FORUM_POSTS_PER_HOUR.regular;
    if (counts.lastHour >= limit)
      throw new ForumPostingError(
        'rateLimited',
        `You can post ${limit} times an hour${newAccount ? ' while your account is new' : ''}. Try again a little later.`,
      );
    if (allowed.newPoster && EXTERNAL_LINK_PATTERN.test(body))
      throw new ForumPostingError(
        'links',
        `Links to other sites unlock after your first ${FORUM_NEW_POSTER_POSTS} posts.`,
      );
  }

  async function account(userId: string | undefined) {
    return userId ? users.findById(userId) : undefined;
  }

  return {
    async overview(viewerId: string | undefined): Promise<ForumCategoryList> {
      const [categories, latest] = await Promise.all([
        forum.categories(),
        forum.latest(viewerId, 10),
      ]);
      return { categories, latest: latest.map(summary) };
    },

    async category(
      id: string,
      viewerId: string | undefined,
      offset: number,
    ): Promise<ForumThreadList> {
      const category = await forum.category(id);
      const { threads, total } = await forum.threads(id, viewerId, {
        offset,
        limit: FORUM_THREADS_PAGE_SIZE,
      });
      return {
        category,
        threads: threads.map(summary),
        total,
        posting: await posting(await account(viewerId), { adminOnly: category.adminOnly }),
      };
    },

    async following(viewerId: string): Promise<ForumFollowing> {
      const threads = await forum.following(viewerId, 50);
      return {
        threads: threads.map(summary),
        unread: threads.filter((thread) => thread.unread).length,
      };
    },

    /** A page of a thread; opening it marks it read. */
    async thread(id: number, viewerId: string | undefined, offset: number): Promise<ForumThread> {
      const [thread, viewer] = await Promise.all([forum.thread(id, viewerId), account(viewerId)]);
      const { posts, total } = await forum.posts(id, viewerId, {
        offset,
        limit: FORUM_POSTS_PAGE_SIZE,
      });
      await forum.markRead(id, viewerId);
      const editableUntil = editableSince();
      const showHidden = viewer?.role === 'admin';
      return {
        thread: {
          ...summary(thread),
          categoryName: thread.categoryName,
          resultId: thread.resultId,
          following: thread.following,
        },
        posts: posts.map((post) => publicPost(post, { viewerId, showHidden, editableUntil })),
        total,
        offset,
        posting: await posting(viewer, { locked: thread.locked }),
      };
    },

    async createThread(userId: string, request: NewThreadRequest): Promise<CreatedThread> {
      const user = await users.findById(userId);
      if (!user) throw new ForumPostingError('unverified', 'Sign in to post');
      const category = await forum.category(request.categoryId).catch(() => {
        throw new ForumCategoryNotFoundError();
      });
      await checkPost(user, `${request.title}\n${request.body}`, {
        adminOnly: category.adminOnly,
      });
      if (request.resultId && !(await forum.ownsResult(userId, request.resultId)))
        throw new ForumResultError();
      const id = await forum.createThread({
        categoryId: category.id,
        authorId: userId,
        title: request.title,
        body: request.body,
        resultId: request.resultId,
      });
      return { id, slug: threadSlug(request.title) };
    },

    async reply(userId: string, threadId: number, body: string): Promise<ForumPost> {
      const [user, thread] = await Promise.all([
        users.findById(userId),
        forum.thread(threadId, userId),
      ]);
      if (!user) throw new ForumPostingError('unverified', 'Sign in to post');
      await checkPost(user, body, { locked: thread.locked });
      const id = await forum.reply(threadId, userId, body);
      return publicPost(await forum.post(id, userId), {
        viewerId: userId,
        showHidden: false,
        editableUntil: editableSince(),
      });
    },

    /** Authors can edit their own posts for FORUM_EDIT_HOURS. */
    async edit(userId: string, postId: number, body: string): Promise<ForumPost> {
      const [user, post] = await Promise.all([users.findById(userId), forum.post(postId, userId)]);
      if (!user || post.authorId !== userId)
        throw new ForumEditError('You can only edit your own posts');
      if (post.hidden) throw new ForumEditError('A moderator hid this post, so it can’t be edited');
      if (post.createdAt.getTime() <= editableSince().getTime())
        throw new ForumEditError(`Posts can be edited for ${FORUM_EDIT_HOURS} hours`);
      const suspended = suspension(user);
      if (suspended) throw new ForumPostingError('suspended', 'You’re suspended from posting');
      if (
        user.role !== 'admin' &&
        (await forum.postCounts(userId)).total < FORUM_NEW_POSTER_POSTS &&
        EXTERNAL_LINK_PATTERN.test(body) &&
        !EXTERNAL_LINK_PATTERN.test(post.body)
      )
        throw new ForumPostingError(
          'links',
          `Links to other sites unlock after your first ${FORUM_NEW_POSTER_POSTS} posts.`,
        );
      await forum.editPost(postId, body);
      return publicPost(await forum.post(postId, userId), {
        viewerId: userId,
        showHidden: false,
        editableUntil: editableSince(),
      });
    },

    async setUseful(userId: string, postId: number, useful: boolean): Promise<void> {
      const post = await forum.post(postId);
      if (post.authorId === userId && useful)
        throw new ForumEditError('You can’t mark your own post useful');
      await forum.setUseful(postId, userId, useful);
    },

    async follow(userId: string, threadId: number, following: boolean): Promise<void> {
      await forum.thread(threadId, userId); // Throws if it's gone.
      await forum.follow(threadId, userId, following);
    },

    async report(userId: string, postId: number, reason: string): Promise<void> {
      await forum.post(postId); // Throws if it's gone.
      await forum.report(postId, userId, reason);
    },

    // ---- Moderation ----------------------------------------------------------------

    async reports(): Promise<ForumReportList> {
      return { reports: await forum.openReports() };
    },

    async dismissReport(actor: Actor, reportId: string): Promise<void> {
      const postId = await forum.reportPostId(reportId);
      const post = await forum.post(postId);
      const reports = await forum.resolveReports(postId, actor.id, 'dismissed');
      await audit.record(actor, 'forum.dismissReport', excerpt(post.body), {
        post: postId,
        reports,
      });
    },

    async setHidden(actor: Actor, postId: number, hidden: boolean): Promise<void> {
      const post = await forum.post(postId);
      await forum.setHidden(postId, hidden, actor.id);
      const reports = hidden ? await forum.resolveReports(postId, actor.id, 'hidden') : 0;
      await audit.record(actor, hidden ? 'forum.hidePost' : 'forum.showPost', excerpt(post.body), {
        post: postId,
        thread: post.threadId,
        ...(post.author ? { author: post.author.handle } : {}),
        ...(reports ? { reports } : {}),
      });
    },

    async deletePost(actor: Actor, postId: number): Promise<void> {
      const post = await forum.post(postId);
      if (post.opening) throw new OpeningPostError();
      await forum.resolveReports(postId, actor.id, 'deleted');
      await forum.deletePost(postId);
      await audit.record(actor, 'forum.deletePost', excerpt(post.body), {
        thread: post.threadId,
        ...(post.author ? { author: post.author.handle } : {}),
      });
    },

    async updateThread(actor: Actor, id: number, changes: ModerateThreadRequest): Promise<void> {
      const before = await forum.thread(id, undefined);
      if (changes.categoryId !== undefined) await forum.category(changes.categoryId);
      await forum.updateThread(id, changes);
      const details: Record<string, unknown> = {};
      if (changes.pinned !== undefined && changes.pinned !== before.pinned)
        details.pinned = changes.pinned;
      if (changes.locked !== undefined && changes.locked !== before.locked)
        details.locked = changes.locked;
      if (changes.categoryId !== undefined && changes.categoryId !== before.categoryId)
        details.category = { from: before.categoryId, to: changes.categoryId };
      if (Object.keys(details).length > 0)
        await audit.record(actor, 'forum.updateThread', before.title, details);
    },

    async deleteThread(actor: Actor, id: number): Promise<void> {
      const thread = await forum.thread(id, undefined);
      await forum.deleteThread(id);
      await audit.record(actor, 'forum.deleteThread', thread.title, {
        category: thread.categoryId,
        replies: thread.replies,
        ...(thread.author ? { author: thread.author.handle } : {}),
      });
    },
  };
}

export type ForumService = ReturnType<typeof forumService>;
