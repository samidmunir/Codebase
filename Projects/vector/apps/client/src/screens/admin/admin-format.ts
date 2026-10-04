import type { AuditEntry } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';

// Wording for the admin pages.

/** '3 Oct 2026, 14:05' in the viewer's time zone, or '–'. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** '3 Oct 2026'. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** 'just now', '5 min ago', '3 h ago', '2 days ago', or the date. */
export function formatAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Never';
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

const ACTIONS: Record<AuditEntry['action'], string> = {
  'user.create': 'Created account',
  'user.update': 'Edited account',
  'user.delete': 'Deleted account',
  'user.signOut': 'Signed out everywhere',
  'user.sessionDelete': 'Deleted a saved session',
  'airspace.update': 'Changed airspace',
  'admin.grant': 'Made admin',
  'admin.revoke': 'Removed admin',
};

export const auditActionLabel = (action: AuditEntry['action']) => ACTIONS[action];

const describeChange = (key: string, value: unknown): string => {
  if (key === 'password') return 'new password';
  if (key === 'disabled') return value ? 'disabled' : 're-enabled';
  if (key === 'enabled') return value ? 'opened' : 'closed';
  if (key === 'session') return `“${String(value)}”`;
  if (key === 'signIns') return `${String(value)} sign-in${value === 1 ? '' : 's'} ended`;
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const change = value as { from: unknown; to: unknown };
    const label = key === 'displayName' ? 'name' : key;
    return `${label} ${String(change.from)} → ${String(change.to)}`;
  }
  if (key === 'role') return `role ${String(value)}`;
  if (key === 'displayName') return `name ${String(value)}`;
  return `${key} ${String(value)}`;
};

/** A one-line summary of what an audit entry changed. */
export function auditDetails(entry: AuditEntry): string {
  return Object.entries(entry.details)
    .map(([key, value]) => describeChange(key, value))
    .join(' · ');
}

/** The message to show for a failed request. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : "Couldn't reach the server. Try again.";
}
