import { describe, expect, it } from 'vitest';
import { formatSavedAt, formatSimDuration } from './saved-session-format';

describe('saved session formatting', () => {
  it('formats simulated time', () => {
    expect(formatSimDuration(300)).toBe('5m');
    expect(formatSimDuration(4_320)).toBe('1h 12m');
    expect(formatSimDuration(7_260)).toBe('2h 01m');
  });

  it('formats when a session was saved', () => {
    const now = new Date('2026-09-26T15:00:00Z');
    expect(formatSavedAt('2026-09-26T14:59:40Z', now)).toBe('just now');
    expect(formatSavedAt('2026-09-26T14:35:00Z', now)).toBe('25 min ago');
    expect(formatSavedAt('2026-09-26T10:00:00Z', now)).toBe('5 h ago');
    expect(formatSavedAt('2026-09-25T10:00:00Z', now)).toBe('yesterday');
  });
});
