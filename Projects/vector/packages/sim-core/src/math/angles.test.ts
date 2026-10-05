import { describe, expect, it } from 'vitest';
import { headingDifference, normalizeHeading, turnDelta } from './angles';

describe('normalizeHeading', () => {
  it.each([
    [0, 0],
    [360, 0],
    [370, 10],
    [-10, 350],
    [-360, 0],
    [725, 5],
  ])('%d -> %d', (input, expected) => {
    expect(normalizeHeading(input)).toBe(expected);
  });
});

describe('headingDifference', () => {
  it('takes the shortest way across north', () => {
    expect(headingDifference(350, 10)).toBe(20);
    expect(headingDifference(10, 350)).toBe(-20);
  });

  it('treats an exact reversal as a right turn of 180', () => {
    expect(headingDifference(90, 270)).toBe(180);
  });
});

describe('turnDelta', () => {
  it('turns the long way when told to', () => {
    expect(turnDelta(10, 350, 'right')).toBe(340);
    expect(turnDelta(350, 10, 'left')).toBe(-340);
  });

  it('is zero when already on heading, whatever the direction', () => {
    expect(turnDelta(90, 90, 'left')).toBe(0);
    expect(turnDelta(90, 90, 'right')).toBe(0);
  });
});
