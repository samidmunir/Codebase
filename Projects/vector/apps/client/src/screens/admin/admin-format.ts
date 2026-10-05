import type { AuditEntry } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';

// Wording for the admin pages.

export { formatAgo, formatDate, formatDateTime } from '../../format/dates';

const ACTIONS: Record<AuditEntry['action'], string> = {
  'user.create': 'Created account',
  'user.update': 'Edited account',
  'user.delete': 'Deleted account',
  'user.signOut': 'Signed out everywhere',
  'user.sessionDelete': 'Deleted a saved session',
  'airspace.update': 'Changed airspace',
  'result.hide': 'Hid a session result',
  'result.show': 'Showed a session result',
  'result.reverify': 'Checked a session result again',
  'news.create': 'Wrote a news post',
  'news.update': 'Edited a news post',
  'news.delete': 'Deleted a news post',
  'admin.grant': 'Made admin',
  'admin.revoke': 'Removed admin',
};

export const auditActionLabel = (action: AuditEntry['action']) => ACTIONS[action];

const describeChange = (key: string, value: unknown): string => {
  if (key === 'password') return 'new password';
  if (key === 'disabled') return value ? 'disabled' : 're-enabled';
  if (key === 'enabled') return value ? 'opened' : 'closed';
  if (key === 'published') return value ? 'published' : 'unpublished';
  if (key === 'emailVerified') return value ? 'email marked verified' : 'email not verified';
  if (key === 'verificationSent') return value ? 'verification link sent' : 'no verification link';
  if (key === 'slug') return `/news/${String(value)}`;
  if (key === 'session') return `“${String(value)}”`;
  if (key === 'result') return `session ${String(value).slice(0, 8)}`;
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
