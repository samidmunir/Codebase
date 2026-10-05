import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { slugify, type NewsPost } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import { createNews, deleteNews, listAdminNews, updateNews } from '../../api/news-api';
import { Markdown } from '../../components/Markdown';
import { errorMessage, formatDateTime } from './admin-format';

type Draft = { title: string; slug: string; summary: string; body: string; published: boolean };
const EMPTY: Draft = { title: '', slug: '', summary: '', body: '', published: false };

/** Writing, publishing and deleting news posts. */
export function NewsTab() {
  const [posts, setPosts] = useState<NewsPost[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<{ id: string | undefined; draft: Draft } | undefined>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAdminNews()
      .then((list) => !cancelled && setPosts(list.posts))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (editing)
    return (
      <PostEditor
        id={editing.id}
        initial={editing.draft}
        onDone={() => {
          setEditing(undefined);
          setReload((n) => n + 1);
        }}
      />
    );

  return (
    <div className="admin-users__list">
      <div className="admin-toolbar">
        <p className="admin-muted admin-toolbar__search">
          Posts show on the News page, the front page and the play screen once published.
        </p>
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => setEditing({ id: undefined, draft: EMPTY })}
        >
          New post
        </button>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!posts ? (
        <p className="admin-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="admin-muted">No posts yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="admin-user-link__name">{post.title}</div>
                    <div className="admin-muted">/news/{post.slug}</div>
                  </td>
                  <td>
                    {post.publishedAt ? (
                      <span className="admin-pill" data-tone="ok">
                        Published {formatDateTime(post.publishedAt)}
                      </span>
                    ) : (
                      <span className="admin-pill">Draft</span>
                    )}
                  </td>
                  <td className="nowrap">{formatDateTime(post.updatedAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() =>
                          setEditing({
                            id: post.id,
                            draft: {
                              title: post.title,
                              slug: post.slug,
                              summary: post.summary,
                              body: post.body,
                              published: post.publishedAt !== null,
                            },
                          })
                        }
                      >
                        Edit
                      </button>
                      {post.publishedAt && (
                        <Link className="admin-link" to={`/news/${post.slug}`}>
                          View
                        </Link>
                      )}
                      <button
                        type="button"
                        className="admin-link admin-link--danger"
                        onClick={() => {
                          if (!window.confirm(`Delete “${post.title}”? This can’t be undone.`))
                            return;
                          deleteNews(post.id)
                            .then(() => setReload((n) => n + 1))
                            .catch((caught: unknown) => setError(errorMessage(caught)));
                        }}
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
    </div>
  );
}

function PostEditor({
  id,
  initial,
  onDone,
}: {
  id: string | undefined;
  initial: Draft;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  // A new post's address follows its title until it's typed by hand.
  const [slugEdited, setSlugEdited] = useState(id !== undefined);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const slug = slugEdited ? draft.slug : slugify(draft.title);

  const save = async (event: FormEvent, published: boolean) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFields({});
    try {
      const request = { ...draft, slug, published };
      if (id) await updateNews(id, request);
      else await createNews(request);
      onDone();
    } catch (caught) {
      setFields(caught instanceof ApiRequestError ? caught.fields : {});
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <form
      className="admin-card admin-form news-editor"
      onSubmit={(event) => void save(event, draft.published)}
    >
      <header className="admin-card__header">
        <h2>{id ? 'Edit post' : 'New post'}</h2>
        <button type="button" className="admin-link" onClick={onDone}>
          Cancel
        </button>
      </header>
      <div className="admin-form__grid">
        <label>
          Title
          <input
            className="admin-input"
            required
            maxLength={120}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          {fields.title && <span className="admin-field-error">{fields.title}</span>}
        </label>
        <label>
          Address
          <input
            className="admin-input"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setDraft({ ...draft, slug: event.target.value });
            }}
          />
          <span className="admin-muted">/news/{slug}</span>
          {fields.slug && <span className="admin-field-error">{fields.slug}</span>}
        </label>
      </div>
      <label>
        Summary (shown in lists and link previews)
        <input
          className="admin-input"
          maxLength={300}
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
        />
      </label>
      <div className="news-editor__panes">
        <label>
          Post (Markdown)
          <textarea
            className="admin-input news-editor__body"
            rows={18}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
        </label>
        <div>
          <span className="admin-muted">Preview</span>
          <div className="news-editor__preview">
            {draft.body.trim() ? (
              <Markdown source={draft.body} />
            ) : (
              <p className="admin-muted">Nothing written yet.</p>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-form__actions">
        {draft.published ? (
          <>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={(event) => void save(event, false)}
            >
              Unpublish
            </button>
            <button type="submit" className="admin-button admin-button--primary" disabled={busy}>
              Save
            </button>
          </>
        ) : (
          <>
            <button type="submit" className="admin-button" disabled={busy}>
              Save draft
            </button>
            <button
              type="button"
              className="admin-button admin-button--primary"
              disabled={busy || !draft.title.trim()}
              onClick={(event) => void save(event, true)}
            >
              Publish
            </button>
          </>
        )}
      </div>
    </form>
  );
}
