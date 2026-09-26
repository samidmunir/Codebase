import { describe, expect, it } from 'vitest';
import { dataBlockLines, formatAltitude, formatGroundSpeed, trendIndicator } from './data-block';

describe('data block', () => {
  it('shows altitude in hundreds of feet', () => {
    expect(formatAltitude(5_000)).toBe('050');
    expect(formatAltitude(12_450)).toBe('125');
    expect(formatAltitude(300)).toBe('003');
  });

  it('shows ground speed in tens of knots', () => {
    expect(formatGroundSpeed(214)).toBe('21');
    expect(formatGroundSpeed(95)).toBe('10');
    expect(formatGroundSpeed(1_200)).toBe('99');
  });

  it('shows climb and descent trends, ignoring small changes', () => {
    expect(trendIndicator(1_800)).toBe('↑');
    expect(trendIndicator(-2_000)).toBe('↓');
    expect(trendIndicator(150)).toBe(' ');
  });

  it('time-shares line 2', () => {
    const target = {
      callsign: 'JBU1024',
      aircraftType: 'A320',
      destination: 'KJFK',
      altitudeFt: 5_000,
      groundSpeedKts: 212,
      verticalSpeedFpm: -1_500,
    };
    expect(dataBlockLines(target, 0)).toEqual(['JBU1024', '050↓21']);
    expect(dataBlockLines(target, 1)).toEqual(['JBU1024', 'A320 JFK']);
  });
});
