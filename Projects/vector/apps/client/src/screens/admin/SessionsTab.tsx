import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AdminSavedSessionList } from '@vector/shared';
import { deleteAdminUserSession, listAdminSavedSessions } from '../../api/admin-api';
import { AIRSPACES, findAirspace } from '../../airspaces/registry';
import { formatSimDuration } from '../saved-session-format';
import { formatRp } from '../scope/score-format';
import { errorMessage, formatAgo } from './admin-format';

const PAGE = 50;

/** "48 KB" */
function size(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Every player's saved sessions: find them, see what they take up, and delete them. */
export function SessionsTab() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [airspace, setAirspace] = useState('');
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<AdminSavedSessionList | undefined>(undefined);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    listAdminSavedSessions({
      ...(search ? { q: search } : {}),
      ...(airspace ? { airspace } : {}),
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
  }, [search, airspace, offset, reload]);

  return (
    <section className="admin-users__list" aria-label="Saved sessions">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar__search"
          placeholder="Session name, or the owner’s handle or email"
          aria-label="Search saved sessions"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOffset(0);
          }}
        />
        <select
          className="admin-input"
          aria-label="Airspace"
          value={airspace}
          onChange={(event) => {
            setAirspace(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">Any airspace</option>
          {AIRSPACES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {list && (
          <span className="admin-muted">
            {list.total.toLocaleString('en-US')} session{list.total === 1 ? '' : 's'} ·{' '}
            {size(list.totalBytes)}
          </span>
        )}
      </div>
      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.sessions.length === 0 ? (
        <p className="admin-muted">No saved sessions match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Owner</th>
                <th className="num">RP</th>
                <th className="num">Sim time</th>
                <th className="num" title="Space it takes in the database (compressed)">
                  Stored
                </th>
                <th>Saved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <strong>{session.name}</strong>
                    <div className="admin-muted">
                      {findAirspace(session.airspaceId)?.name ?? session.airspaceId}
                    </div>
                  </td>
                  <td>
                    <Link to={`/admin/users/${session.owner.id}`}>@{session.owner.handle}</Link>
                    <div className="admin-muted">{session.owner.email}</div>
                  </td>
                  <td className="num">{formatRp(session.rp)}</td>
                  <td className="num">{formatSimDuration(session.simTimeSec)}</td>
                  <td className="num">{size(session.bytes)}</td>
                  <td className="nowrap">{formatAgo(session.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-link admin-link--danger"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete @${session.owner.handle}’s “${session.name}”? This can’t be undone.`,
                          )
                        )
                          return;
                        deleteAdminUserSession(session.owner.id, session.id)
                          .then(() => {
                            setNotice({ tone: 'ok', text: `Deleted “${session.name}”.` });
                            setReload((n) => n + 1);
                          })
                          .catch((caught: unknown) =>
                            setNotice({ tone: 'alert', text: errorMessage(caught) }),
                          );
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list && list.total > PAGE && (
        <div className="admin-pager">
          <span className="admin-muted">
            {offset + 1}–{Math.min(offset + PAGE, list.total)} of {list.total}
          </span>
          <button
            type="button"
            className="admin-button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Previous
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={offset + PAGE >= list.total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
