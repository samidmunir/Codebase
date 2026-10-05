import {
  newsListSchema,
  newsPostSchema,
  type NewsList,
  type NewsPost,
  type NewsPostRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

export async function listNews(offset = 0, limit?: number): Promise<NewsList> {
  return newsListSchema.parse(
    await apiRequest(`/news?offset=${offset}${limit ? `&limit=${limit}` : ''}`),
  );
}

export async function getNews(slug: string): Promise<NewsPost> {
  return newsPostSchema.parse(await apiRequest(`/news/${encodeURIComponent(slug)}`));
}

export async function listAdminNews(): Promise<NewsList> {
  return newsListSchema.parse(await apiRequest('/admin/news?limit=50'));
}

export async function createNews(request: NewsPostRequest): Promise<NewsPost> {
  return newsPostSchema.parse(
    await apiRequest('/admin/news', { method: 'POST', body: JSON.stringify(request) }),
  );
}

export async function updateNews(id: string, request: NewsPostRequest): Promise<NewsPost> {
  return newsPostSchema.parse(
    await apiRequest(`/admin/news/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    }),
  );
}

export async function deleteNews(id: string): Promise<void> {
  await apiRequest(`/admin/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
