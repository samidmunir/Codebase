import { applyDifficulty, defaultScoring, defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { rankSession } from './ranking';
import type { ScoringVersion } from './scoring-repository';

const DAY = 24 * 3_600_000;
const now = new Date('2026-11-01T12:00:00Z');
const replay = (settings: object) => ({ start: { settings }, inputs: [] });
const normal = applyDifficulty(defaultSettings('session'), 'normal');

describe('ranking a session', () => {
  it('keeps a replaced scoring version counting for a week, then not', () => {
    const versions = (replacedDaysAgo: number): ScoringVersion[] => [
      {
        id: 0,
        values: defaultScoring(),
        from: new Date(0),
        until: new Date(now.getTime() - replacedDaysAgo * DAY),
        createdBy: null,
      },
      {
        id: 1,
        values: { ...defaultScoring(), 'scoring.landingRp': 150 },
        from: new Date(now.getTime() - replacedDaysAgo * DAY),
        until: null,
        createdBy: 'chief@example.com',
      },
    ];
    expect(rankSession(replay(normal), versions(3), now).ranked).toBe(true);
    expect(rankSession(replay(normal), versions(8), now)).toMatchObject({
      ranked: false,
      unrankedReason: 'Played with unofficial scoring',
    });
  });

  it('can’t rank a session from before replays', () => {
    expect(rankSession(null, [], now)).toMatchObject({ ranked: false, difficulty: null });
  });
});
