import { describe, expect, it } from 'vitest';
import { emptyScoreState, recordScore, separationPenalty } from './score';

describe('scoring', () => {
  it('never penalizes separation of 5 NM or more, and scales closer losses up to double', () => {
    expect(separationPenalty(5, 150, 5)).toBe(0);
    expect(separationPenalty(6.2, 150, 5)).toBe(0);
    expect(separationPenalty(4.9, 150, 5)).toBe(153);
    expect(separationPenalty(2.5, 150, 5)).toBe(225);
    expect(separationPenalty(0, 150, 5)).toBe(300);
  });

  it('keeps a running total and a tally per kind', () => {
    const state = emptyScoreState();
    recordScore(state, { tick: 1, kind: 'landing', rp: 100, callsigns: ['DAL1'], detail: '' });
    recordScore(state, { tick: 2, kind: 'landing', rp: 100, callsigns: ['DAL2'], detail: '' });
    const loss = recordScore(state, {
      tick: 3,
      kind: 'separationLoss',
      rp: -180,
      callsigns: ['A', 'B'],
      detail: '',
    });
    expect(loss.id).toBe('S3');
    expect(state.total).toBe(20);
    expect(state.tally).toEqual({
      landing: { count: 2, rp: 200 },
      separationLoss: { count: 1, rp: -180 },
    });
  });
});
