import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ADMIN_USERS_PAGE_SIZE, type AdminResult, type Verification } from '@vector/shared';
import { listAdminResults, reverifyAdminResult, setAdminResultHidden } from '../../api/admin-api';
import { airspaceLabel, formatHours, VERIFICATION } from '../pilots/pilot-format';
import { formatRp } from '../scope/score-format';
import { errorMessage, formatDateTime } from './admin-format';

type Filters = { verification: '' | Verification; hidden: '' | 'true' | 'false'; handle: string };

/** Every session result: what verification made of it, and hiding it from records. */
export function ResultsTab() {
  const [filters, setFilters] = useState<Filters>({ verification: '', hidden: '', handle: '' });
  const [query, setQuery] = useState(filters);
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState<{ results: AdminResult[]; total: number } | undefined>();
  const [error, setError] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    listAdminResults({
      ...(query.verification ? { verification: query.verification } : {}),
      ...(query.hidden ? { hidden: query.hidden } : {}),
      ...(query.handle.trim() ? { handle: query.handle.trim().replace(/^@/, '') } : {}),
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

  const act = async (id: string, action: () => Promise<void>) => {
    setBusy(id);
    try {
      await action();
      setReload((n) => n + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  };

  const lastShown = Math.min(offset + ADMIN_USERS_PAGE_SIZE, list?.total ?? 0);
  return (
    <div className="admin-users__list">
      <p className="admin-muted">
        The server replays each session a few minutes after it ends and compares the result. Only
        verified sessions count on the records. Hiding a session takes it off the records and the
        pilot’s profile.
      </p>
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar__search"
          placeholder="Pilot’s handle"
          aria-label="Pilot’s handle"
          value={filters.handle}
          onChange={(event) => setFilters({ ...filters, handle: event.target.value })}
        />
        <select
          className="admin-input"
          aria-label="Verification"
          value={filters.verification}
          onChange={(event) =>
            setFilters({ ...filters, verification: event.target.value as Filters['verification'] })
          }
        >
          <option value="">Any verification</option>
          {(Object.keys(VERIFICATION) as Verification[]).map((value) => (
            <option key={value} value={value}>
              {VERIFICATION[value].label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          aria-label="Visibility"
          value={filters.hidden}
          onChange={(event) =>
            setFilters({ ...filters, hidden: event.target.value as Filters['hidden'] })
          }
        >
          <option value="">Shown or hidden</option>
          <option value="false">Shown</option>
          <option value="true">Hidden</option>
        </select>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!list ? (
        <p className="admin-muted">Loading…</p>
      ) : list.results.length === 0 ? (
        <p className="admin-muted">No sessions match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pilot</th>
                <th>Session</th>
                <th className="num">RP</th>
                <th>Verification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.results.map((result) => {
                const verification = VERIFICATION[result.verification];
                return (
                  <tr key={result.id} data-disabled={result.hidden ? 'true' : undefined}>
                    <td>@{result.handle}</td>
                    <td>
                      <div>{airspaceLabel(result.airspaceId)}</div>
                      <div className="admin-muted">
                        {formatDateTime(result.playedAt)} · {formatHours(result.simTimeSec)}
                      </div>
                    </td>
                    <td className="num">{formatRp(result.rp)}</td>
                    <td>
                      <span
                        className="admin-pill"
                        data-tone={
                          verification.tone === 'ok'
                            ? 'ok'
                            : verification.tone === 'alert'
                              ? 'alert'
                              : undefined
                        }
                        title={verification.title}
                      >
                        {verification.label}
                      </span>
                      {result.hidden && (
                        <span className="admin-pill" data-tone="caution">
                          Hidden
                        </span>
                      )}
                      {result.verificationNote && (
                        <div className="admin-muted">{result.verificationNote}</div>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {!result.hidden && (
                          <Link className="admin-link" to={`/results/${result.id}`}>
                            View
                          </Link>
                        )}
                        <button
                          type="button"
                          className="admin-link"
                          disabled={busy === result.id}
                          onClick={() =>
                            void act(result.id, () =>
                              setAdminResultHidden(result.id, !result.hidden),
                            )
                          }
                        >
                          {result.hidden ? 'Show' : 'Hide'}
                        </button>
                        {result.verification !== 'pending' && (
                          <button
                            type="button"
                            className="admin-link"
                            disabled={busy === result.id}
                            onClick={() =>
                              void act(result.id, () => reverifyAdminResult(result.id))
                            }
                          >
                            Check again
                          </button>
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
    </div>
  );
}
