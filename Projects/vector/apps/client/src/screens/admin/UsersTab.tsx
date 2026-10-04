import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ADMIN_USERS_PAGE_SIZE,
  PASSWORD_MIN_LENGTH,
  type AdminUser,
  type UserRole,
} from '@vector/shared';
import { createAdminUser, listAdminUsers } from '../../api/admin-api';
import { formatRp } from '../scope/score-format';
import { errorMessage, formatAgo, formatDate } from './admin-format';
import { UserPanel } from './UserPanel';

type Filters = { q: string; role: '' | UserRole; status: '' | 'active' | 'disabled' };

/** Every account: search and filter, open one to manage it, or create one. */
export function UsersTab({
  selectedId,
  onSelect,
  currentUserId,
}: {
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  currentUserId: string;
}) {
  const [filters, setFilters] = useState<Filters>({ q: '', role: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<{ users: AdminUser[]; total: number } | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  // Search as you type, a moment after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    listAdminUsers({
      ...(query.q ? { q: query.q } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      offset,
      limit: ADMIN_USERS_PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setList(result);
        setError(undefined);
      })
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [query, offset, reload]);

  const lastShown = Math.min(offset + ADMIN_USERS_PAGE_SIZE, list?.total ?? 0);

  return (
    <div className="admin-users" data-detail={selectedId ? 'open' : undefined}>
      <section className="admin-users__list">
        <div className="admin-toolbar">
          <input
            type="search"
            className="admin-input admin-toolbar__search"
            placeholder="Search name or email"
            aria-label="Search users"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
          <select
            className="admin-input"
            aria-label="Role"
            value={filters.role}
            onChange={(event) =>
              setFilters({ ...filters, role: event.target.value as Filters['role'] })
            }
          >
            <option value="">All roles</option>
            <option value="player">Players</option>
            <option value="admin">Admins</option>
          </select>
          <select
            className="admin-input"
            aria-label="Status"
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value as Filters['status'] })
            }
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => setCreating(true)}
          >
            New user
          </button>
        </div>

        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={(user) => {
              setCreating(false);
              refresh();
              onSelect(user.id);
            }}
          />
        )}

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {!list ? (
          <p className="admin-muted">Loading…</p>
        ) : list.users.length === 0 ? (
          <p className="admin-muted">No users match.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last active</th>
                  <th className="num">Sessions</th>
                  <th className="num">Career RP</th>
                </tr>
              </thead>
              <tbody>
                {list.users.map((user) => (
                  <tr
                    key={user.id}
                    aria-selected={user.id === selectedId}
                    data-disabled={user.disabledAt ? 'true' : undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="admin-user-link"
                        onClick={() => onSelect(user.id)}
                      >
                        <span className="admin-user-link__name">
                          {user.displayName}
                          {user.id === currentUserId && <span className="admin-muted"> (you)</span>}
                        </span>
                        <span className="admin-user-link__email">{user.email}</span>
                      </button>
                    </td>
                    <td>
                      <span
                        className="admin-pill"
                        data-tone={user.role === 'admin' ? 'ok' : undefined}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Player'}
                      </span>
                      {user.disabledAt && (
                        <span className="admin-pill" data-tone="alert">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="nowrap">{formatDate(user.createdAt)}</td>
                    <td className="nowrap">{formatAgo(user.lastActiveAt)}</td>
                    <td className="num">{user.savedSessions}</td>
                    <td className="num">{formatRp(user.careerRp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && list.total > ADMIN_USERS_PAGE_SIZE && (
          <div className="admin-pager">
            <span className="admin-muted">
              {offset + 1}–{lastShown} of {list.total}
            </span>
            <button
              type="button"
              className="admin-button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - ADMIN_USERS_PAGE_SIZE))}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={lastShown >= list.total}
              onClick={() => setOffset(offset + ADMIN_USERS_PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {selectedId && (
        <UserPanel
          key={selectedId}
          userId={selectedId}
          isSelf={selectedId === currentUserId}
          onClose={() => onSelect(undefined)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function CreateUserForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (user: AdminUser) => void;
}) {
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'player' as UserRole,
  });
  const [error, setError] = useState<
    { message: string; fields: Record<string, string> } | undefined
  >(undefined);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      onCreated(await createAdminUser(form));
    } catch (caught) {
      const fields =
        caught && typeof caught === 'object' && 'fields' in caught
          ? (caught as { fields: Record<string, string> }).fields
          : {};
      setError({ message: errorMessage(caught), fields });
      setBusy(false);
    }
  };

  return (
    <form
      className="admin-card admin-form"
      onSubmit={(event) => void submit(event)}
      aria-label="New user"
    >
      <h2>New user</h2>
      <div className="admin-form__grid">
        <label>
          Display name
          <input
            className="admin-input"
            required
            maxLength={40}
            value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          />
          {error?.fields.displayName && (
            <span className="admin-field-error">{error.fields.displayName}</span>
          )}
        </label>
        <label>
          Email
          <input
            className="admin-input"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          {error?.fields.email && <span className="admin-field-error">{error.fields.email}</span>}
        </label>
        <label>
          Password
          <input
            className="admin-input"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error?.fields.password && (
            <span className="admin-field-error">{error.fields.password}</span>
          )}
        </label>
        <label>
          Role
          <select
            className="admin-input"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
          >
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      {error && !Object.keys(error.fields).length && (
        <p className="admin-error" role="alert">
          {error.message}
        </p>
      )}
      <div className="admin-form__actions">
        <button type="button" className="admin-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="admin-button admin-button--primary" disabled={busy}>
          Create user
        </button>
      </div>
    </form>
  );
}
