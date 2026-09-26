import { describe, expect, it } from 'vitest';
import {
  dataBlockLines,
  formatAltitude,
  formatGroundSpeed,
  formatGroundSpeedKnots,
  trendIndicator,
} from './data-block';

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

  const target = {
    callsign: 'JBU1024',
    aircraftType: 'A320',
    destination: 'KJFK',
    altitudeFt: 5_000,
    groundSpeedKts: 212,
    verticalSpeedFpm: -1_500,
  };

  it('shows full ground speed in knots', () => {
    expect(formatGroundSpeedKnots(212)).toBe('212');
    expect(formatGroundSpeedKnots(95)).toBe('095');
  });

  it('time-shares line 2 in the STARS style', () => {
    expect(dataBlockLines(target, 0, 'stars')).toEqual(['JBU1024', '050↓21']);
    expect(dataBlockLines(target, 1, 'stars')).toEqual(['JBU1024', 'A320 JFK']);
  });

  it('shows altitude, full speed, type and destination together in the expanded style', () => {
    const expected = ['JBU1024', '050↓ 212', 'A320 JFK'];
    expect(dataBlockLines(target, 0, 'expanded')).toEqual(expected);
    expect(dataBlockLines(target, 1, 'expanded')).toEqual(expected);
  });
});
