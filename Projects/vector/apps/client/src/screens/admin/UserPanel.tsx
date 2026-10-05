import { useEffect, useState, type FormEvent } from 'react';
import {
  PASSWORD_MIN_LENGTH,
  type AdminUpdateUserRequest,
  type AdminUserDetail,
  type UserRole,
} from '@vector/shared';
import {
  deleteAdminUser,
  deleteAdminUserSession,
  getAdminUser,
  signOutAdminUser,
  updateAdminUser,
} from '../../api/admin-api';
import { findAirspace } from '../../airspaces/registry';
import { formatSimDuration } from '../saved-session-format';
import { formatRp } from '../scope/score-format';
import { errorMessage, formatAgo, formatDateTime } from './admin-format';

type Notice = { tone: 'ok' | 'alert'; text: string };

/** One account: edit it, end its sign-ins, disable or delete it, and manage its saved sessions. */
export function UserPanel({
  userId,
  isSelf,
  onClose,
  onChanged,
}: {
  userId: string;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | undefined>(undefined);
  const [suspendFor, setSuspendFor] = useState('7');
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAdminUser(userId)
      .then((loaded) => !cancelled && setDetail(loaded))
      .catch((caught: unknown) => !cancelled && setLoadError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  /** Runs an action, then reloads this user and the list. */
  const act = async (action: () => Promise<unknown>, done: string): Promise<boolean> => {
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      setNotice({ tone: 'ok', text: done });
      onChanged();
      setVersion((v) => v + 1);
      return true;
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <aside className="admin-users__detail admin-card">
        <p className="admin-error" role="alert">
          {loadError}
        </p>
        <button type="button" className="admin-button" onClick={onClose}>
          Close
        </button>
      </aside>
    );
  if (!detail)
    return (
      <aside className="admin-users__detail admin-card">
        <p className="admin-muted">Loading…</p>
      </aside>
    );

  const { user, sessions } = detail;
  const disabled = Boolean(user.disabledAt);
  const update = (request: AdminUpdateUserRequest, done: string) =>
    act(() => updateAdminUser(user.id, request), done);

  return (
    <aside className="admin-users__detail admin-card" aria-label={`Manage ${user.email}`}>
      <header className="admin-card__header">
        <div>
          <h2>{user.displayName}</h2>
          <p className="admin-muted">
            @{user.handle} · {user.email}
          </p>
        </div>
        <button type="button" className="admin-icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      <dl className="admin-facts">
        <div>
          <dt>Status</dt>
          <dd>
            {disabled ? (
              <span className="admin-pill" data-tone="alert">
                Disabled {formatAgo(user.disabledAt)}
              </span>
            ) : (
              <span className="admin-pill" data-tone="ok">
                Active
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            {user.emailVerified ? (
              <span className="admin-pill" data-tone="ok">
                Verified
              </span>
            ) : (
              <span className="admin-pill">Not verified</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDateTime(user.createdAt)}</dd>
        </div>
        <div>
          <dt>Last active</dt>
          <dd>{formatAgo(user.lastActiveAt)}</dd>
        </div>
        <div>
          <dt>Signed in on</dt>
          <dd>
            {user.activeSignIns} device{user.activeSignIns === 1 ? '' : 's'}
          </dd>
        </div>
        <div>
          <dt>Career RP</dt>
          <dd>{formatRp(user.careerRp)}</dd>
        </div>
      </dl>

      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}

      <DetailsForm
        key={`${user.email}|${user.handle}|${user.displayName}|${user.role}`}
        email={user.email}
        handle={user.handle}
        displayName={user.displayName}
        role={user.role}
        isSelf={isSelf}
        busy={busy}
        onSave={(changes) => update(changes, 'Saved.')}
      />

      <PasswordForm
        busy={busy}
        onSave={(password) =>
          update({ password }, 'Password changed. They’ve been signed out everywhere.')
        }
      />

      <section className="admin-section">
        <h3>Access</h3>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button"
            disabled={busy || user.activeSignIns === 0}
            onClick={() => void act(() => signOutAdminUser(user.id), 'Signed out on every device.')}
          >
            Sign out everywhere
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() =>
              void update(
                { emailVerified: !user.emailVerified },
                user.emailVerified
                  ? 'Email marked not verified. They’re off the records until they verify it.'
                  : 'Email marked verified.',
              )
            }
          >
            {user.emailVerified ? 'Mark email not verified' : 'Mark email verified'}
          </button>
          {disabled ? (
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() =>
                void update({ disabled: false }, 'Re-enabled. They can sign in again.')
              }
            >
              Re-enable account
            </button>
          ) : (
            <button
              type="button"
              className="admin-button admin-button--caution"
              disabled={busy || isSelf}
              title={isSelf ? 'You can’t disable your own account' : undefined}
              onClick={() =>
                window.confirm(`Disable ${user.email}? They’ll be signed out and can’t sign in.`) &&
                void update({ disabled: true }, 'Disabled and signed out everywhere.')
              }
            >
              Disable account
            </button>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h3>Community</h3>
        <p className="admin-muted">
          {user.postingSuspendedUntil === 'forever'
            ? 'Suspended from posting for good.'
            : user.postingSuspendedUntil
              ? `Suspended from posting until ${formatDateTime(user.postingSuspendedUntil)}.`
              : 'Can post (once their email is verified).'}
        </p>
        <div className="admin-actions">
          <label className="admin-inline-field">
            For
            <select
              className="admin-input"
              value={suspendFor}
              onChange={(event) => setSuspendFor(event.target.value)}
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="forever">Good (no end)</option>
            </select>
          </label>
          <button
            type="button"
            className="admin-button admin-button--caution"
            disabled={busy}
            onClick={() =>
              void update(
                {
                  postingSuspension: suspendFor === 'forever' ? 'forever' : Number(suspendFor),
                },
                'Suspended from posting.',
              )
            }
          >
            Suspend from posting
          </button>
          {user.postingSuspendedUntil && (
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => void update({ postingSuspension: 'lift' }, 'They can post again.')}
            >
              Lift suspension
            </button>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h3>Saved sessions ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <p className="admin-muted">None.</p>
        ) : (
          <ul className="admin-sessions">
            {sessions.map((saved) => (
              <li key={saved.id}>
                <span>
                  <strong>{saved.name}</strong>
                  <span className="admin-muted">
                    {' '}
                    · {findAirspace(saved.airspaceId)?.facility ?? saved.airspaceId} ·{' '}
                    {formatRp(saved.rp)} · {formatSimDuration(saved.simTimeSec)} · saved{' '}
                    {formatAgo(saved.updatedAt)}
                  </span>
                </span>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(`Delete “${saved.name}”? This can’t be undone.`) &&
                    void act(
                      () => deleteAdminUserSession(user.id, saved.id),
                      `Deleted “${saved.name}”.`,
                    )
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSelf && (
        <DeleteAccount
          email={user.email}
          busy={busy}
          onDelete={async () => {
            if (await act(() => deleteAdminUser(user.id), 'Deleted.')) onClose();
          }}
        />
      )}
    </aside>
  );
}

function DetailsForm({
  email,
  handle,
  displayName,
  role,
  isSelf,
  busy,
  onSave,
}: {
  email: string;
  handle: string;
  displayName: string;
  role: UserRole;
  isSelf: boolean;
  busy: boolean;
  onSave: (changes: AdminUpdateUserRequest) => Promise<boolean>;
}) {
  const [form, setForm] = useState({ email, handle, displayName, role });
  const changes: AdminUpdateUserRequest = {
    ...(form.email.trim().toLowerCase() !== email ? { email: form.email } : {}),
    ...(form.handle.trim() !== handle ? { handle: form.handle } : {}),
    ...(form.displayName.trim() !== displayName ? { displayName: form.displayName } : {}),
    ...(form.role !== role ? { role: form.role } : {}),
  };
  const changed = Object.keys(changes).length > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (changed) void onSave(changes);
  };

  return (
    <form className="admin-section admin-form" onSubmit={submit} aria-label="Account details">
      <h3>Details</h3>
      <div className="admin-form__grid">
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
        </label>
        <label>
          Display name
          <input
            className="admin-input"
            required
            maxLength={40}
            value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          />
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
        </label>
        <label>
          Role
          <select
            className="admin-input"
            value={form.role}
            disabled={isSelf}
            title={isSelf ? 'You can’t change your own role' : undefined}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
          >
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      <div className="admin-form__actions">
        <button
          type="submit"
          className="admin-button admin-button--primary"
          disabled={busy || !changed}
        >
          Save changes
        </button>
      </div>
    </form>
  );
}

function PasswordForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await onSave(password)) setPassword('');
  };
  return (
    <form
      className="admin-section admin-form"
      onSubmit={(event) => void submit(event)}
      aria-label="Set password"
    >
      <h3>Password</h3>
      <div className="admin-form__inline">
        <input
          className="admin-input"
          type="password"
          aria-label="New password"
          placeholder={`New password (at least ${PASSWORD_MIN_LENGTH} characters)`}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit" className="admin-button" disabled={busy || password.length === 0}>
          Set password
        </button>
      </div>
    </form>
  );
}

function DeleteAccount({
  email,
  busy,
  onDelete,
}: {
  email: string;
  busy: boolean;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <section className="admin-section admin-danger-zone">
      <h3>Delete account</h3>
      <p className="admin-muted">
        Permanently removes the account, its saved sessions and settings. This can’t be undone.
      </p>
      {confirming ? (
        <div className="admin-form__inline">
          <input
            className="admin-input"
            aria-label="Type the email to confirm"
            placeholder={`Type ${email} to confirm`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <button
            type="button"
            className="admin-button admin-button--danger"
            disabled={busy || typed.trim().toLowerCase() !== email}
            onClick={() => void onDelete()}
          >
            Delete permanently
          </button>
          <button type="button" className="admin-button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="admin-button admin-button--danger"
          onClick={() => setConfirming(true)}
        >
          Delete account…
        </button>
      )}
    </section>
  );
}
