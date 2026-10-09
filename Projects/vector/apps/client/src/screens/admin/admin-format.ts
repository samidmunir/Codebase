import { SESSION_SETTINGS, type AuditEntry, type UserRole } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';

// Wording for the admin pages.

export { formatAgo, formatDate, formatDateTime } from '../../format/dates';

const ACTIONS: Record<AuditEntry['action'], string> = {
  'user.create': 'Created account',
  'user.update': 'Edited account',
  'user.delete': 'Deleted account',
  'user.signOut': 'Signed out everywhere',
  'user.endSignIn': 'Ended a sign-in',
  'user.sendReset': 'Sent a password reset',
  'user.sendVerification': 'Sent a verification link',
  'user.export': 'Exported users',
  'user.sessionDelete': 'Deleted a saved session',
  'site.update': 'Changed a site switch',
  'scoring.update': 'Changed the official scoring',
  'rules.update': 'Changed the session rules',
  'release.create': 'Added a version to the roadmap',
  'release.update': 'Edited a version on the roadmap',
  'release.delete': 'Deleted a version from the roadmap',
  'invite.create': 'Made an invite code',
  'invite.revoke': 'Withdrew an invite code',
  'waitlist.invite': 'Invited from the waitlist',
  'waitlist.delete': 'Removed from the waitlist',
  'airspace.update': 'Changed airspace',
  'result.hide': 'Hid a session result',
  'result.show': 'Showed a session result',
  'result.reverify': 'Checked a session result again',
  'news.create': 'Wrote a news post',
  'news.update': 'Edited a news post',
  'news.delete': 'Deleted a news post',
  'forum.createCategory': 'Created a category',
  'forum.updateCategory': 'Changed a category',
  'forum.deleteCategory': 'Deleted a category',
  'forum.editPost': 'Edited a community post',
  'forum.hidePost': 'Hid a community post',
  'forum.showPost': 'Showed a community post again',
  'forum.deletePost': 'Deleted a community post',
  'forum.updateThread': 'Moderated a thread',
  'forum.deleteThread': 'Deleted a thread',
  'forum.dismissReport': 'Dismissed a report',
  'admin.grant': 'Made admin',
  'admin.revoke': 'Removed admin',
};

export const auditActionLabel = (action: AuditEntry['action']) => ACTIONS[action];

const REGISTRATION_WORDS: Record<string, string> = {
  open: 'registration open',
  invite: 'registration invite only',
  closed: 'registration closed',
};

const describeChange = (key: string, value: unknown, entry: AuditEntry): string => {
  const { action } = entry;
  if (key === 'password') return 'new password';
  if (key === 'disabled') return value ? 'disabled' : 're-enabled';
  if (key === 'enabled' && action === 'site.update' && entry.target === 'beta')
    return value ? 'beta on' : 'beta off';
  if (key === 'enabled' && action === 'site.update')
    return value ? 'banner shown' : 'banner hidden';
  if (key === 'mode') return REGISTRATION_WORDS[String(value)] ?? `mode ${String(value)}`;
  if (key === 'note') return `“${String(value)}”`;
  if (key === 'uses') return `${String(value)} use${value === 1 ? '' : 's'}`;
  if (key === 'used') return `used ${String(value)} time${value === 1 ? '' : 's'}`;
  if (key === 'expiresInDays') return `expires in ${String(value)} day${value === 1 ? '' : 's'}`;
  if (key === 'code') return `code ${String(value)}`;
  if (key === 'enabled') return value ? 'opened' : 'closed';
  if (key === 'published') return value ? 'published' : 'unpublished';
  if (key === 'pinned') return value ? 'pinned' : 'unpinned';
  if (key === 'device') return String(value);
  if (key === 'open') return value ? 'registration open' : 'registration closed';
  if (key === 'readOnly') return value ? 'community read-only' : 'community open';
  if (key === 'tone') return `${String(value)} tone`;
  if (key === 'message') return value ? `“${String(value)}”` : 'no message';
  if (key === 'before') return 'previous text kept';
  if (key === 'threadsMoved') return `${String(value)} thread${value === 1 ? '' : 's'} moved`;
  if (key === 'to') return `to ${String(value)}`;
  if (key === 'moved') return `moved ${String(value)}`;
  if (key === 'adminOnly') return value ? 'admins start threads' : 'anyone starts threads';
  if (key === 'id') return String(value);
  if (key === 'ip') return String(value);
  if (key === 'profilePublic') return value ? 'profile public' : 'profile private';
  if (key === 'showOnRecords') return value ? 'on the records' : 'off the records';
  if (key === 'handleLimit') return 'handle limit lifted';
  if (key === 'search') return `matching “${String(value)}”`;
  if (key === 'status') return `${String(value)} only`;
  if (key === 'locked') return value ? 'locked' : 'unlocked';
  if (key === 'post') return `post ${String(value)}`;
  if (key === 'thread') return `thread ${String(value)}`;
  if (key === 'author') return `by @${String(value)}`;
  if (key === 'reports') return `${String(value)} report${value === 1 ? '' : 's'}`;
  if (key === 'replies') return `${String(value)} repl${value === 1 ? 'y' : 'ies'}`;
  if (key === 'postingSuspension')
    return value === 'lift'
      ? 'posting suspension lifted'
      : value === 'forever'
        ? 'suspended from posting for good'
        : `suspended from posting for ${String(value)}`;
  if (key === 'emailVerified') return value ? 'email marked verified' : 'email not verified';
  if (key === 'verificationSent') return value ? 'verification link sent' : 'no verification link';
  if (key === 'slug') return `/news/${String(value)}`;
  if (key === 'session') return `“${String(value)}”`;
  if (key === 'result') return `session ${String(value).slice(0, 8)}`;
  if (key === 'features') return `${String(value)} feature${value === 1 ? '' : 's'}`;
  if (key === 'threadsDeleted') return `${String(value)} thread${value === 1 ? '' : 's'} deleted`;
  if (key === 'postsDeleted') return `${String(value)} post${value === 1 ? '' : 's'} deleted`;
  if (key === 'signIns') return `${String(value)} sign-in${value === 1 ? '' : 's'} ended`;
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const change = value as { from: unknown; to: unknown };
    const setting = (SESSION_SETTINGS as Record<string, { label: string } | undefined>)[key];
    const label = key === 'displayName' ? 'name' : (setting?.label ?? key);
    return `${label} ${String(change.from)} → ${String(change.to)}`;
  }
  if (key === 'role') return `role ${String(value)}`;
  if (key === 'displayName') return `name ${String(value)}`;
  return `${key} ${String(value)}`;
};

/** A one-line summary of what an audit entry changed. */
export function auditDetails(entry: AuditEntry): string {
  return Object.entries(entry.details)
    .map(([key, value]) => describeChange(key, value, entry))
    .join(' · ');
}

/** The message to show for a failed request. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : "Couldn't reach the server. Try again.";
}

/** What each role is called. */
export const ROLE_LABELS: Record<UserRole, string> = {
  player: 'Player',
  moderator: 'Moderator',
  admin: 'Admin',
};
