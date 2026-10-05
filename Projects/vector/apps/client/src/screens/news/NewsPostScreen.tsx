import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { NewsPost } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import { getNews } from '../../api/news-api';
import { Markdown } from '../../components/Markdown';
import { formatDate } from '../../format/dates';
import { usePageMeta } from '../../site/page-meta';
import './news.css';

/** One post. */
export function NewsPostScreen() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'missing' }
    | { kind: 'error' }
    | { kind: 'ready'; post: NewsPost }
  >({ kind: 'loading' });
  usePageMeta(
    state.kind === 'ready'
      ? {
          title: state.post.title,
          ...(state.post.summary ? { description: state.post.summary } : {}),
        }
      : { title: 'News' },
  );

  useEffect(() => {
    let cancelled = false;
    getNews(slug)
      .then((post) => !cancelled && setState({ kind: 'ready', post }))
      .catch((caught: unknown) => {
        if (cancelled) return;
        setState(
          caught instanceof ApiRequestError && caught.status === 404
            ? { kind: 'missing' }
            : { kind: 'error' },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === 'loading')
    return (
      <div className="site-page">
        <p className="news-muted">Loading…</p>
      </div>
    );
  if (state.kind !== 'ready')
    return (
      <div className="site-empty">
        <h1>{state.kind === 'missing' ? 'Not found' : 'Something went wrong'}</h1>
        <p>
          {state.kind === 'missing' ? 'There’s no post at this address.' : 'Try again in a moment.'}
        </p>
        <div>
          <Link to="/news" className="site-button">
            All news
          </Link>
        </div>
      </div>
    );

  const { post } = state;
  return (
    <article className="site-page news-post">
      <p className="news-post__back">
        <Link to="/news">← News</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="news-muted">
        {post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}
        {post.author && ` · @${post.author}`}
      </p>
      {post.summary && <p className="news-post__summary">{post.summary}</p>}
      <Markdown source={post.body} className="news-post__body" />
    </article>
  );
}
