import { describe, expect, it } from 'vitest';
import { emptyScoreState, recordScore, scoreStats } from './score';

const event = (tick: number, rp: number, callsigns: string[], kind = 'landing' as const) => ({
  tick,
  kind,
  rp,
  callsigns,
  detail: `event at ${tick}`,
});

describe('score history', () => {
  it('records the RP total after each change, and RP per flight with its kind', () => {
    const score = emptyScoreState();
    const kinds: Record<string, 'arrival' | 'departure'> = { DAL1: 'arrival', UAL2: 'departure' };
    recordScore(score, event(60, 100, ['DAL1']), (c) => kinds[c]);
    recordScore(score, event(120, 40, ['UAL2']), (c) => kinds[c]);
    recordScore(
      score,
      { ...event(180, -150, ['DAL1', 'UAL2']), kind: 'separationLoss' },
      (c) => kinds[c],
    );
    expect(score.rpHistory).toEqual([
      [60, 100],
      [120, 140],
      [180, -10],
    ]);
    expect(score.flights.DAL1).toEqual({
      kind: 'arrival',
      rp: -50,
      events: 2,
      lastDetail: 'event at 180',
      worstRp: -150,
      worstDetail: 'event at 180',
    });
    expect(score.flights.UAL2).toMatchObject({ kind: 'departure', rp: -110, events: 2 });
  });

  it('thins out a long history but keeps the latest total', () => {
    const score = emptyScoreState();
    for (let i = 1; i <= 2_000; i++) recordScore(score, event(i, 1, ['DAL1']));
    expect(score.rpHistory.length).toBeLessThanOrEqual(720);
    expect(score.rpHistory.at(-1)).toEqual([2_000, 2_000]);
    expect(score.rpHistory[0]).toEqual([1, 1]);
  });

  it('sums the session’s flights and losses', () => {
    const score = emptyScoreState();
    recordScore(score, event(1, 100, ['A']));
    recordScore(score, event(2, 100, ['B']));
    recordScore(score, { ...event(3, -150, ['A', 'B']), kind: 'separationLoss' });
    score.timing.arrival = { count: 2, onTime: 1, totalSec: 100, totalTargetSec: 120 };
    expect(scoreStats(score)).toEqual({
      arrivals: 2,
      departures: 0,
      overflights: 0,
      onTime: 1,
      timed: 2,
      separationLosses: 1,
      wakeLosses: 0,
      nearMidAirs: 0,
      goArounds: 0,
    });
  });
});
