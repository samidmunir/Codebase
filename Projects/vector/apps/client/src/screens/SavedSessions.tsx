import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  SESSION_NAME_MAX_LENGTH,
  type SavedSessionSummary,
  addSessionStats,
  emptySessionStats,
  type SessionStats,
} from '@vector/shared';
import { findAirspace } from '../airspaces/registry';
import { ApiRequestError } from '../api/api-client';
import { deleteSavedSession, listSavedSessions, renameSavedSession } from '../api/sessions-api';
import { DIFFICULTY_LABELS } from '../settings/difficulty';
import { formatSimDuration, formatSavedAt } from './saved-session-format';
import { formatRp } from './scope/score-format';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      sessions: SavedSessionSummary[];
      limit: number;
      careerRp: number;
      careerStats: SessionStats;
    };

const errorMessage = (error: unknown) =>
  error instanceof ApiRequestError ? error.message : "Couldn't reach the server.";

/** The player's saved sessions, newest first, with resume, rename and delete. */
export function SavedSessions() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [renaming, setRenaming] = useState<{ id: string; name: string } | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | undefined>(undefined);
  const [actionError, setActionError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    listSavedSessions()
      .then(
        ({ sessions, limit, careerRp, careerStats }) =>
          !cancelled && setState({ kind: 'ready', sessions, limit, careerRp, careerStats }),
      )
      .catch(
        (error: unknown) => !cancelled && setState({ kind: 'error', message: errorMessage(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') return null;
  if (state.kind === 'error') {
    return (
      <p className="saved-sessions__empty" role="alert">
        Saved sessions are unavailable: {state.message}
      </p>
    );
  }
  if (state.sessions.length === 0) return null;

  const replace = (updated: SavedSessionSummary) =>
    setState({
      ...state,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    });

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    try {
      replace(await renameSavedSession(renaming.id, renaming.name));
      setRenaming(undefined);
      setActionError(undefined);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSavedSession(id);
      const sessions = state.sessions.filter((s) => s.id !== id);
      setState({
        ...state,
        sessions,
        careerRp: sessions.reduce((sum, s) => sum + s.rp, 0),
        careerStats: sessions.reduce(
          (total, s) => (s.stats ? addSessionStats(total, s.stats) : total),
          emptySessionStats(),
        ),
      });
      setConfirmDelete(undefined);
      setActionError(undefined);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <section className="saved-sessions" aria-labelledby="saved-sessions-title">
      <div className="saved-sessions__header">
        <h2 id="saved-sessions-title">Saved sessions</h2>
        <span>
          <strong className="saved-sessions__career">{formatRp(state.careerRp)}</strong> career ·{' '}
          {state.sessions.length} of {state.limit}
        </span>
      </div>
      <AirspaceTotals sessions={state.sessions} />
      <CareerStats stats={state.careerStats} />
      {actionError && (
        <p className="saved-sessions__error" role="alert">
          {actionError}
        </p>
      )}
      <ul className="saved-sessions__list">
        {state.sessions.map((saved) => {
          const airspace = findAirspace(saved.airspaceId);
          const details = [
            airspace?.facility ?? saved.airspaceId,
            saved.difficulty === 'custom'
              ? 'Custom'
              : saved.difficulty
                ? DIFFICULTY_LABELS[saved.difficulty]
                : undefined,
            formatRp(saved.rp),
            formatSimDuration(saved.simTimeSec),
            `${saved.aircraftCount} aircraft`,
          ].filter(Boolean);
          return (
            <li key={saved.id} className="saved-session">
              {renaming?.id === saved.id ? (
                <form className="saved-session__rename" onSubmit={(e) => void submitRename(e)}>
                  <input
                    aria-label="Session name"
                    value={renaming.name}
                    maxLength={SESSION_NAME_MAX_LENGTH}
                    autoFocus
                    onChange={(event) => setRenaming({ id: saved.id, name: event.target.value })}
                    onKeyDown={(event) => event.key === 'Escape' && setRenaming(undefined)}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setRenaming(undefined)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="saved-session__info">
                  <span className="saved-session__name">{saved.name}</span>
                  <span className="saved-session__details">
                    {details.join(' · ')} · saved {formatSavedAt(saved.updatedAt)}
                  </span>
                </div>
              )}
              {confirmDelete === saved.id ? (
                <div className="saved-session__actions">
                  <span className="saved-session__confirm">Delete?</span>
                  <button
                    type="button"
                    className="saved-session__danger"
                    onClick={() => void remove(saved.id)}
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(undefined)}>
                    Keep
                  </button>
                </div>
              ) : (
                renaming?.id !== saved.id && (
                  <div className="saved-session__actions">
                    {airspace?.available && (
                      <Link
                        className="saved-session__resume"
                        to={`/scope/${saved.airspaceId}?session=${saved.id}`}
                      >
                        Resume
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setRenaming({ id: saved.id, name: saved.name })}
                    >
                      Rename
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(saved.id)}>
                      Delete
                    </button>
                  </div>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** RP by airspace, once sessions in more than one are saved. */
function AirspaceTotals({ sessions }: { sessions: readonly { airspaceId: string; rp: number }[] }) {
  const totals = new Map<string, number>();
  for (const saved of sessions)
    totals.set(saved.airspaceId, (totals.get(saved.airspaceId) ?? 0) + saved.rp);
  if (totals.size < 2) return null;
  return (
    <p className="saved-sessions__airspaces" aria-label="RP by airspace">
      {[...totals]
        .map(([id, rp]) => `${findAirspace(id)?.facility ?? id} ${formatRp(rp)}`)
        .join(' · ')}
    </p>
  );
}

/** Flight and safety numbers across the saved sessions. */
function CareerStats({ stats }: { stats: SessionStats }) {
  const flights = stats.arrivals + stats.departures + stats.overflights;
  if (flights === 0) return null;
  const losses = stats.separationLosses + stats.nearMidAirs;
  const items: { label: string; value: string; tone?: 'minus' }[] = [
    { label: 'Landed', value: stats.arrivals.toLocaleString('en-US') },
    { label: 'Handed off', value: (stats.departures + stats.overflights).toLocaleString('en-US') },
    {
      label: 'On time',
      value: stats.timed > 0 ? `${Math.round((stats.onTime / stats.timed) * 100)}%` : '–',
    },
    {
      label: 'Losses of separation',
      value: losses.toLocaleString('en-US'),
      ...(losses > 0 ? { tone: 'minus' as const } : {}),
    },
    {
      label: 'Wake spacing lost',
      value: stats.wakeLosses.toLocaleString('en-US'),
      ...(stats.wakeLosses > 0 ? { tone: 'minus' as const } : {}),
    },
    { label: 'Go-arounds', value: stats.goArounds.toLocaleString('en-US') },
  ];
  return (
    <dl className="career-stats" aria-label="Career">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd data-sign={item.tone}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
