import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ADMIN_USERS_PAGE_SIZE,
  PASSWORD_MIN_LENGTH,
  type AdminBulkAction,
  type AdminBulkResult,
  type AdminUser,
  type UserRole,
} from '@vector/shared';
import {
  bulkAdminUsers,
  createAdminUser,
  exportAdminUsers,
  listAdminUsers,
} from '../../api/admin-api';
import { formatRp } from '../scope/score-format';
import { ROLE_LABELS, errorMessage, formatAgo, formatDate } from './admin-format';

type Filters = { q: string; role: '' | UserRole; status: '' | 'active' | 'disabled' };

/** The bulk actions, how they read, and which need a second thought. */
const BULK: { action: AdminBulkAction; label: string; confirm?: string }[] = [
  { action: 'verifyEmail', label: 'Mark email verified' },
  { action: 'signOut', label: 'Sign out everywhere' },
  { action: 'suspendPosting', label: 'Suspend posting 7 days' },
  { action: 'liftSuspension', label: 'Lift posting suspension' },
  {
    action: 'disable',
    label: 'Disable',
    confirm: 'Disable {n}? They’ll be signed out and can’t sign in.',
  },
  { action: 'enable', label: 'Re-enable' },
  {
    action: 'delete',
    label: 'Delete',
    confirm: 'Delete {n} and everything they saved? This can’t be undone.',
  },
];

/** Every account: search and filter, act on several at once, export, or create one. */
export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({ q: '', role: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<{ users: AdminUser[]; total: number } | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<{ label: string; result: AdminBulkResult }>();
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  // Search as you type, a moment after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  const filterQuery = {
    ...(query.q ? { q: query.q } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

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
  const shownIds = list?.users.map((user) => user.id) ?? [];
  const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (option: (typeof BULK)[number]) => {
    const count = `${selected.size} user${selected.size === 1 ? '' : 's'}`;
    if (option.confirm && !window.confirm(option.confirm.replace('{n}', count))) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await bulkAdminUsers({ ids: [...selected], action: option.action });
      setBulkResult({ label: option.label, result });
      setSelected(new Set(result.failed.map((failure) => failure.id)));
      refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-users">
      <section className="admin-users__list">
        <div className="admin-toolbar">
          <input
            type="search"
            className="admin-input admin-toolbar__search"
            placeholder="Search name, handle or email"
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
            <option value="moderator">Moderators</option>
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
            className="admin-button"
            disabled={busy}
            title="Everyone matching these filters, as a spreadsheet. Exports are logged."
            onClick={() =>
              void exportAdminUsers(filterQuery).catch((caught: unknown) =>
                setError(errorMessage(caught)),
              )
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => setCreating(true)}
          >
            New user
          </button>
        </div>

        {selected.size > 0 && (
          <div className="admin-bulk" role="toolbar" aria-label="Selected users">
            <strong>{selected.size} selected</strong>
            {BULK.map((option) => (
              <button
                key={option.action}
                type="button"
                className={`admin-button${option.confirm ? ' admin-button--caution' : ''}`}
                disabled={busy}
                onClick={() => void runBulk(option)}
              >
                {option.label}
              </button>
            ))}
            <button type="button" className="admin-link" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}
        {bulkResult && (
          <div
            className={bulkResult.result.failed.length ? 'admin-error' : 'admin-notice'}
            role="status"
          >
            {bulkResult.label}: done for {bulkResult.result.done}
            {bulkResult.result.failed.length > 0 && (
              <>
                , not for {bulkResult.result.failed.length} (still selected):
                <ul className="admin-bulk__failures">
                  {bulkResult.result.failed.map((failure) => (
                    <li key={failure.id}>
                      {failure.email}: {failure.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={(user) => {
              setCreating(false);
              void navigate(`/admin/users/${user.id}`);
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
                  <th className="admin-table__check">
                    <input
                      type="checkbox"
                      aria-label="Select everyone shown"
                      checked={allShown}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const id of shownIds) {
                            if (allShown) next.delete(id);
                            else next.add(id);
                          }
                          return next;
                        })
                      }
                    />
                  </th>
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
                    aria-selected={selected.has(user.id)}
                    data-disabled={user.disabledAt ? 'true' : undefined}
                  >
                    <td className="admin-table__check">
                      <input
                        type="checkbox"
                        aria-label={`Select ${user.email}`}
                        checked={selected.has(user.id)}
                        onChange={() => toggle(user.id)}
                      />
                    </td>
                    <td>
                      <Link className="admin-user-link" to={`/admin/users/${user.id}`}>
                        <span className="admin-user-link__name">
                          {user.displayName}
                          {user.id === currentUserId && <span className="admin-muted"> (you)</span>}
                        </span>
                        <span className="admin-user-link__email">
                          @{user.handle} · {user.email}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span
                        className="admin-pill"
                        data-tone={user.role === 'player' ? undefined : 'ok'}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                      {!user.emailVerified && <span className="admin-pill">Unverified</span>}
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
    handle: '',
    displayName: '',
    email: '',
    password: '',
    role: 'player' as UserRole,
    sendVerification: true,
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
          Handle
          <input
            className="admin-input"
            required
            maxLength={20}
            autoCapitalize="off"
            value={form.handle}
            onChange={(event) => setForm({ ...form, handle: event.target.value })}
          />
          {error?.fields.handle && <span className="admin-field-error">{error.fields.handle}</span>}
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
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={form.sendVerification}
          onChange={(event) => setForm({ ...form, sendVerification: event.target.checked })}
        />
        Send a link to verify their address
      </label>
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
