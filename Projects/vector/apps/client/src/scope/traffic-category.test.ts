import { describe, expect, it } from 'vitest';
import { trafficCategory } from './traffic-category';

describe('traffic category', () => {
  const airports = new Set(['KJFK', 'KLGA', 'KEWR']);

  it('tells arrivals, departures and overflights apart', () => {
    expect(trafficCategory({ origin: 'KBOS', destination: 'KJFK' }, airports)).toBe('arrival');
    expect(trafficCategory({ origin: 'KEWR', destination: 'KLAX' }, airports)).toBe('departure');
    expect(trafficCategory({ origin: 'KBOS', destination: 'KDCA' }, airports)).toBe('transit');
    // A flight between two of the airspace's airports is an arrival once airborne.
    expect(trafficCategory({ origin: 'KLGA', destination: 'KJFK' }, airports)).toBe('arrival');
  });
});
