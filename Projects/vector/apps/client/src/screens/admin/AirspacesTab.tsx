import { useEffect, useState } from 'react';
import type { AdminAirspace } from '@vector/shared';
import { listAdminAirspaces, setAdminAirspace } from '../../api/admin-api';
import { refreshAirspaceStatus } from '../../airspaces/airspace-status';
import { findAirspace } from '../../airspaces/registry';
import { shortAirport } from '../../scope/data-block';
import { errorMessage, formatAgo } from './admin-format';

/** Open or close each airspace. A closed one can't be started, resumed or saved by anyone. */
export function AirspacesTab() {
  const [airspaces, setAirspaces] = useState<AdminAirspace[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    listAdminAirspaces()
      .then((list) => !cancelled && setAirspaces(list))
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (airspace: AdminAirspace) => {
    const closing = airspace.enabled;
    if (
      closing &&
      !window.confirm(
        `Close ${findAirspace(airspace.id)?.name ?? airspace.id}? No one can start, resume or save a session there until it’s opened again.`,
      )
    )
      return;
    setBusy(airspace.id);
    setError(undefined);
    try {
      const updated = await setAdminAirspace(airspace.id, !airspace.enabled);
      setAirspaces((list) => list?.map((a) => (a.id === updated.id ? updated : a)));
      void refreshAirspaceStatus();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  };

  if (!airspaces && !error) return <p className="admin-muted">Loading…</p>;
  return (
    <div className="admin-airspaces">
      <p className="admin-muted">
        A closed airspace shows on the start screen as “Closed”: no one can start a new session
        there, and saved sessions in it can’t be resumed or saved until it’s open again. Players can
        still rename or delete them.
      </p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <ul className="admin-airspace-list">
        {airspaces?.map((airspace) => {
          const entry = findAirspace(airspace.id);
          return (
            <li
              key={airspace.id}
              className="admin-card admin-airspace"
              data-open={airspace.enabled}
            >
              <span className="admin-facility">{entry?.facility ?? airspace.id}</span>
              <div className="admin-airspace__info">
                <strong>{entry?.name ?? airspace.id}</strong>
                <span className="admin-muted">
                  {entry?.airports.map(shortAirport).join(' · ')} · {airspace.savedSessions} saved
                  session{airspace.savedSessions === 1 ? '' : 's'}
                </span>
                <span className="admin-muted">
                  {airspace.updatedBy
                    ? `${airspace.enabled ? 'Opened' : 'Closed'} by ${airspace.updatedBy} ${formatAgo(airspace.updatedAt)}`
                    : 'Open since launch'}
                </span>
              </div>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${entry?.name ?? airspace.id} open to players`}
                  checked={airspace.enabled}
                  disabled={busy === airspace.id}
                  onChange={() => void toggle(airspace)}
                />
                <span className="admin-switch__track" aria-hidden="true" />
                <span className="admin-switch__label">{airspace.enabled ? 'Open' : 'Closed'}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
