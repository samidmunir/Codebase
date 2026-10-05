import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ForumReport } from '@vector/shared';
import {
  deletePost,
  deleteThread,
  dismissReport,
  getReports,
  setPostHidden,
  threadPath,
} from '../../api/community-api';
import { setPostingSuspension } from '../../api/admin-api';
import { Markdown } from '../../components/Markdown';
import { errorMessage, formatAgo } from './admin-format';

/** Reported community posts, oldest first, and what to do about each. */
export function ReportsPanel() {
  const [reports, setReports] = useState<ForumReport[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReports()
      .then((list) => !cancelled && setReports(list.reports))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const act = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      setNotice(done);
      setReload((n) => n + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  // One card per post, with every report on it.
  const byPost = new Map<number, ForumReport[]>();
  for (const report of reports ?? [])
    byPost.set(report.post.id, [...(byPost.get(report.post.id) ?? []), report]);

  return (
    <div className="admin-users__list">
      <p className="admin-muted">
        Reports from pilots. Hiding a post keeps it for the record but shows pilots that a moderator
        hid it; suspend a pilot from posting on their page under Users.
      </p>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!reports ? (
        <p className="admin-muted">Loading…</p>
      ) : byPost.size === 0 ? (
        <p className="admin-muted">No open reports.</p>
      ) : (
        [...byPost.values()].map((group) => {
          const { post, thread } = group[0]!;
          return (
            <article
              key={post.id}
              className="admin-card admin-report"
              aria-label={`Report on a post in ${thread.title}`}
            >
              <header className="admin-card__header">
                <div>
                  <h2>
                    <Link to={`${threadPath(thread)}#post-${post.id}`}>{thread.title}</Link>
                  </h2>
                  <p className="admin-muted">
                    {post.opening ? 'Opening post' : 'Reply'} by{' '}
                    {post.author ? `@${post.author.handle}` : 'a deleted pilot'}
                    {post.hidden && ' · hidden'}
                  </p>
                </div>
              </header>
              <div className="admin-report__post">
                <Markdown source={post.body} allowHtml={false} />
              </div>
              <ul className="admin-report__reasons">
                {group.map((report) => (
                  <li key={report.id}>
                    <strong>
                      {report.reporter ? `@${report.reporter.handle}` : 'Deleted pilot'}
                    </strong>{' '}
                    <span className="admin-muted">{formatAgo(report.createdAt)}</span>:{' '}
                    {report.reason}
                  </li>
                ))}
              </ul>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-button"
                  disabled={busy}
                  onClick={() => void act(() => dismissReport(group[0]!.id), 'Report dismissed.')}
                >
                  Dismiss
                </button>
                {!post.hidden && (
                  <button
                    type="button"
                    className="admin-button admin-button--caution"
                    disabled={busy}
                    onClick={() => void act(() => setPostHidden(post.id, true), 'Post hidden.')}
                  >
                    Hide post
                  </button>
                )}
                <button
                  type="button"
                  className="admin-button admin-button--caution"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(
                      post.opening
                        ? `Delete the thread “${thread.title}” and all its posts?`
                        : 'Delete this post? This can’t be undone.',
                    ) &&
                    void act(
                      () => (post.opening ? deleteThread(thread.id) : deletePost(post.id)),
                      post.opening ? 'Thread deleted.' : 'Post deleted.',
                    )
                  }
                >
                  {post.opening ? 'Delete thread' : 'Delete post'}
                </button>
                {post.author && (
                  <button
                    type="button"
                    className="admin-button admin-button--caution"
                    disabled={busy}
                    onClick={() =>
                      window.confirm(`Suspend @${post.author!.handle} from posting for 7 days?`) &&
                      void act(
                        () => setPostingSuspension(post.author!.handle, 7),
                        `@${post.author!.handle} can’t post for 7 days.`,
                      )
                    }
                  >
                    Suspend poster 7 days
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
