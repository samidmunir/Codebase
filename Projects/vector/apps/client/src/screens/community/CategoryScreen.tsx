import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { FORUM_THREADS_PAGE_SIZE, type ForumThreadList } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import { getCategory } from '../../api/community-api';
import { useAuth } from '../../auth/auth-store';
import { usePageMeta } from '../../site/page-meta';
import { failure } from './community-format';
import { Pager, PostingNotice, ThreadList } from './CommunityParts';
import './community.css';

/** One category's threads. */
export function CategoryScreen() {
  const { category: id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const [data, setData] = useState<ForumThreadList | undefined>(undefined);
  const [error, setError] = useState<{ missing: boolean; text: string } | undefined>(undefined);
  // Load as whoever is signed in (it says whether they can post), once that's known.
  const auth = useAuth();
  const viewer = auth.status === 'signedIn' ? auth.user.id : auth.status;
  usePageMeta(
    data
      ? { title: `${data.category.name} · Community`, description: data.category.description }
      : { title: 'Community' },
  );

  useEffect(() => {
    if (viewer === 'loading') return;
    let cancelled = false;
    getCategory(id, offset)
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setError(undefined);
      })
      .catch(
        (caught: unknown) =>
          !cancelled &&
          setError({
            missing: caught instanceof ApiRequestError && caught.status === 404,
            text: failure(caught),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [id, offset, viewer]);

  if (error?.missing)
    return (
      <div className="site-empty">
        <h1>Not found</h1>
        <p>There’s no such category.</p>
        <div>
          <Link to="/community" className="site-button">
            Community
          </Link>
        </div>
      </div>
    );

  return (
    <div className="site-page forum-page">
      <p className="forum-crumbs">
        <Link to="/community">Community</Link>
      </p>
      <div className="forum-heading">
        <div>
          <h1>{data?.category.name ?? 'Community'}</h1>
          {data && <p className="site-page__lede">{data.category.description}</p>}
        </div>
        {data?.posting.allowed && (
          <Link to={`/community/${id}/new`} className="site-button site-button--primary">
            New thread
          </Link>
        )}
      </div>
      {data && <PostingNotice posting={data.posting} next={`/community/${id}`} />}
      {error && (
        <p className="forum-error" role="alert">
          {error.text}
        </p>
      )}
      {!data && !error && <p className="forum-muted">Loading…</p>}
      {data && (
        <>
          <ThreadList threads={data.threads} />
          <Pager
            offset={offset}
            pageSize={FORUM_THREADS_PAGE_SIZE}
            total={data.total}
            onPage={(next) => setParams(next ? { offset: String(next) } : {})}
          />
        </>
      )}
    </div>
  );
}
