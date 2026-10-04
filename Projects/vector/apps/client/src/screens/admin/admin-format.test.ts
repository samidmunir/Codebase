import { describe, expect, it } from 'vitest';
import { auditActionLabel, auditDetails, formatAgo } from './admin-format';

const entry = (
  action: Parameters<typeof auditActionLabel>[0],
  details: Record<string, unknown>,
) => ({
  id: '1',
  actor: 'admin@example.com',
  action,
  target: 'pilot@example.com',
  details,
  createdAt: '2026-10-04T12:00:00.000Z',
});

describe('admin wording', () => {
  it('describes what an audit entry changed', () => {
    expect(
      auditDetails(
        entry('user.update', {
          displayName: { from: 'Pilot', to: 'Senior Pilot' },
          role: { from: 'player', to: 'admin' },
          password: 'changed',
          disabled: true,
        }),
      ),
    ).toBe('name Pilot → Senior Pilot · role player → admin · new password · disabled');
    expect(auditDetails(entry('airspace.update', { enabled: false }))).toBe('closed');
    expect(auditDetails(entry('user.sessionDelete', { session: 'Evening push' }))).toBe(
      '“Evening push”',
    );
    expect(auditActionLabel('user.signOut')).toBe('Signed out everywhere');
  });

  it('says how long ago something happened', () => {
    const now = Date.parse('2026-10-04T12:00:00Z');
    expect(formatAgo(null, now)).toBe('Never');
    expect(formatAgo('2026-10-04T11:59:40Z', now)).toBe('Just now');
    expect(formatAgo('2026-10-04T11:15:00Z', now)).toBe('45 min ago');
    expect(formatAgo('2026-10-04T07:00:00Z', now)).toBe('5 h ago');
    expect(formatAgo('2026-10-02T12:00:00Z', now)).toBe('2 days ago');
  });
});
