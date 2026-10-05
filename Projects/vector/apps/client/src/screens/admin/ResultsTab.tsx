import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ADMIN_USERS_PAGE_SIZE,
  DIFFICULTY_LEVELS,
  type AdminResult,
  type SessionDifficulty,
  type Verification,
} from '@vector/shared';
import {
  bulkHideAdminResults,
  listAdminResults,
  reverifyAdminResult,
  setAdminResultHidden,
  updateAdminUser,
} from '../../api/admin-api';
import { AIRSPACES } from '../../airspaces/registry';
import { airspaceLabel, difficultyLabel, formatHours, VERIFICATION } from '../pilots/pilot-format';
import { formatRp } from '../scope/score-format';
import { errorMessage, formatDateTime } from './admin-format';

type Filters = {
  verification: '' | Verification;
  hidden: '' | 'true' | 'false';
  handle: string;
  airspace: string;
  difficulty: '' | SessionDifficulty;
  sort: 'recent' | 'rp';
};

const NO_FILTERS: Filters = {
  verification: '',
  hidden: '',
  handle: '',
  airspace: '',
  difficulty: '',
  sort: 'recent',
};

/** Every session result: what verification made of it, and hiding it from records. */
export function ResultsTab() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
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
      ...(query.airspace ? { airspace: query.airspace } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      sort: query.sort,
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

  const act = async (id: string, action: () => Promise<unknown>) => {
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
        pilot’s profile; taking a pilot off the records hides all of theirs from the leaderboards.
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
        <select
          className="admin-input"
          aria-label="Airspace"
          value={filters.airspace}
          onChange={(event) => setFilters({ ...filters, airspace: event.target.value })}
        >
          <option value="">Any airspace</option>
          {AIRSPACES.map((airspace) => (
            <option key={airspace.id} value={airspace.id}>
              {airspace.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          aria-label="Difficulty"
          value={filters.difficulty}
          onChange={(event) =>
            setFilters({ ...filters, difficulty: event.target.value as Filters['difficulty'] })
          }
        >
          <option value="">Any difficulty</option>
          {[...DIFFICULTY_LEVELS, 'custom' as const].map((level) => (
            <option key={level} value={level}>
              {difficultyLabel(level)}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          aria-label="Order"
          value={filters.sort}
          onChange={(event) =>
            setFilters({ ...filters, sort: event.target.value as Filters['sort'] })
          }
        >
          <option value="recent">Newest first</option>
          <option value="rp">Highest RP first</option>
        </select>
      </div>
      {selected.size > 0 && (
        <div className="admin-bulk" role="toolbar" aria-label="Selected sessions">
          <strong>{selected.size} selected</strong>
          {[true, false].map((hide) => (
            <button
              key={String(hide)}
              type="button"
              className="admin-button"
              disabled={busy !== undefined}
              onClick={() =>
                void act('bulk', async () => {
                  await bulkHideAdminResults([...selected], hide);
                  setSelected(new Set());
                })
              }
            >
              {hide ? 'Hide from records' : 'Show again'}
            </button>
          ))}
          <button type="button" className="admin-link" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}
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
                <th className="admin-table__check">
                  <input
                    type="checkbox"
                    aria-label="Select every session shown"
                    checked={list.results.every((result) => selected.has(result.id))}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? new Set([...selected, ...list.results.map((result) => result.id)])
                          : new Set(),
                      )
                    }
                  />
                </th>
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
                    <td className="admin-table__check">
                      <input
                        type="checkbox"
                        aria-label={`Select @${result.handle}’s session`}
                        checked={selected.has(result.id)}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(result.id)) next.delete(result.id);
                            else next.add(result.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td>
                      <Link to={`/admin/users/${result.userId}`}>@{result.handle}</Link>
                      {!result.onRecords && (
                        <div>
                          <span className="admin-pill" data-tone="caution">
                            Off the records
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="admin-link"
                        disabled={busy === result.id}
                        onClick={() =>
                          void act(result.id, async () => {
                            await updateAdminUser(result.userId, {
                              showOnRecords: !result.onRecords,
                            });
                          })
                        }
                      >
                        {result.onRecords ? 'Take pilot off the records' : 'Put pilot back on'}
                      </button>
                    </td>
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
