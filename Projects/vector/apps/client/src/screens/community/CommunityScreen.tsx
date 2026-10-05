import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ForumCategoryList, ForumFollowing } from '@vector/shared';
import { getCommunity, getFollowing } from '../../api/community-api';
import { useAuth } from '../../auth/auth-store';
import { usePublicPageMeta } from '../../site/page-meta';
import { failure } from './community-format';
import { ThreadList, Time } from './CommunityParts';
import './community.css';

/** The forum's front page: categories, the latest threads, and what you follow. */
export function CommunityScreen() {
  usePublicPageMeta('/community');
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  const loadingAuth = auth.status === 'loading';
  const [data, setData] = useState<ForumCategoryList | undefined>(undefined);
  const [following, setFollowing] = useState<ForumFollowing | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (loadingAuth) return;
    let cancelled = false;
    getCommunity()
      .then((loaded) => !cancelled && setData(loaded))
      .catch((caught: unknown) => !cancelled && setError(failure(caught)));
    if (signedIn)
      getFollowing()
        .then((loaded) => !cancelled && setFollowing(loaded))
        .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn, loadingAuth]);

  const names = Object.fromEntries((data?.categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="site-page forum-page">
      <h1>Community</h1>
      <p className="site-page__lede">
        Talk controlling with other Vector pilots: techniques, airspaces, bugs and ideas.
      </p>
      {error && (
        <p className="forum-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="forum-muted">Loading…</p>}
      {data && (
        <>
          <ul className="forum-categories">
            {data.categories.map((category) => (
              <li key={category.id}>
                <Link to={`/community/${category.id}`} className="forum-category">
                  <span className="forum-category__name">{category.name}</span>
                  <span className="forum-category__description">{category.description}</span>
                  <span className="forum-muted forum-category__counts">
                    {category.threads} thread{category.threads === 1 ? '' : 's'} · {category.posts}{' '}
                    post{category.posts === 1 ? '' : 's'}
                    {category.latest && (
                      <>
                        {' '}
                        · latest <Time iso={category.latest.lastPostAt} />
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {following && following.threads.length > 0 && (
            <section className="forum-section" aria-labelledby="following-title">
              <h2 id="following-title">Following</h2>
              <ThreadList threads={following.threads} showCategory categoryNames={names} />
            </section>
          )}

          <section className="forum-section" aria-labelledby="latest-title">
            <h2 id="latest-title">Latest</h2>
            <ThreadList threads={data.latest} showCategory categoryNames={names} />
          </section>
        </>
      )}
    </div>
  );
}
