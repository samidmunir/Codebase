import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  FORUM_BODY_MAX,
  type AdminPost,
  type AdminPostList,
  type AdminThreadList,
  type ForumCategory,
} from '@vector/shared';
import {
  deletePost,
  deleteThread,
  editAnyPost,
  getCommunity,
  moderateThread,
  searchPosts,
  searchThreads,
  setPostHidden,
  threadPath,
} from '../../api/community-api';
import { errorMessage, formatAgo, formatDateTime } from './admin-format';

const PAGE = 50;

/** The community's categories, for filters and names. */
function useCategories() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  useEffect(() => {
    getCommunity()
      .then((loaded) => setCategories(loaded.categories))
      .catch(() => undefined);
  }, []);
  return categories;
}

/** A search box that settles before searching. */
function useSettled<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

function Pager({
  offset,
  total,
  onPage,
}: {
  offset: number;
  total: number;
  onPage: (offset: number) => void;
}) {
  if (total <= PAGE) return null;
  return (
    <div className="admin-pager">
      <span className="admin-muted">
        {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
      </span>
      <button
        type="button"
        className="admin-button"
        disabled={offset === 0}
        onClick={() => onPage(Math.max(0, offset - PAGE))}
      >
        Previous
      </button>
      <button
        type="button"
        className="admin-button"
        disabled={offset + PAGE >= total}
        onClick={() => onPage(offset + PAGE)}
      >
        Next
      </button>
    </div>
  );
}

/** Every thread: search titles, filter, and pin, lock, move or delete. */
export function ThreadsPanel() {
  const categories = useCategories();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState<'' | 'pinned' | 'locked'>('');
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<AdminThreadList | undefined>(undefined);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [reload, setReload] = useState(0);
  const search = useSettled(q);
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  useEffect(() => {
    let cancelled = false;
    searchThreads({
      ...(search ? { q: search } : {}),
      ...(category ? { category } : {}),
      ...(state ? { state } : {}),
      offset,
      limit: PAGE,
    })
      .then((loaded) => !cancelled && setList(loaded))
      .catch(
        (caught: unknown) => !cancelled && setNotice({ tone: 'alert', text: errorMessage(caught) }),
      );
    return () => {
      cancelled = true;
    };
  }, [search, category, state, offset, reload]);

  const act = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setNotice({ tone: 'ok', text: done });
      setReload((n) => n + 1);
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
    }
  };

  return (
    <section className="admin-users__list" aria-label="Threads">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar__search"
          placeholder="Search thread titles"
          aria-label="Search threads"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOffset(0);
          }}
        />
        <select
          className="admin-input"
          aria-label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">Every category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          aria-label="State"
          value={state}
          onChange={(event) => {
            setState(event.target.value as typeof state);
            setOffset(0);
          }}
        >
          <option value="">Any state</option>
          <option value="pinned">Pinned</option>
          <option value="locked">Locked</option>
        </select>
      </div>
      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.threads.length === 0 ? (
        <p className="admin-muted">No threads match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thread</th>
                <th>Category</th>
                <th className="num">Replies</th>
                <th>Last post</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.threads.map((thread) => (
                <tr key={thread.id}>
                  <td>
                    <Link to={threadPath(thread)}>{thread.title}</Link>
                    <div className="admin-muted">
                      {thread.author ? `@${thread.author.handle}` : 'Deleted pilot'} ·{' '}
                      {formatDateTime(thread.createdAt)} · {thread.views} views
                    </div>
                    <div>
                      {thread.pinned && <span className="admin-pill">Pinned</span>}
                      {thread.locked && <span className="admin-pill">Locked</span>}
                      {thread.openReports > 0 && (
                        <span className="admin-pill" data-tone="caution">
                          {thread.openReports} open report{thread.openReports === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className="admin-input"
                      aria-label={`Move “${thread.title}”`}
                      value={thread.categoryId}
                      onChange={(event) =>
                        void act(
                          () => moderateThread(thread.id, { categoryId: event.target.value }),
                          `Moved to ${names[event.target.value] ?? event.target.value}.`,
                        )
                      }
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num">{thread.replies}</td>
                  <td className="nowrap">{formatAgo(thread.lastPostAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() =>
                          void act(
                            () => moderateThread(thread.id, { pinned: !thread.pinned }),
                            thread.pinned ? 'Unpinned.' : 'Pinned.',
                          )
                        }
                      >
                        {thread.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() =>
                          void act(
                            () => moderateThread(thread.id, { locked: !thread.locked }),
                            thread.locked ? 'Unlocked.' : 'Locked.',
                          )
                        }
                      >
                        {thread.locked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        type="button"
                        className="admin-link admin-link--danger"
                        onClick={() =>
                          window.confirm(`Delete “${thread.title}” and all its posts?`) &&
                          void act(() => deleteThread(thread.id), 'Thread deleted.')
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list && <Pager offset={offset} total={list.total} onPage={setOffset} />}
    </section>
  );
}

/** Every post: search the text, filter by author, category or state; hide, edit or delete. */
export function PostsPanel() {
  const categories = useCategories();
  const [q, setQ] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState<'' | 'hidden' | 'reported' | 'edited'>('');
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<AdminPostList | undefined>(undefined);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [reload, setReload] = useState(0);
  const search = useSettled(q);
  const by = useSettled(author);
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  useEffect(() => {
    let cancelled = false;
    searchPosts({
      ...(search ? { q: search } : {}),
      ...(by.trim() ? { author: by.trim().replace(/^@/, '') } : {}),
      ...(category ? { category } : {}),
      ...(state ? { state } : {}),
      offset,
      limit: PAGE,
    })
      .then((loaded) => !cancelled && setList(loaded))
      .catch(
        (caught: unknown) => !cancelled && setNotice({ tone: 'alert', text: errorMessage(caught) }),
      );
    return () => {
      cancelled = true;
    };
  }, [search, by, category, state, offset, reload]);

  const act = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setNotice({ tone: 'ok', text: done });
      setReload((n) => n + 1);
      return true;
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
      return false;
    }
  };

  return (
    <section className="admin-users__list" aria-label="Posts">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar__search"
          placeholder="Search what posts say"
          aria-label="Search posts"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOffset(0);
          }}
        />
        <input
          className="admin-input"
          placeholder="Author’s handle"
          aria-label="Author’s handle"
          value={author}
          onChange={(event) => {
            setAuthor(event.target.value);
            setOffset(0);
          }}
        />
        <select
          className="admin-input"
          aria-label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">Every category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          aria-label="State"
          value={state}
          onChange={(event) => {
            setState(event.target.value as typeof state);
            setOffset(0);
          }}
        >
          <option value="">Any state</option>
          <option value="reported">Reported</option>
          <option value="hidden">Hidden</option>
          <option value="edited">Edited</option>
        </select>
      </div>
      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.posts.length === 0 ? (
        <p className="admin-muted">No posts match.</p>
      ) : (
        <ul className="admin-post-list">
          {list.posts.map((post) => (
            <PostRow key={post.id} post={post} categoryName={names[post.categoryId]} act={act} />
          ))}
        </ul>
      )}
      {list && <Pager offset={offset} total={list.total} onPage={setOffset} />}
    </section>
  );
}

function PostRow({
  post,
  categoryName,
  act,
}: {
  post: AdminPost;
  categoryName: string | undefined;
  act: (action: () => Promise<unknown>, done: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<string | undefined>(undefined);
  return (
    <li className="admin-card" aria-label={`Post in ${post.thread.title}`}>
      <div className="admin-card__header">
        <div>
          <Link to={`${threadPath(post.thread)}#post-${post.id}`}>{post.thread.title}</Link>
          <div className="admin-muted">
            {post.opening ? 'Opening post' : 'Reply'} by{' '}
            {post.author ? `@${post.author.handle}` : 'a deleted pilot'} ·{' '}
            {categoryName ?? post.categoryId} · {formatDateTime(post.createdAt)}
            {post.editedAt && ` · edited ${formatAgo(post.editedAt)}`}
          </div>
        </div>
        <div>
          {post.hidden && <span className="admin-pill">Hidden</span>}
          {post.openReports > 0 && (
            <span className="admin-pill" data-tone="caution">
              {post.openReports} open report{post.openReports === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      {editing === undefined ? (
        <p className="admin-post-body">{post.body}</p>
      ) : (
        <form
          className="admin-post-edit"
          onSubmit={(event) => {
            event.preventDefault();
            void act(() => editAnyPost(post.id, editing), 'Post edited.').then(
              (ok) => ok && setEditing(undefined),
            );
          }}
        >
          <textarea
            className="admin-input"
            aria-label="Post text"
            maxLength={FORUM_BODY_MAX}
            value={editing}
            onChange={(event) => setEditing(event.target.value)}
          />
          <p className="admin-muted">
            The post is marked edited, and the activity log keeps what it said before.
          </p>
          <div className="admin-actions">
            <button type="button" className="admin-button" onClick={() => setEditing(undefined)}>
              Cancel
            </button>
            <button
              type="submit"
              className="admin-button admin-button--primary"
              disabled={!editing.trim() || editing === post.body}
            >
              Save edit
            </button>
          </div>
        </form>
      )}
      {editing === undefined && (
        <div className="admin-actions">
          <button type="button" className="admin-link" onClick={() => setEditing(post.body)}>
            Edit
          </button>
          <button
            type="button"
            className="admin-link"
            onClick={() =>
              void act(
                () => setPostHidden(post.id, !post.hidden),
                post.hidden ? 'Shown again.' : 'Hidden.',
              )
            }
          >
            {post.hidden ? 'Show' : 'Hide'}
          </button>
          {!post.opening && (
            <button
              type="button"
              className="admin-link admin-link--danger"
              onClick={() =>
                window.confirm('Delete this post? This can’t be undone.') &&
                void act(() => deletePost(post.id), 'Post deleted.')
              }
            >
              Delete
            </button>
          )}
        </div>
      )}
    </li>
  );
}
