import { describe, expect, it } from 'vitest';
import { periodFor } from './stats-repository';

const now = new Date('2026-10-07T15:30:00Z'); // A Wednesday.

describe('periodFor', () => {
  it('counts days, ending with today', () => {
    const period = periodFor('7d', now, undefined);
    expect(period.bucket).toBe('day');
    expect(period.starts).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
    expect(period.from.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    // The period before is just as long, ending where this one starts.
    expect(period.previous?.to.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(now.getTime() - period.from.getTime()).toBe(
      period.previous!.to.getTime() - period.previous!.from.getTime(),
    );
  });

  it('counts weeks from Monday for a year', () => {
    const period = periodFor('1y', now, undefined);
    expect(period.bucket).toBe('week');
    expect(period.starts).toHaveLength(52);
    expect(period.starts.at(-1)).toBe('2026-10-05');
  });

  it('runs all time from the first account, with nothing to compare against', () => {
    const recent = periodFor('all', now, new Date('2026-09-20T10:00:00Z'));
    expect(recent.bucket).toBe('day');
    expect(recent.starts[0]).toBe('2026-09-20');
    expect(recent.previous).toBeUndefined();
    const long = periodFor('all', now, new Date('2025-01-01T00:00:00Z'));
    expect(long.bucket).toBe('week');
  });
});
