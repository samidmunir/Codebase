import { useEffect, useState, type FormEvent } from 'react';
import type { ForumCategory } from '@vector/shared';
import {
  createCategory,
  deleteCategory,
  getCommunity,
  updateCategory,
} from '../../api/community-api';
import { errorMessage } from './admin-format';

type Draft = { name: string; description: string; adminOnly: boolean };

/** The community's categories: add, rename, describe, reorder and remove (admins). */
export function CategoriesPanel() {
  const [categories, setCategories] = useState<ForumCategory[] | undefined>(undefined);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCommunity()
      .then((loaded) => !cancelled && setCategories(loaded.categories))
      .catch(
        (caught: unknown) => !cancelled && setNotice({ tone: 'alert', text: errorMessage(caught) }),
      );
    return () => {
      cancelled = true;
    };
  }, [reload]);

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

  // Deleting a category with threads asks where they go, right there in its row.
  const [deleting, setDeleting] = useState<{ id: string; moveTo: string } | undefined>();
  const remove = (category: ForumCategory) => {
    if (category.threads === 0) {
      if (window.confirm(`Delete “${category.name}”?`))
        void act(() => deleteCategory(category.id), `Deleted “${category.name}”.`);
      return;
    }
    const other = (categories ?? []).find((c) => c.id !== category.id);
    setDeleting({ id: category.id, moveTo: other?.id ?? '' });
  };

  return (
    <section className="admin-users__list" aria-label="Categories">
      <div className="admin-toolbar">
        <p className="admin-muted admin-toolbar__search">
          The order here is the order on the Community page. A category can only go once its threads
          have somewhere to go.
        </p>
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => setAdding(true)}
        >
          New category
        </button>
      </div>
      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}
      {adding && (
        <CategoryForm
          title="New category"
          withId
          initial={{ name: '', description: '', adminOnly: false }}
          onCancel={() => setAdding(false)}
          onSave={async (draft, id) => {
            const ok = await act(
              () => createCategory({ id: id ?? '', ...draft }),
              `Created “${draft.name}”.`,
            );
            if (ok) setAdding(false);
            return ok;
          }}
        />
      )}
      {!categories ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <ul className="admin-categories">
          {categories.map((category, index) => (
            <li key={category.id}>
              <span className="admin-categories__order">
                <button
                  type="button"
                  aria-label={`Move ${category.name} up`}
                  disabled={index === 0}
                  onClick={() =>
                    void act(() => updateCategory(category.id, { move: -1 }), 'Moved up.')
                  }
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${category.name} down`}
                  disabled={index === categories.length - 1}
                  onClick={() =>
                    void act(() => updateCategory(category.id, { move: 1 }), 'Moved down.')
                  }
                >
                  ▼
                </button>
              </span>
              {editing === category.id ? (
                <CategoryForm
                  title={`Edit ${category.name}`}
                  initial={{
                    name: category.name,
                    description: category.description,
                    adminOnly: category.adminOnly,
                  }}
                  onCancel={() => setEditing(undefined)}
                  onSave={async (draft) => {
                    const ok = await act(() => updateCategory(category.id, draft), 'Saved.');
                    if (ok) setEditing(undefined);
                    return ok;
                  }}
                />
              ) : (
                <div>
                  <strong>{category.name}</strong>{' '}
                  <span className="admin-muted">/community/{category.id}</span>
                  {category.adminOnly && <span className="admin-pill"> Admins start threads</span>}
                  <div className="admin-muted">{category.description}</div>
                  <div className="admin-muted">
                    {category.threads} thread{category.threads === 1 ? '' : 's'} · {category.posts}{' '}
                    post{category.posts === 1 ? '' : 's'}
                  </div>
                </div>
              )}
              {deleting?.id === category.id ? (
                <div className="admin-actions admin-categories__delete">
                  <label className="admin-inline-field">
                    Move its {category.threads} thread{category.threads === 1 ? '' : 's'} to
                    <select
                      className="admin-input"
                      value={deleting.moveTo}
                      onChange={(event) => setDeleting({ ...deleting, moveTo: event.target.value })}
                    >
                      {categories
                        .filter((c) => c.id !== category.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="admin-button admin-button--caution"
                    onClick={() =>
                      void act(
                        () => deleteCategory(category.id, deleting.moveTo),
                        `Moved its threads and deleted “${category.name}”.`,
                      ).then((ok) => ok && setDeleting(undefined))
                    }
                  >
                    Move and delete
                  </button>
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => setDeleting(undefined)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                editing !== category.id && (
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-link"
                      onClick={() => setEditing(category.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-link admin-link--danger"
                      onClick={() => remove(category)}
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryForm({
  title,
  initial,
  withId = false,
  onSave,
  onCancel,
}: {
  title: string;
  initial: Draft;
  withId?: boolean;
  onSave: (draft: Draft, id?: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [id, setId] = useState('');
  const [idEdited, setIdEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  // A new category's address follows its name until it's typed by hand.
  const address = idEdited
    ? id
    : draft.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    await onSave(draft, withId ? address : undefined);
    setBusy(false);
  };

  return (
    <form
      className="admin-form admin-category-form"
      aria-label={title}
      onSubmit={(event) => void submit(event)}
    >
      <div className="admin-form__grid">
        <label>
          Name
          <input
            className="admin-input"
            required
            maxLength={40}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        {withId && (
          <label>
            Address
            <input
              className="admin-input"
              maxLength={40}
              value={address}
              onChange={(event) => {
                setIdEdited(true);
                setId(event.target.value);
              }}
            />
            <span className="admin-muted">/community/{address}</span>
          </label>
        )}
      </div>
      <label>
        Description
        <input
          className="admin-input"
          required
          maxLength={200}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={draft.adminOnly}
          onChange={(event) => setDraft({ ...draft, adminOnly: event.target.checked })}
        />
        Only admins start threads here (anyone can reply)
      </label>
      <div className="admin-form__actions">
        <button type="button" className="admin-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="admin-button admin-button--primary"
          disabled={busy || !draft.name.trim() || !draft.description.trim()}
        >
          {withId ? 'Create category' : 'Save'}
        </button>
      </div>
    </form>
  );
}
