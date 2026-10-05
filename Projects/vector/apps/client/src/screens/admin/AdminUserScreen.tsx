import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import type { AdminUpdateUserRequest, AdminUserDetail } from '@vector/shared';
import {
  deleteAdminUser,
  deleteAdminUserSession,
  endAdminSignIn,
  getAdminUser,
  sendAdminPasswordReset,
  sendAdminVerification,
  setAdminResultHidden,
  signOutAdminUser,
  updateAdminUser,
} from '../../api/admin-api';
import { threadPath } from '../../api/community-api';
import { findAirspace } from '../../airspaces/registry';
import { useAuth } from '../../auth/auth-store';
import { difficultyLabel, formatHours, initials, VERIFICATION } from '../pilots/pilot-format';
import { formatSimDuration } from '../saved-session-format';
import { formatRp } from '../scope/score-format';
import { usePageMeta } from '../../site/page-meta';
import {
  ROLE_LABELS,
  auditActionLabel,
  auditDetails,
  errorMessage,
  formatAgo,
  formatDate,
  formatDateTime,
} from './admin-format';
import { DeleteAccount, DetailsForm, PasswordForm } from './user-forms';
import './admin-screen.css';

type Notice = { tone: 'ok' | 'alert'; text: string };

function Card({
  title,
  aside,
  wide,
  children,
}: {
  title: string;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="admin-card admin-user__card"
      data-wide={wide || undefined}
      aria-label={title}
    >
      <header className="admin-card__header">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Everything about one account, and everything an admin can do to it. */
export function AdminUserScreen() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminUserDetail | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [suspendFor, setSuspendFor] = useState('7');
  usePageMeta({ title: detail ? `${detail.user.displayName} · Admin` : 'User · Admin' });

  const load = useCallback(
    () =>
      getAdminUser(id)
        .then((loaded) => {
          setDetail(loaded);
          setLoadError(undefined);
        })
        .catch((caught: unknown) => setLoadError(errorMessage(caught))),
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);

  /** Runs an action, then reloads the page's data. */
  const act = async (action: () => Promise<unknown>, done: string): Promise<boolean> => {
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      setNotice({ tone: 'ok', text: done });
      await load();
      return true;
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (auth.status !== 'signedIn') return null;
  if (auth.user.role !== 'admin') return <Navigate to="/admin" replace />;

  if (loadError && !detail)
    return (
      <div className="site-page admin-user">
        <p className="admin-crumbs">
          <Link to="/admin?tab=users">Users</Link>
        </p>
        <p className="admin-error" role="alert">
          {loadError}
        </p>
      </div>
    );
  if (!detail)
    return (
      <div className="site-page admin-user">
        <p className="admin-muted">Loading…</p>
      </div>
    );

  const { user, sessions, signIns, results, posts, history } = detail;
  const isSelf = user.id === auth.user.id;
  const disabled = Boolean(user.disabledAt);
  const update = (changes: AdminUpdateUserRequest, done: string) =>
    act(() => updateAdminUser(user.id, changes), done);

  return (
    <div className="site-page admin-user">
      <p className="admin-crumbs">
        <Link to="/admin?tab=users">Users</Link> › {user.displayName}
      </p>

      <header className="admin-user__header">
        <span className="admin-user__avatar" aria-hidden="true">
          {initials(user.displayName)}
        </span>
        <div>
          <h1>
            {user.displayName}
            {isSelf && <span className="admin-muted"> (you)</span>}
          </h1>
          <p className="admin-muted">
            <Link to={`/pilots/${user.handle}`}>@{user.handle}</Link> · {user.email} · joined{' '}
            {formatDate(user.createdAt)} · last active {formatAgo(user.lastActiveAt)}
          </p>
          <p className="admin-user__pills">
            <span className="admin-pill" data-tone={user.role === 'player' ? undefined : 'ok'}>
              {ROLE_LABELS[user.role]}
            </span>
            <span className="admin-pill" data-tone={user.emailVerified ? 'ok' : undefined}>
              {user.emailVerified ? 'Email verified' : 'Email not verified'}
            </span>
            {disabled && (
              <span className="admin-pill" data-tone="alert">
                Disabled {formatAgo(user.disabledAt)}
              </span>
            )}
            {user.postingSuspendedUntil && (
              <span className="admin-pill" data-tone="caution">
                {user.postingSuspendedUntil === 'forever'
                  ? 'Suspended from posting for good'
                  : `Suspended from posting until ${formatDate(user.postingSuspendedUntil)}`}
              </span>
            )}
          </p>
        </div>
        <dl className="admin-user__numbers">
          <div>
            <dt>Career RP</dt>
            <dd>{formatRp(user.careerRp)}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>{results.total}</dd>
          </div>
          <div>
            <dt>Posts</dt>
            <dd>{posts.total}</dd>
          </div>
          <div>
            <dt>Signed in on</dt>
            <dd>{signIns.length}</dd>
          </div>
        </dl>
      </header>

      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}

      <div className="admin-user__grid">
        <Card title="Details">
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
          {user.pendingEmail && (
            <p className="admin-muted">
              They’ve asked to change their email to <strong>{user.pendingEmail}</strong>; it
              changes when they open the link sent there.
            </p>
          )}
          <PasswordForm
            busy={busy}
            onSave={(password) =>
              update({ password }, 'Password changed. They’ve been signed out everywhere.')
            }
          />
        </Card>

        <Card title="Email and privacy">
          <div className="admin-actions">
            {!user.emailVerified && (
              <button
                type="button"
                className="admin-button"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => sendAdminVerification(user.id),
                    `Verification link sent to ${user.email}.`,
                  )
                }
              >
                Send a verification link
              </button>
            )}
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() =>
                void update(
                  { emailVerified: !user.emailVerified },
                  user.emailVerified ? 'Email marked not verified.' : 'Email marked verified.',
                )
              }
            >
              {user.emailVerified ? 'Mark email not verified' : 'Mark email verified'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy || disabled}
              title={disabled ? 'Re-enable the account first' : undefined}
              onClick={() =>
                window.confirm(`Email ${user.email} a link to choose a new password?`) &&
                void act(() => sendAdminPasswordReset(user.id), `Reset link sent to ${user.email}.`)
              }
            >
              Send a password reset
            </button>
          </div>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={user.profilePublic}
              disabled={busy}
              onChange={() =>
                void update(
                  { profilePublic: !user.profilePublic },
                  user.profilePublic ? 'Profile made private.' : 'Profile made public.',
                )
              }
            />
            Public profile (others can see their career and sessions)
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={user.showOnRecords}
              disabled={busy}
              onChange={() =>
                void update(
                  { showOnRecords: !user.showOnRecords },
                  user.showOnRecords ? 'Taken off the records.' : 'Back on the records.',
                )
              }
            />
            On the records (their verified sessions count on the leaderboards)
          </label>
          <p className="admin-muted">
            {user.handleChangeableAt
              ? `They can next change their handle on ${formatDate(user.handleChangeableAt)}.`
              : 'They can change their handle now.'}{' '}
            {user.handleChangeableAt && (
              <button
                type="button"
                className="admin-link"
                disabled={busy}
                onClick={() =>
                  void update({ liftHandleLimit: true }, 'They can change their handle now.')
                }
              >
                Let them change it now
              </button>
            )}
          </p>
        </Card>

        <Card
          title={`Sign-ins (${signIns.length})`}
          aside={
            <button
              type="button"
              className="admin-link"
              disabled={busy || signIns.length === 0}
              onClick={() =>
                void act(() => signOutAdminUser(user.id), 'Signed out on every device.')
              }
            >
              Sign out everywhere
            </button>
          }
        >
          {signIns.length === 0 ? (
            <p className="admin-muted">Not signed in anywhere.</p>
          ) : (
            <ul className="admin-signins">
              {signIns.map((signIn) => (
                <li key={signIn.id}>
                  <span>
                    <strong>{signIn.device}</strong>
                    <span className="admin-muted">
                      {' '}
                      · {signIn.ip ?? 'no IP'} · signed in {formatDate(signIn.signedInAt)} · active{' '}
                      {formatAgo(signIn.lastUsedAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="admin-link admin-link--danger"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => endAdminSignIn(user.id, signIn.id),
                        `Ended the sign-in on ${signIn.device}.`,
                      )
                    }
                  >
                    End
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Access">
          <div className="admin-actions">
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
                  window.confirm(
                    `Disable ${user.email}? They’ll be signed out and can’t sign in.`,
                  ) && void update({ disabled: true }, 'Disabled and signed out everywhere.')
                }
              >
                Disable account
              </button>
            )}
          </div>
          <h3 className="admin-user__subhead">Community posting</h3>
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
                  { postingSuspension: suspendFor === 'forever' ? 'forever' : Number(suspendFor) },
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
        </Card>

        <Card
          title={`Career (${results.total} session${results.total === 1 ? '' : 's'})`}
          wide
          aside={
            <Link className="admin-link" to={`/pilots/${user.handle}`}>
              Profile
            </Link>
          }
        >
          {results.recent.length === 0 ? (
            <p className="admin-muted">No sessions played.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Played</th>
                    <th>Airspace</th>
                    <th>Difficulty</th>
                    <th className="num">RP</th>
                    <th className="num">Sim time</th>
                    <th>Verification</th>
                    <th>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {results.recent.map((result) => (
                    <tr key={result.id} data-disabled={result.hidden || undefined}>
                      <td className="nowrap">
                        <Link to={`/results/${result.id}`}>{formatDateTime(result.playedAt)}</Link>
                      </td>
                      <td>{findAirspace(result.airspaceId)?.name ?? result.airspaceId}</td>
                      <td>{difficultyLabel(result.difficulty) || '–'}</td>
                      <td className="num">{formatRp(result.rp)}</td>
                      <td className="num">{formatHours(result.simTimeSec)}</td>
                      <td>
                        <span
                          className="admin-pill"
                          data-tone={VERIFICATION[result.verification].tone}
                          title={VERIFICATION[result.verification].title}
                        >
                          {VERIFICATION[result.verification].label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-link"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              () => setAdminResultHidden(result.id, !result.hidden),
                              result.hidden ? 'Result shown again.' : 'Result hidden.',
                            )
                          }
                        >
                          {result.hidden ? 'Show' : 'Hide'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={`Community (${posts.total} post${posts.total === 1 ? '' : 's'})`}>
          {posts.recent.length === 0 ? (
            <p className="admin-muted">No posts.</p>
          ) : (
            <ul className="admin-posts">
              {posts.recent.map((post) => (
                <li key={post.id}>
                  <Link to={`${threadPath({ id: post.threadId, slug: '' })}#post-${post.id}`}>
                    {post.threadTitle}
                  </Link>
                  {post.hidden && <span className="admin-pill"> Hidden</span>}
                  <span className="admin-muted"> · {formatAgo(post.createdAt)}</span>
                  <p>{post.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Saved sessions (${sessions.length})`}>
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
        </Card>

        <Card title="History" wide>
          {history.length === 0 ? (
            <p className="admin-muted">No admin changes to this account.</p>
          ) : (
            <ul className="admin-recent">
              {history.map((entry) => (
                <li key={entry.id}>
                  <span className="admin-recent__what">
                    <strong>{auditActionLabel(entry.action)}</strong>
                    {auditDetails(entry) && (
                      <span className="admin-muted"> · {auditDetails(entry)}</span>
                    )}
                  </span>
                  <span className="admin-muted">
                    {entry.actor} · {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!isSelf && (
        <DeleteAccount
          email={user.email}
          busy={busy}
          onDelete={async () => {
            setBusy(true);
            try {
              await deleteAdminUser(user.id);
              void navigate('/admin?tab=users', { replace: true });
            } catch (caught) {
              setNotice({ tone: 'alert', text: errorMessage(caught) });
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
