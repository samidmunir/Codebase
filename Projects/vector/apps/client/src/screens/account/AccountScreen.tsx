import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { PASSWORD_MIN_LENGTH, type Account } from '@vector/shared';
import {
  changePassword,
  deleteAccount,
  getAccount,
  signOutOtherDevices,
  updateProfile,
} from '../../api/account-api';
import { ApiRequestError } from '../../api/api-client';
import { cancelEmailChange, changeEmail, sendVerificationEmail } from '../../api/email-api';
import { auth } from '../../auth/auth-store';
import { HandleField } from '../../components/HandleField';
import { useHandleAvailability } from '../../components/use-handle-availability';
import { formatDate } from '../admin/admin-format';
import { usePageMeta } from '../../site/page-meta';
import './account-screen.css';

type Status = { tone: 'ok' | 'alert'; text: string } | undefined;

const failure = (caught: unknown) => (caught instanceof ApiRequestError ? caught : undefined);

/** The pilot's own account: profile, password, devices, and deleting it. */
export function AccountScreen() {
  usePageMeta({ title: 'Account' });
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getAccount()
      .then((loaded) => !cancelled && setAccount(loaded))
      .catch(
        (caught: unknown) =>
          !cancelled && setLoadError(failure(caught)?.message ?? "Couldn't reach the server."),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const changed = (next: Account) => {
    setAccount(next);
    auth.updateUser({
      handle: next.handle,
      handleGenerated: next.handleGenerated,
      displayName: next.displayName,
    });
  };

  return (
    <div className="site-page account-page">
      <h1>Account</h1>
      <p className="site-page__lede">
        {account
          ? `Signed in as ${account.email} · member since ${formatDate(account.createdAt)}`
          : 'Your profile, password and devices.'}
      </p>
      {loadError && (
        <p className="account-status" data-tone="alert" role="alert">
          {loadError}
        </p>
      )}
      {account && (
        <div className="account-sections">
          <ProfileSection key={account.id} account={account} onChanged={changed} />
          <EmailSection account={account} onChanged={() => void getAccount().then(setAccount)} />
          <PasswordSection />
          <DevicesSection
            activeSignIns={account.activeSignIns}
            onChanged={() => void getAccount().then(setAccount)}
          />
          <DeleteSection handle={account.handle} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="account-section" aria-label={title}>
      <header>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="account-section__body">{children}</div>
    </section>
  );
}

function StatusLine({ status }: { status: Status }) {
  return status ? (
    <p className="account-status" data-tone={status.tone} role="status">
      {status.text}
    </p>
  ) : null;
}

function ProfileSection({
  account,
  onChanged,
}: {
  account: Account;
  onChanged: (next: Account) => void;
}) {
  const [handle, setHandle] = useState(account.handleGenerated ? '' : account.handle);
  const [displayName, setDisplayName] = useState(account.displayName);
  const [profilePublic, setProfilePublic] = useState(account.profilePublic);
  const [showOnRecords, setShowOnRecords] = useState(account.showOnRecords);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(undefined);
  const [busy, setBusy] = useState(false);
  const availability = useHandleAvailability(handle, account.handle);
  const handleChanged = handle.trim() !== '' && handle.trim() !== account.handle;
  const nameChanged = displayName.trim() !== account.displayName;
  const privacyChanged =
    profilePublic !== account.profilePublic || showOnRecords !== account.showOnRecords;
  const lockedUntil = account.handleChangeableAt;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(undefined);
    setFields({});
    try {
      onChanged(
        await updateProfile({
          ...(handleChanged ? { handle: handle.trim() } : {}),
          ...(nameChanged ? { displayName: displayName.trim() } : {}),
          ...(profilePublic !== account.profilePublic ? { profilePublic } : {}),
          ...(showOnRecords !== account.showOnRecords ? { showOnRecords } : {}),
        }),
      );
      setStatus({ tone: 'ok', text: 'Saved.' });
    } catch (caught) {
      const error = failure(caught);
      setFields(error?.fields ?? {});
      setStatus({ tone: 'alert', text: error?.message ?? "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Profile"
      description={
        account.handleGenerated
          ? `You haven’t chosen a handle yet: for now you’re @${account.handle}. Pick the one you’ll be known by.`
          : 'How you appear on profiles, records and the forum. Your email is never shown.'
      }
    >
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <HandleField
          value={handle}
          onChange={setHandle}
          current={account.handle}
          error={fields.handle}
          className="account-field"
          hintClassName="account-field__hint"
          errorClassName="account-field__error"
        />
        {lockedUntil && (
          <p className="account-field__hint">
            You changed your handle recently. You can change it again on {formatDate(lockedUntil)}{' '}
            (a change of capitals is fine any time).
          </p>
        )}
        <label className="account-field">
          <span>Display name</span>
          <input
            name="displayName"
            maxLength={40}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          {fields.displayName && <span className="account-field__error">{fields.displayName}</span>}
        </label>
        <label className="account-check">
          <input
            type="checkbox"
            checked={profilePublic}
            onChange={(event) => setProfilePublic(event.target.checked)}
          />
          <span>
            <strong>Public profile</strong>
            <span>
              Anyone can see your career and sessions at{' '}
              <Link to={`/pilots/${account.handle}`}>/pilots/{account.handle}</Link>. Turned off,
              only you can.
            </span>
          </span>
        </label>
        <label className="account-check">
          <input
            type="checkbox"
            checked={showOnRecords}
            onChange={(event) => setShowOnRecords(event.target.checked)}
          />
          <span>
            <strong>Show me on the records</strong>
            <span>
              Your verified sessions count on the <Link to="/records">leaderboards</Link> under your
              handle (even with a private profile).
            </span>
          </span>
        </label>
        <StatusLine status={status} />
        <div className="account-form__actions">
          <button
            type="submit"
            className="site-button site-button--primary"
            disabled={
              busy ||
              (!handleChanged && !nameChanged && !privacyChanged) ||
              availability?.available === false
            }
          >
            Save profile
          </button>
        </div>
      </form>
    </Section>
  );
}

function EmailSection({ account, onChanged }: { account: Account; onChanged: () => void }) {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(undefined);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setStatus(undefined);
    setFields({});
    try {
      await action();
      setStatus({ tone: 'ok', text: done });
      onChanged();
      return true;
    } catch (caught) {
      const error = failure(caught);
      setFields(error?.fields ?? {});
      setStatus({ tone: 'alert', text: error?.message ?? "Couldn't reach the server." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const target = email.trim();
    if (
      await run(
        () => changeEmail(target, currentPassword),
        `We sent a link to ${target}. Your email changes when you open it.`,
      )
    ) {
      setEmail('');
      setCurrentPassword('');
    }
  };

  return (
    <Section
      title="Email"
      description="Where your sign-in and account emails go. It’s never shown to anyone."
    >
      <p className="account-email">
        <strong>{account.email}</strong>{' '}
        {account.emailVerified ? (
          <span className="account-badge" data-tone="ok">
            Verified
          </span>
        ) : (
          <span className="account-badge">Not verified</span>
        )}
      </p>
      {!account.emailVerified && (
        <div className="account-form__actions account-form__actions--start">
          <p className="account-field__hint">
            Verify it to put your sessions on the records. We sent you a link when you signed up.
          </p>
          <button
            type="button"
            className="site-button"
            disabled={busy}
            onClick={() =>
              void run(sendVerificationEmail, `We sent a new link to ${account.email}.`)
            }
          >
            Send the link again
          </button>
        </div>
      )}
      {account.pendingEmail && (
        <div className="account-form__actions account-form__actions--start">
          <p className="account-field__hint">
            Waiting for you to open the link sent to <strong>{account.pendingEmail}</strong>.
          </p>
          <button
            type="button"
            className="site-button"
            disabled={busy}
            onClick={() => void run(cancelEmailChange, 'Email change cancelled.')}
          >
            Cancel the change
          </button>
        </div>
      )}
      <form
        className="account-form"
        aria-label="Change email"
        onSubmit={(event) => void submit(event)}
      >
        <label className="account-field">
          <span>New email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fields.email && <span className="account-field__error">{fields.email}</span>}
        </label>
        <label className="account-field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          {fields.currentPassword && (
            <span className="account-field__error">{fields.currentPassword}</span>
          )}
        </label>
        <StatusLine status={status} />
        <div className="account-form__actions">
          <button
            type="submit"
            className="site-button"
            disabled={busy || !email.trim() || !currentPassword}
          >
            Change email
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(undefined);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(undefined);
    setFields({});
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setStatus({ tone: 'ok', text: 'Password changed. Your other devices have been signed out.' });
    } catch (caught) {
      const error = failure(caught);
      setFields(error?.fields ?? {});
      setStatus({ tone: 'alert', text: error?.message ?? "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Password" description="Changing it signs you out on every other device.">
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <label className="account-field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          {fields.currentPassword && (
            <span className="account-field__error">{fields.currentPassword}</span>
          )}
        </label>
        <label className="account-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <span className={fields.newPassword ? 'account-field__error' : 'account-field__hint'}>
            {fields.newPassword ?? `At least ${PASSWORD_MIN_LENGTH} characters`}
          </span>
        </label>
        <StatusLine status={status} />
        <div className="account-form__actions">
          <button
            type="submit"
            className="site-button"
            disabled={busy || !currentPassword || newPassword.length < PASSWORD_MIN_LENGTH}
          >
            Change password
          </button>
        </div>
      </form>
    </Section>
  );
}

function DevicesSection({
  activeSignIns,
  onChanged,
}: {
  activeSignIns: number;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<Status>(undefined);
  const [busy, setBusy] = useState(false);
  const others = Math.max(0, activeSignIns - 1);
  const signOut = async () => {
    setBusy(true);
    try {
      await signOutOtherDevices();
      setStatus({ tone: 'ok', text: 'Signed out everywhere else.' });
      onChanged();
    } catch (caught) {
      setStatus({ tone: 'alert', text: failure(caught)?.message ?? "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section
      title="Devices"
      description={
        others === 0
          ? 'You’re signed in on this device only.'
          : `You’re signed in on this device and ${others} other${others === 1 ? '' : 's'}.`
      }
    >
      <StatusLine status={status} />
      <div className="account-form__actions account-form__actions--start">
        <button
          type="button"
          className="site-button"
          disabled={busy || others === 0}
          onClick={() => void signOut()}
        >
          Sign out other devices
        </button>
      </div>
    </Section>
  );
}

function DeleteSection({ handle }: { handle: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmHandle, setConfirmHandle] = useState('');
  const [status, setStatus] = useState<Status>(undefined);
  const [busy, setBusy] = useState(false);
  const confirmed = confirmHandle.trim().toLowerCase() === handle.toLowerCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(undefined);
    try {
      await deleteAccount({ password, confirmHandle });
      auth.signedOutLocally();
      void navigate('/', { replace: true });
    } catch (caught) {
      setStatus({ tone: 'alert', text: failure(caught)?.message ?? "Couldn't reach the server." });
      setBusy(false);
    }
  };

  return (
    <Section
      title="Delete account"
      description="Permanently deletes your account, saved sessions and settings. This can’t be undone."
    >
      {open ? (
        <form className="account-form" onSubmit={(event) => void submit(event)}>
          <label className="account-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="account-field">
            <span>Type your handle ({handle}) to confirm</span>
            <input
              autoCapitalize="off"
              required
              value={confirmHandle}
              onChange={(event) => setConfirmHandle(event.target.value)}
            />
          </label>
          <StatusLine status={status} />
          <div className="account-form__actions">
            <button type="button" className="site-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="site-button account-danger"
              disabled={busy || !password || !confirmed}
            >
              Delete my account
            </button>
          </div>
        </form>
      ) : (
        <div className="account-form__actions account-form__actions--start">
          <button
            type="button"
            className="site-button account-danger"
            onClick={() => setOpen(true)}
          >
            Delete account…
          </button>
        </div>
      )}
    </Section>
  );
}
