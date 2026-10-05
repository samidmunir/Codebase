import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { NewsPost } from '@vector/shared';
import { listNews } from '../../api/news-api';
import { formatDate } from '../../format/dates';
import { usePublicPageMeta } from '../../site/page-meta';
import './news.css';

/** Release notes and announcements, newest first. */
export function NewsScreen() {
  usePublicPageMeta('/news');
  const [posts, setPosts] = useState<NewsPost[] | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listNews()
      .then((list) => {
        if (cancelled) return;
        setPosts(list.posts);
        setTotal(list.total);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const more = async () => {
    const list = await listNews(posts?.length ?? 0);
    setPosts((current) => [...(current ?? []), ...list.posts]);
  };

  return (
    <div className="site-page news-page">
      <h1>News</h1>
      <p className="site-page__lede">What’s new in Vector: releases, airspaces and fixes.</p>
      {error && <p role="alert">Couldn’t load the news. Try again.</p>}
      {!posts && !error && <p className="news-muted">Loading…</p>}
      {posts?.length === 0 && <p className="news-muted">Nothing yet. Check back soon.</p>}
      <ol className="news-list">
        {posts?.map((post) => (
          <li key={post.id}>
            <NewsCard post={post} />
          </li>
        ))}
      </ol>
      {posts && posts.length < total && (
        <div className="news-more">
          <button type="button" className="site-button" onClick={() => void more()}>
            Older posts
          </button>
        </div>
      )}
    </div>
  );
}

/** A post's title, date and summary, linking to it. */
export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Link to={`/news/${post.slug}`} className="news-card">
      <time dateTime={post.publishedAt ?? undefined}>
        {post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}
      </time>
      <h2>{post.title}</h2>
      {post.summary && <p>{post.summary}</p>}
    </Link>
  );
}
