import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  FORUM_BODY_MAX,
  FORUM_NEW_POSTER_POSTS,
  type ForumAuthor,
  type ForumPosting,
  type ForumThreadSummary,
  type ResultDetail,
} from '@vector/shared';
import { threadPath } from '../../api/community-api';
import { getResult } from '../../api/results-api';
import { Markdown } from '../../components/Markdown';
import { formatAgo, formatDate } from '../../format/dates';
import { airspaceLabel, difficultyLabel, formatHours, VERIFICATION } from '../pilots/pilot-format';
import { formatRp } from '../scope/score-format';

// Pieces the community pages share.

/** A post's or thread's author: their handle links to their profile. */
export function AuthorName({ author }: { author: ForumAuthor }) {
  if (!author) return <span className="forum-author forum-author--deleted">Deleted pilot</span>;
  return (
    <span className="forum-author">
      <Link to={`/pilots/${author.handle}`}>{author.displayName}</Link>{' '}
      <span className="forum-muted">@{author.handle}</span>
      {author.role === 'admin' && <span className="forum-badge">Vector team</span>}
      {author.role === 'moderator' && <span className="forum-badge">Moderator</span>}
    </span>
  );
}

export function Time({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso)}>
      {formatAgo(iso)}
    </time>
  );
}

/** Threads, as a list. */
export function ThreadList({
  threads,
  showCategory,
  categoryNames,
}: {
  threads: ForumThreadSummary[];
  showCategory?: boolean;
  categoryNames?: Record<string, string>;
}) {
  if (threads.length === 0) return <p className="forum-muted">No threads yet.</p>;
  return (
    <ol className="forum-threads">
      {threads.map((thread) => (
        <li key={thread.id} className="forum-thread-row" data-unread={thread.unread || undefined}>
          <div className="forum-thread-row__main">
            <Link to={threadPath(thread)} className="forum-thread-row__title">
              {thread.pinned && <span className="forum-flag">Pinned</span>}
              {thread.locked && <span className="forum-flag">Locked</span>}
              {thread.title}
              {thread.unread && <span className="forum-new">New</span>}
            </Link>
            <span className="forum-muted forum-thread-row__meta">
              {showCategory && categoryNames?.[thread.categoryId] && (
                <>
                  <Link to={`/community/${thread.categoryId}`}>
                    {categoryNames[thread.categoryId]}
                  </Link>{' '}
                  ·{' '}
                </>
              )}
              {thread.author ? `@${thread.author.handle}` : 'Deleted pilot'} ·{' '}
              <Time iso={thread.createdAt} />
            </span>
          </div>
          <dl className="forum-thread-row__stats">
            <div>
              <dt>Replies</dt>
              <dd>{thread.replies}</dd>
            </div>
            <div>
              <dt>Views</dt>
              <dd>{thread.views}</dd>
            </div>
            <div className="forum-thread-row__last">
              <dt>Last post</dt>
              <dd>
                <Time iso={thread.lastPostAt} />
                {thread.lastPoster && (
                  <span className="forum-muted"> · @{thread.lastPoster.handle}</span>
                )}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  );
}

/** Why the pilot can't post here, and what to do about it. */
export function PostingNotice({ posting, next }: { posting: ForumPosting; next: string }) {
  if (posting.allowed) return null;
  const notice: Record<typeof posting.reason, ReactNode> = {
    signedOut: (
      <>
        <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link> or{' '}
        <Link to={`/register?next=${encodeURIComponent(next)}`}>create an account</Link> to post.
      </>
    ),
    unverified: (
      <>
        Verify your email to post: open the link we sent you, or send a new one from your{' '}
        <Link to="/account">account page</Link>.
      </>
    ),
    suspended: posting.until
      ? `You’re suspended from posting until ${formatDate(posting.until)}.`
      : 'You’re suspended from posting.',
    locked: 'This thread is locked, so it can’t take new replies.',
    adminOnly: 'Only the Vector team starts threads here. You can reply to them.',
  };
  return (
    <p className="forum-notice" role="status">
      {notice[posting.reason]}
    </p>
  );
}

/** A Markdown box with a preview. */
export function Composer({
  value,
  onChange,
  label,
  placeholder,
  newPoster,
  rows = 8,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  newPoster?: boolean;
  rows?: number;
  autoFocus?: boolean;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="forum-composer">
      <div className="forum-composer__tabs" role="tablist" aria-label="Write or preview">
        <button type="button" role="tab" aria-selected={!preview} onClick={() => setPreview(false)}>
          Write
        </button>
        <button type="button" role="tab" aria-selected={preview} onClick={() => setPreview(true)}>
          Preview
        </button>
      </div>
      {preview ? (
        <div className="forum-composer__preview">
          {value.trim() ? (
            <Markdown source={value} allowHtml={false} />
          ) : (
            <p className="forum-muted">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          aria-label={label}
          className="forum-input forum-composer__text"
          rows={rows}
          maxLength={FORUM_BODY_MAX}
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="forum-muted forum-composer__hint">
        Markdown: **bold**, _italic_, `code`, &gt; quotes, lists and [links](/guide).
        {newPoster &&
          ` Links to other sites unlock after your first ${FORUM_NEW_POSTER_POSTS} posts.`}
      </p>
    </div>
  );
}

/** A session result shared on a thread. */
export function ResultCard({ id }: { id: string }) {
  const [detail, setDetail] = useState<ResultDetail | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getResult(id)
      .then((loaded) => !cancelled && setDetail(loaded))
      .catch(() => undefined); // A private or removed result just doesn't show.
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (!detail) return null;
  const { result, pilot } = detail;
  const verification = VERIFICATION[result.verification];
  return (
    <Link to={`/results/${result.id}`} className="forum-result">
      <span className="forum-result__eyebrow">Session overview</span>
      <strong>
        {airspaceLabel(result.airspaceId)} · {difficultyLabel(result.difficulty)}
      </strong>
      <span className="forum-result__stats">
        <span>{formatRp(result.rp)} RP</span>
        <span>{formatHours(result.simTimeSec)}</span>
        <span title={verification.title}>{verification.label}</span>
        <span className="forum-muted">
          @{pilot.handle} · {formatDate(result.playedAt)}
        </span>
      </span>
    </Link>
  );
}

/** Previous and next pages. */
export function Pager({
  offset,
  pageSize,
  total,
  onPage,
}: {
  offset: number;
  pageSize: number;
  total: number;
  onPage: (offset: number) => void;
}) {
  if (total <= pageSize) return null;
  const page = Math.floor(offset / pageSize) + 1;
  const pages = Math.ceil(total / pageSize);
  return (
    <nav className="forum-pager" aria-label="Pages">
      <button
        type="button"
        className="site-button"
        disabled={offset === 0}
        onClick={() => onPage(Math.max(0, offset - pageSize))}
      >
        Previous
      </button>
      <span className="forum-muted">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="site-button"
        disabled={page >= pages}
        onClick={() => onPage(offset + pageSize)}
      >
        Next
      </button>
    </nav>
  );
}
