import { useEffect, useState } from 'react';
import type { AuditEntry } from '@vector/shared';
import { getAuditLog } from '../../api/admin-api';
import { auditActionLabel, auditDetails, errorMessage, formatDateTime } from './admin-format';

/** The audit log: every administrative change, newest first. */
export function ActivityTab() {
  const [entries, setEntries] = useState<AuditEntry[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getAuditLog()
      .then((log) => !cancelled && setEntries(log))
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
  if (!entries) return <p className="admin-muted">Loading…</p>;
  if (entries.length === 0) return <p className="admin-muted">No changes yet.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What</th>
            <th>To</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="nowrap">{formatDateTime(entry.createdAt)}</td>
              <td>{entry.actor}</td>
              <td>{auditActionLabel(entry.action)}</td>
              <td>{entry.target}</td>
              <td className="admin-muted">{auditDetails(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
