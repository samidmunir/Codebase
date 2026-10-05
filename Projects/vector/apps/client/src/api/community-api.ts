import {
  createdThreadSchema,
  forumCategoryListSchema,
  forumFollowingSchema,
  forumPostSchema,
  forumReportListSchema,
  forumThreadListSchema,
  forumThreadSchema,
  type CreatedThread,
  type ForumCategoryList,
  type ForumFollowing,
  type ForumPost,
  type ForumReportList,
  type ForumThread,
  type ForumThreadList,
  type ModerateThreadRequest,
  type NewThreadRequest,
  adminPostListSchema,
  adminThreadListSchema,
  type AdminPostList,
  type AdminPostQuery,
  type AdminThreadList,
  type AdminThreadQuery,
  type NewCategoryRequest,
  type UpdateCategoryRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

const send = (path: string, method: string, body?: object) =>
  apiRequest<unknown>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

export async function getCommunity(): Promise<ForumCategoryList> {
  return forumCategoryListSchema.parse(await apiRequest('/community'));
}

export async function getCategory(id: string, offset = 0): Promise<ForumThreadList> {
  return forumThreadListSchema.parse(
    await apiRequest(`/community/categories/${encodeURIComponent(id)}?offset=${offset}`),
  );
}

export async function getThread(id: number, offset = 0): Promise<ForumThread> {
  return forumThreadSchema.parse(await apiRequest(`/community/threads/${id}?offset=${offset}`));
}

export async function getFollowing(): Promise<ForumFollowing> {
  return forumFollowingSchema.parse(await apiRequest('/community/following'));
}

export async function createThread(request: NewThreadRequest): Promise<CreatedThread> {
  return createdThreadSchema.parse(await send('/community/threads', 'POST', request));
}

export async function replyTo(threadId: number, body: string): Promise<ForumPost> {
  return forumPostSchema.parse(
    await send(`/community/threads/${threadId}/posts`, 'POST', { body }),
  );
}

export async function editPost(id: number, body: string): Promise<ForumPost> {
  return forumPostSchema.parse(await send(`/community/posts/${id}`, 'PATCH', { body }));
}

export const setUseful = (id: number, useful: boolean) =>
  send(`/community/posts/${id}/useful`, useful ? 'PUT' : 'DELETE');

export const setFollowing = (threadId: number, following: boolean) =>
  send(`/community/threads/${threadId}/follow`, following ? 'PUT' : 'DELETE');

export const reportPost = (id: number, reason: string) =>
  send(`/community/posts/${id}/report`, 'POST', { reason });

// ---- Moderation ----------------------------------------------------------------------

export async function getReports(): Promise<ForumReportList> {
  return forumReportListSchema.parse(await apiRequest('/admin/community/reports'));
}

export const dismissReport = (id: string) => send(`/admin/community/reports/${id}/dismiss`, 'POST');
export const setPostHidden = (id: number, hidden: boolean) =>
  send(`/admin/community/posts/${id}`, 'PATCH', { hidden });
export const deletePost = (id: number) => send(`/admin/community/posts/${id}`, 'DELETE');
export const moderateThread = (id: number, changes: ModerateThreadRequest) =>
  send(`/admin/community/threads/${id}`, 'PATCH', changes);
export const deleteThread = (id: number) => send(`/admin/community/threads/${id}`, 'DELETE');

/** A thread's address. */
export const threadPath = (thread: { id: number; slug: string }) =>
  `/community/t/${thread.id}/${thread.slug}`;

// ---- Content (admins: categories; staff: every thread and post) ------------------------

const queryString = (query: object) =>
  new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();

export const createCategory = (request: NewCategoryRequest) =>
  send('/admin/community/categories', 'POST', request);
export const updateCategory = (id: string, request: UpdateCategoryRequest) =>
  send(`/admin/community/categories/${id}`, 'PATCH', request);
export const deleteCategory = (id: string, moveTo?: string) =>
  send(`/admin/community/categories/${id}`, 'DELETE', moveTo ? { moveTo } : {});

export async function searchThreads(query: AdminThreadQuery): Promise<AdminThreadList> {
  return adminThreadListSchema.parse(
    await apiRequest(`/admin/community/threads?${queryString(query)}`),
  );
}

export async function searchPosts(query: AdminPostQuery): Promise<AdminPostList> {
  return adminPostListSchema.parse(
    await apiRequest(`/admin/community/posts?${queryString(query)}`),
  );
}

export const editAnyPost = (id: number, body: string) =>
  send(`/admin/community/posts/${id}/body`, 'PUT', { body });
