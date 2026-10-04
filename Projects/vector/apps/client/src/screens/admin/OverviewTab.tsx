import { useEffect, useState } from 'react';
import type { AdminAirspace, AdminSummary, AuditEntry } from '@vector/shared';
import { getAdminSummary, getAuditLog, listAdminAirspaces } from '../../api/admin-api';
import { findAirspace } from '../../airspaces/registry';
import { auditActionLabel, auditDetails, errorMessage, formatAgo } from './admin-format';

type Data = { summary: AdminSummary; airspaces: AdminAirspace[]; recent: AuditEntry[] };

/** Totals, which airspaces are open, and the latest changes. */
export function OverviewTab({
  onOpen,
}: {
  onOpen: (tab: 'users' | 'airspaces' | 'activity', extra?: Record<string, string>) => void;
}) {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminSummary(), listAdminAirspaces(), getAuditLog()])
      .then(([summary, airspaces, log]) => {
        if (!cancelled) setData({ summary, airspaces, recent: log.slice(0, 6) });
      })
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <p className="admin-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p className="admin-muted">Loading…</p>;
  const { summary, airspaces, recent } = data;
  const tiles = [
    { label: 'Users', value: summary.users },
    { label: 'Admins', value: summary.admins },
    { label: 'Active today', value: summary.activeToday },
    {
      label: 'Disabled',
      value: summary.disabled,
      tone: summary.disabled > 0 ? 'caution' : undefined,
    },
    { label: 'Saved sessions', value: summary.savedSessions },
  ];

  return (
    <div className="admin-overview">
      <dl className="admin-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="admin-tile" data-tone={tile.tone}>
            <dt>{tile.label}</dt>
            <dd>{tile.value.toLocaleString('en-US')}</dd>
          </div>
        ))}
      </dl>

      <section className="admin-card">
        <header className="admin-card__header">
          <h2>Airspaces</h2>
          <button type="button" className="admin-link" onClick={() => onOpen('airspaces')}>
            Manage
          </button>
        </header>
        <ul className="admin-airspace-strip">
          {airspaces.map((airspace) => (
            <li key={airspace.id} data-open={airspace.enabled}>
              <span className="admin-facility">
                {findAirspace(airspace.id)?.facility ?? airspace.id}
              </span>
              {findAirspace(airspace.id)?.name ?? airspace.id}
              <span className="admin-pill" data-tone={airspace.enabled ? 'ok' : 'caution'}>
                {airspace.enabled ? 'Open' : 'Closed'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <header className="admin-card__header">
          <h2>Recent activity</h2>
          <button type="button" className="admin-link" onClick={() => onOpen('activity')}>
            See all
          </button>
        </header>
        {recent.length === 0 ? (
          <p className="admin-muted">No changes yet.</p>
        ) : (
          <ul className="admin-recent">
            {recent.map((entry) => (
              <li key={entry.id}>
                <span className="admin-recent__what">
                  <strong>{auditActionLabel(entry.action)}</strong> {entry.target}
                  {auditDetails(entry) && (
                    <span className="admin-muted"> · {auditDetails(entry)}</span>
                  )}
                </span>
                <span className="admin-muted">
                  {entry.actor} · {formatAgo(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
