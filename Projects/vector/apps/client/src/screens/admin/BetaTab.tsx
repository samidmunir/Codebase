import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import {
  FEEDBACK_STATUSES,
  type FeedbackList,
  type InviteCode,
  type Waitlist,
} from '@vector/shared';
import {
  createInvite,
  getFeedback,
  getInvites,
  getWaitlist,
  inviteFromWaitlist,
  removeFromWaitlist,
  revokeInvite,
  setFeedbackStatus,
} from '../../api/beta-api';
import { errorMessage, formatAgo, formatDate, formatDateTime } from './admin-format';

const SECTIONS = [
  { id: 'invites', label: 'Invite codes' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'feedback', label: 'Feedback' },
] as const;
type Section = (typeof SECTIONS)[number]['id'];

/** The beta: invite codes, the waitlist, and what testers send in. */
export function BetaTab() {
  const [params, setParams] = useSearchParams();
  const current: Section = SECTIONS.some((s) => s.id === params.get('section'))
    ? (params.get('section') as Section)
    : 'invites';
  const open = (id: Section) => {
    const next = new URLSearchParams(params);
    if (id === 'invites') next.delete('section');
    else next.set('section', id);
    setParams(next);
  };

  return (
    <div className="admin-community">
      <nav className="admin-segmented admin-community__sections" aria-label="Beta">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={current === section.id ? 'page' : undefined}
            onClick={() => open(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
      {current === 'invites' ? (
        <InvitesPanel />
      ) : current === 'waitlist' ? (
        <WaitlistPanel />
      ) : (
        <FeedbackPanel />
      )}
    </div>
  );
}

/** Where a code stands now. */
function inviteState(code: InviteCode): { label: string; tone?: 'ok' | 'caution' | 'alert' } {
  if (code.revokedAt) return { label: 'Withdrawn', tone: 'alert' };
  if (code.expiresAt && Date.parse(code.expiresAt) <= Date.now())
    return { label: 'Expired', tone: 'caution' };
  if (code.uses >= code.maxUses) return { label: 'Used up' };
  return { label: 'Working', tone: 'ok' };
}

const inviteLink = (code: string) =>
  `${window.location.origin}/register?invite=${encodeURIComponent(code)}`;

function InvitesPanel() {
  const [codes, setCodes] = useState<InviteCode[]>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ note: '', maxUses: '1', expiresInDays: '30', code: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInvites()
      .then((list) => !cancelled && setCodes(list.codes))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const copy = (code: string) => {
    navigator.clipboard
      .writeText(inviteLink(code))
      .then(() => setNotice(`Copied the link for ${code}.`))
      .catch(() => setNotice(`The link: ${inviteLink(code)}`));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const created = await createInvite({
        note: form.note,
        maxUses: Number(form.maxUses) || 1,
        ...(form.expiresInDays ? { expiresInDays: Number(form.expiresInDays) } : {}),
        ...(form.code.trim() ? { code: form.code } : {}),
      });
      setForm((current) => ({ ...current, note: '', code: '' }));
      setNotice(`Made ${created.code}. Copy its link from the list to send it.`);
      setReload((n) => n + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-users__list">
      <form
        className="admin-card admin-form"
        aria-label="New invite code"
        onSubmit={(event) => void submit(event)}
      >
        <h2>New invite code</h2>
        <p className="admin-muted">
          Registration has to be Invite only (Site tab) for codes to matter. Send the link: it fills
          the code in.
        </p>
        <div className="admin-form__grid">
          <label>
            Note (who it’s for)
            <input
              className="admin-input"
              maxLength={200}
              placeholder="Discord testers"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </label>
          <label>
            Uses
            <input
              className="admin-input"
              type="number"
              min={1}
              max={10000}
              value={form.maxUses}
              onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
            />
          </label>
          <label>
            Expires after (days; empty: never)
            <input
              className="admin-input"
              type="number"
              min={1}
              max={365}
              value={form.expiresInDays}
              onChange={(event) => setForm({ ...form, expiresInDays: event.target.value })}
            />
          </label>
          <label>
            Code (empty: made up)
            <input
              className="admin-input admin-code"
              maxLength={40}
              placeholder="VECTOR-DISCORD"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit" className="admin-button admin-button--primary" disabled={busy}>
            Make code
          </button>
        </div>
      </form>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!codes ? (
        <p className="admin-muted">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="admin-muted">No invite codes yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Used</th>
                <th>Expires</th>
                <th>Made</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const state = inviteState(code);
                return (
                  <tr key={code.id}>
                    <td>
                      <div className="admin-user-link__name admin-code">{code.code}</div>
                      {code.note && <div className="admin-muted">{code.note}</div>}
                    </td>
                    <td>
                      <span className="admin-pill" data-tone={state.tone}>
                        {state.label}
                      </span>
                    </td>
                    <td>
                      <div className="nowrap">
                        {code.uses} of {code.maxUses}
                      </div>
                      {code.usedBy.length > 0 && (
                        <div className="admin-muted">
                          {code.usedBy
                            .slice(0, 3)
                            .map((user) => `@${user.handle}`)
                            .join(', ')}
                          {code.usedBy.length > 3 && ` +${code.usedBy.length - 3}`}
                        </div>
                      )}
                    </td>
                    <td className="nowrap">
                      {code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                    </td>
                    <td className="nowrap">
                      {formatAgo(code.createdAt)}
                      {code.createdBy && <div className="admin-muted">{code.createdBy}</div>}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {state.tone === 'ok' && (
                          <>
                            <button
                              type="button"
                              className="admin-link"
                              onClick={() => copy(code.code)}
                            >
                              Copy link
                            </button>
                            <button
                              type="button"
                              className="admin-link admin-link--danger"
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Withdraw ${code.code}? Nobody else can use it; accounts made with it stay.`,
                                  )
                                )
                                  return;
                                revokeInvite(code.id)
                                  .then(() => setReload((n) => n + 1))
                                  .catch((caught: unknown) => setError(errorMessage(caught)));
                              }}
                            >
                              Withdraw
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WaitlistPanel() {
  const [list, setList] = useState<Waitlist>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    getWaitlist()
      .then((next) => !cancelled && setList(next))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const act = (id: string, work: () => Promise<string>) => {
    setBusy(id);
    setError(undefined);
    work()
      .then((done) => {
        setNotice(done);
        setReload((n) => n + 1);
      })
      .catch((caught: unknown) => setError(errorMessage(caught)))
      .finally(() => setBusy(undefined));
  };

  return (
    <div className="admin-users__list">
      <p className="admin-muted">
        People asking for an invite. Invite sends them their own single-use code by email (it works
        for 30 days).
      </p>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.entries.length === 0 ? (
        <p className="admin-muted">Nobody’s on the waitlist yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="admin-muted admin-table__caption">
              {list.total} on the list · {list.entries.filter((e) => !e.invitedAt).length} waiting
            </caption>
            <thead>
              <tr>
                <th>Email</th>
                <th>Why</th>
                <th>Asked</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.email}</td>
                  <td className="admin-beta__note">{entry.note || '—'}</td>
                  <td className="nowrap">{formatAgo(entry.createdAt)}</td>
                  <td>
                    {entry.joined ? (
                      <span className="admin-pill" data-tone="ok">
                        Joined
                      </span>
                    ) : entry.invitedAt ? (
                      <span className="admin-pill">Invited {formatAgo(entry.invitedAt)}</span>
                    ) : (
                      <span className="admin-pill" data-tone="caution">
                        Waiting
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {!entry.joined && (
                        <button
                          type="button"
                          className="admin-link"
                          disabled={busy === entry.id}
                          onClick={() =>
                            act(entry.id, async () => {
                              const invite = await inviteFromWaitlist(entry.id);
                              return `Emailed ${entry.email} the code ${invite.code}.`;
                            })
                          }
                        >
                          {entry.invitedAt ? 'Invite again' : 'Invite'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-link admin-link--danger"
                        disabled={busy === entry.id}
                        onClick={() => {
                          if (!window.confirm(`Remove ${entry.email} from the waitlist?`)) return;
                          act(entry.id, async () => {
                            await removeFromWaitlist(entry.id);
                            return `Removed ${entry.email}.`;
                          });
                        }}
                      >
                        Remove
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

const KIND_LABEL = { bug: 'Bug', idea: 'Idea', other: 'Other' } as const;
const STATUS_LABEL = { new: 'New', read: 'Read', done: 'Done' } as const;

function FeedbackPanel() {
  const [status, setStatus] = useState<(typeof FEEDBACK_STATUSES)[number]>('new');
  const [list, setList] = useState<FeedbackList>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getFeedback(status)
      .then((next) => !cancelled && setList(next))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, [status, reload]);

  const mark = (id: string, next: (typeof FEEDBACK_STATUSES)[number]) =>
    setFeedbackStatus(id, next)
      .then(() => setReload((n) => n + 1))
      .catch((caught: unknown) => setError(errorMessage(caught)));

  return (
    <div className="admin-users__list">
      <div
        className="admin-segmented admin-community__sections"
        role="radiogroup"
        aria-label="Show"
      >
        {FEEDBACK_STATUSES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={status === option}
            onClick={() => setStatus(option)}
          >
            {STATUS_LABEL[option]}
            {list ? ` (${list.counts[option] ?? 0})` : ''}
          </button>
        ))}
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.items.length === 0 ? (
        <p className="admin-muted">
          {status === 'new'
            ? 'Nothing new. Pilots send feedback from their account menu.'
            : 'None.'}
        </p>
      ) : (
        <ul className="admin-beta__feedback">
          {list.items.map((item) => (
            <li key={item.id} className="admin-card admin-beta__item">
              <header className="admin-beta__item-head">
                <span
                  className="admin-pill"
                  data-tone={
                    item.kind === 'bug' ? 'alert' : item.kind === 'idea' ? 'ok' : undefined
                  }
                >
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="admin-muted">
                  {item.from ? `@${item.from.handle} (${item.from.email})` : 'A deleted account'} ·{' '}
                  {formatDateTime(item.createdAt)}
                </span>
              </header>
              <p className="admin-beta__message">{item.message}</p>
              <footer className="admin-beta__item-foot">
                <span className="admin-muted">
                  {[item.page || '/', item.device].filter(Boolean).join(' · ')}
                </span>
                <div className="admin-actions">
                  {FEEDBACK_STATUSES.filter((next) => next !== item.status).map((next) => (
                    <button
                      key={next}
                      type="button"
                      className="admin-link"
                      onClick={() => void mark(item.id, next)}
                    >
                      {next === 'new' ? 'Mark new' : next === 'read' ? 'Mark read' : 'Done'}
                    </button>
                  ))}
                </div>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
