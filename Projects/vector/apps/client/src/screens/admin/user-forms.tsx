import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH, type AdminUpdateUserRequest, type UserRole } from '@vector/shared';

// The forms on a user's admin page.

export function DetailsForm({
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
            <option value="moderator">Moderator (the community only)</option>
            <option value="admin">Admin (everything)</option>
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

export function PasswordForm({
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

export function DeleteAccount({
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
