import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  FORUM_POSTS_PAGE_SIZE,
  FORUM_REPORT_MAX,
  type ForumCategory,
  type ForumPost,
  type ForumThread,
} from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import {
  deletePost,
  deleteThread,
  editPost,
  getCommunity,
  getThread,
  moderateThread,
  replyTo,
  reportPost,
  setFollowing,
  setPostHidden,
  setUseful,
  threadPath,
} from '../../api/community-api';
import { setPostingSuspension } from '../../api/admin-api';
import { useAuth } from '../../auth/auth-store';
import { Markdown } from '../../components/Markdown';
import { refreshCommunityUnread } from '../../site/community-unread';
import { usePageMeta } from '../../site/page-meta';
import { failure } from './community-format';
import { AuthorName, Composer, Pager, PostingNotice, ResultCard, Time } from './CommunityParts';
import './community.css';

/** A post quoted into a reply. */
function quote(post: ForumPost): string {
  const who = post.author ? `**@${post.author.handle}** wrote:` : 'A deleted pilot wrote:';
  const lines = (post.body ?? '').trim().split('\n');
  return `> ${who}\n${lines.map((line) => `> ${line}`).join('\n')}\n\n`;
}

/** One thread, a page of posts at a time, with the reply box under them. */
export function ThreadScreen() {
  const { id: idParam = '' } = useParams();
  const id = Number.parseInt(idParam, 10);
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const navigate = useNavigate();
  const auth = useAuth();
  const viewer = auth.status === 'signedIn' ? auth.user : undefined;
  // Moderators and admins moderate threads.
  const isAdmin = viewer?.role === 'admin' || viewer?.role === 'moderator';
  // Load as whoever is signed in (admins see hidden posts), once that's known.
  const viewerKey = auth.status === 'signedIn' ? auth.user.id : auth.status;

  const [data, setData] = useState<ForumThread | undefined>(undefined);
  const [error, setError] = useState<{ missing: boolean; text: string } | undefined>(undefined);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  /** A post to bring into view once it's loaded (after replying). */
  const scrollTo = useRef<number | undefined>(undefined);
  usePageMeta(data ? { title: `${data.thread.title} · Community` } : { title: 'Community' });

  const load = useCallback(
    (at: number) =>
      getThread(id, at)
        .then((loaded) => {
          setData(loaded);
          setError(undefined);
          refreshCommunityUnread();
          return loaded;
        })
        .catch((caught: unknown) => {
          setError({
            missing:
              (caught instanceof ApiRequestError && caught.status === 404) || !Number.isFinite(id),
            text: failure(caught),
          });
          return undefined;
        }),
    [id],
  );

  useEffect(() => {
    if (viewerKey !== 'loading') void load(offset);
  }, [load, offset, viewerKey]);

  // After posting, show the new post.
  useEffect(() => {
    if (scrollTo.current === undefined || !data) return;
    const post = document.getElementById(`post-${scrollTo.current}`);
    if (!post) return;
    post.scrollIntoView({ block: 'center' });
    scrollTo.current = undefined;
  }, [data]);

  /** Reloads the page shown, after something changed. */
  const reload = () => void load(offset);

  /** Runs an action, reporting failures in the notice line. */
  const act = async (action: () => Promise<unknown>, done?: string) => {
    setNotice(undefined);
    try {
      await action();
      if (done) setNotice(done);
      reload();
    } catch (caught) {
      setNotice(failure(caught));
    }
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setReplyError(undefined);
    try {
      const post = await replyTo(id, reply);
      setReply('');
      // The new post is on the last page.
      const total = (data?.total ?? 0) + 1;
      const last = Math.floor((total - 1) / FORUM_POSTS_PAGE_SIZE) * FORUM_POSTS_PAGE_SIZE;
      if (last !== offset) setParams(last ? { offset: String(last) } : {});
      else reload();
      scrollTo.current = post.id;
    } catch (caught) {
      setReplyError(failure(caught));
    } finally {
      setBusy(false);
    }
  };

  if (error?.missing)
    return (
      <div className="site-empty">
        <h1>Not found</h1>
        <p>That thread doesn’t exist, or was deleted.</p>
        <div>
          <Link to="/community" className="site-button">
            Community
          </Link>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="site-page forum-page">
        {error ? (
          <p className="forum-error" role="alert">
            {error.text}
          </p>
        ) : (
          <p className="forum-muted">Loading…</p>
        )}
      </div>
    );

  const { thread, posts, posting } = data;
  const here = threadPath(thread);

  return (
    <div className="site-page forum-page">
      <p className="forum-crumbs">
        <Link to="/community">Community</Link>
        {' › '}
        <Link to={`/community/${thread.categoryId}`}>{thread.categoryName}</Link>
      </p>
      <div className="forum-heading">
        <div>
          <h1>
            {thread.pinned && <span className="forum-flag">Pinned</span>}
            {thread.locked && <span className="forum-flag">Locked</span>}
            {thread.title}
          </h1>
          <p className="forum-muted">
            {thread.replies} repl{thread.replies === 1 ? 'y' : 'ies'} · {thread.views} view
            {thread.views === 1 ? '' : 's'}
          </p>
        </div>
        {viewer && (
          <button
            type="button"
            className="site-button"
            aria-pressed={thread.following}
            onClick={() => void act(() => setFollowing(thread.id, !thread.following))}
          >
            {thread.following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {isAdmin && (
        <ThreadTools
          thread={thread}
          onChanged={reload}
          onDeleted={() => void navigate(`/community/${thread.categoryId}`)}
          onError={setNotice}
        />
      )}
      {notice && (
        <p className="forum-notice" role="status">
          {notice}
        </p>
      )}

      {thread.resultId && <ResultCard id={thread.resultId} />}

      <ol className="forum-posts">
        {posts.map((post) => (
          <PostView
            key={post.id}
            post={post}
            signedIn={Boolean(viewer)}
            isAdmin={isAdmin}
            isOwn={Boolean(viewer && post.author?.handle === viewer.handle)}
            canReply={posting.allowed}
            onQuote={() => {
              setReply(
                (current) =>
                  `${current}${current && !current.endsWith('\n') ? '\n\n' : ''}${quote(post)}`,
              );
              document.getElementById('reply')?.scrollIntoView({ block: 'center' });
            }}
            act={act}
            onEdited={(next) =>
              setData({ ...data, posts: posts.map((p) => (p.id === next.id ? next : p)) })
            }
          />
        ))}
      </ol>

      <Pager
        offset={offset}
        pageSize={FORUM_POSTS_PAGE_SIZE}
        total={data.total}
        onPage={(next) => setParams(next ? { offset: String(next) } : {})}
      />

      <section className="forum-reply" id="reply" aria-label="Reply">
        <PostingNotice posting={posting} next={here} />
        {posting.allowed && (
          <form onSubmit={(event) => void submitReply(event)} className="forum-form">
            <Composer
              label="Your reply"
              value={reply}
              onChange={setReply}
              newPoster={posting.newPoster}
              placeholder="Write a reply…"
            />
            {replyError && (
              <p className="forum-error" role="alert">
                {replyError}
              </p>
            )}
            <div className="forum-form__actions">
              <button
                type="submit"
                className="site-button site-button--primary"
                disabled={busy || !reply.trim()}
              >
                {busy ? 'Posting…' : 'Post reply'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function PostView({
  post,
  signedIn,
  isAdmin,
  isOwn,
  canReply,
  onQuote,
  act,
  onEdited,
}: {
  post: ForumPost;
  signedIn: boolean;
  isAdmin: boolean;
  isOwn: boolean;
  canReply: boolean;
  onQuote: () => void;
  act: (action: () => Promise<unknown>, done?: string) => Promise<void>;
  onEdited: (post: ForumPost) => void;
}) {
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [reporting, setReporting] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (editing === undefined) return;
    setBusy(true);
    setError(undefined);
    try {
      onEdited(await editPost(post.id, editing));
      setEditing(undefined);
    } catch (caught) {
      setError(failure(caught));
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async (event: FormEvent) => {
    event.preventDefault();
    if (reporting === undefined) return;
    setBusy(true);
    setError(undefined);
    try {
      await reportPost(post.id, reporting);
      setReporting(undefined);
      setError('Thanks. The Vector team will take a look.');
    } catch (caught) {
      setError(failure(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="forum-post" id={`post-${post.id}`} data-hidden={post.hidden || undefined}>
      <header className="forum-post__header">
        <AuthorName author={post.author} />
        <span className="forum-muted">
          <Time iso={post.createdAt} />
          {post.editedAt && (
            <span title={`Edited ${new Date(post.editedAt).toLocaleString()}`}> · edited</span>
          )}
        </span>
      </header>

      {editing !== undefined ? (
        <form className="forum-form" onSubmit={(event) => void saveEdit(event)}>
          <Composer label="Edit your post" value={editing} onChange={setEditing} autoFocus />
          <div className="forum-form__actions">
            <button type="button" className="site-button" onClick={() => setEditing(undefined)}>
              Cancel
            </button>
            <button
              type="submit"
              className="site-button site-button--primary"
              disabled={busy || !editing.trim()}
            >
              Save
            </button>
          </div>
        </form>
      ) : post.body === null ? (
        <p className="forum-muted forum-post__hidden">A moderator hid this post.</p>
      ) : (
        <>
          {post.hidden && <p className="forum-flag forum-flag--alert">Hidden from pilots</p>}
          <Markdown source={post.body} allowHtml={false} className="forum-post__body" />
        </>
      )}

      {reporting !== undefined && (
        <form className="forum-form forum-report" onSubmit={(event) => void sendReport(event)}>
          <label className="forum-field">
            <span>What’s wrong with this post?</span>
            <textarea
              className="forum-input"
              rows={3}
              maxLength={FORUM_REPORT_MAX}
              value={reporting}
              onChange={(event) => setReporting(event.target.value)}
            />
          </label>
          <div className="forum-form__actions">
            <button type="button" className="site-button" onClick={() => setReporting(undefined)}>
              Cancel
            </button>
            <button
              type="submit"
              className="site-button site-button--primary"
              disabled={busy || reporting.trim().length < 3}
            >
              Send report
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="forum-notice" role="status">
          {error}
        </p>
      )}

      {editing === undefined && (
        <footer className="forum-post__actions">
          <button
            type="button"
            className="forum-action"
            aria-pressed={post.usefulByYou}
            disabled={!signedIn || isOwn}
            title={
              !signedIn
                ? 'Sign in to mark posts useful'
                : isOwn
                  ? 'You can’t mark your own post useful'
                  : undefined
            }
            onClick={() => void act(() => setUseful(post.id, !post.usefulByYou))}
          >
            Useful{post.useful > 0 ? ` · ${post.useful}` : ''}
          </button>
          {canReply && post.body !== null && (
            <button type="button" className="forum-action" onClick={onQuote}>
              Quote
            </button>
          )}
          {post.canEdit && (
            <button
              type="button"
              className="forum-action"
              onClick={() => setEditing(post.body ?? '')}
            >
              Edit
            </button>
          )}
          {signedIn && !isOwn && reporting === undefined && (
            <button type="button" className="forum-action" onClick={() => setReporting('')}>
              Report
            </button>
          )}
          {isAdmin && (
            <>
              <button
                type="button"
                className="forum-action"
                onClick={() =>
                  void act(
                    () => setPostHidden(post.id, !post.hidden),
                    post.hidden ? 'Post shown again.' : 'Post hidden.',
                  )
                }
              >
                {post.hidden ? 'Show' : 'Hide'}
              </button>
              {!post.opening && (
                <button
                  type="button"
                  className="forum-action forum-action--danger"
                  onClick={() =>
                    window.confirm('Delete this post? This can’t be undone.') &&
                    void act(() => deletePost(post.id), 'Post deleted.')
                  }
                >
                  Delete
                </button>
              )}
              {post.author && !isOwn && (
                <button
                  type="button"
                  className="forum-action forum-action--danger"
                  onClick={() =>
                    window.confirm(
                      `Suspend @${post.author!.handle} from posting for 7 days? (Lift it from their page, or the Users tab.)`,
                    ) &&
                    void act(
                      () => setPostingSuspension(post.author!.handle, 7),
                      `@${post.author!.handle} can’t post for 7 days.`,
                    )
                  }
                >
                  Suspend poster
                </button>
              )}
            </>
          )}
        </footer>
      )}
    </li>
  );
}

/** Pin, lock, move or delete a thread (moderators and admins). */
function ThreadTools({
  thread,
  onChanged,
  onDeleted,
  onError,
}: {
  thread: ForumThread['thread'];
  onChanged: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  useEffect(() => {
    getCommunity()
      .then((loaded) => setCategories(loaded.categories))
      .catch(() => undefined);
  }, []);
  const change = (changes: Parameters<typeof moderateThread>[1]) =>
    moderateThread(thread.id, changes).then(onChanged, (caught: unknown) =>
      onError(failure(caught)),
    );

  return (
    <div className="forum-tools" role="group" aria-label="Moderate thread">
      <span className="forum-muted">Moderate</span>
      <button
        type="button"
        className="forum-action"
        onClick={() => void change({ pinned: !thread.pinned })}
      >
        {thread.pinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        type="button"
        className="forum-action"
        onClick={() => void change({ locked: !thread.locked })}
      >
        {thread.locked ? 'Unlock' : 'Lock'}
      </button>
      <label className="forum-tools__move">
        Move to
        <select
          className="forum-input"
          value={thread.categoryId}
          onChange={(event) => void change({ categoryId: event.target.value })}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="forum-action forum-action--danger"
        onClick={() =>
          window.confirm(`Delete “${thread.title}” and all its posts? This can’t be undone.`) &&
          void deleteThread(thread.id).then(onDeleted, (caught: unknown) =>
            onError(failure(caught)),
          )
        }
      >
        Delete thread
      </button>
    </div>
  );
}
