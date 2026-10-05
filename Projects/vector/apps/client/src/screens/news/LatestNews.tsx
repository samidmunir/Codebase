import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { NewsPost } from '@vector/shared';
import { listNews } from '../../api/news-api';
import { NewsCard } from './NewsScreen';
import './news.css';

/** The newest posts (nothing at all while there are none). */
export function LatestNews({ count = 3, title = 'News' }: { count?: number; title?: string }) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  useEffect(() => {
    let cancelled = false;
    listNews(0, count)
      .then((list) => !cancelled && setPosts(list.posts))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [count]);
  if (posts.length === 0) return null;
  return (
    <section className="latest-news" aria-labelledby="latest-news-title">
      <header className="latest-news__header">
        <h2 id="latest-news-title">{title}</h2>
        <Link to="/news">All news</Link>
      </header>
      <ol className="news-list latest-news__list">
        {posts.map((post) => (
          <li key={post.id}>
            <NewsCard post={post} />
          </li>
        ))}
      </ol>
    </section>
  );
}
