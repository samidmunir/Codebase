import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { distanceNm } from '../math/geo';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

/** Every flight generated over a few busy hours: type, origin and destination. */
function generatedFlights() {
  const flights: { type: string; from: string; to: string; callsign: string }[] = [];
  for (const seed of [1, 2, 3]) {
    const engine = SimEngine.create({
      performance,
      world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
      seed,
      startTimeUtc: '2026-09-30T14:00:00Z',
      settings: {
        ...defaultSettings('session'),
        'weather.windMode': 'random',
        'traffic.arrivalRatePerHour': 20,
        'traffic.departureRatePerHour': 20,
        'traffic.transitRatePerHour': 15,
        'traffic.maxDepartureQueue': 20,
      },
      airspace: newYork,
      airlines,
    });
    const seen = new Set<string>();
    for (let t = 0; t < 3 * 3_600; t++) {
      engine.step();
      if (t % 30) continue;
      for (const entry of engine.departureQueue) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        flights.push({
          type: entry.aircraftType,
          from: entry.airport,
          to: entry.destination,
          callsign: entry.callsign,
        });
      }
      for (const a of engine.listAircraft()) {
        if (seen.has(a.id) || a.phase === 'departure') continue;
        seen.add(a.id);
        flights.push({
          type: a.aircraftType,
          from: a.flightPlan.origin,
          to: a.flightPlan.destination,
          callsign: a.callsign,
        });
      }
    }
  }
  return flights;
}

const position = (icao: string) =>
  newYork.traffic.cityPositions[icao] ??
  (newYork.airspace.airports.includes(icao) ? newYork.airport(icao).position : undefined);

describe('fleet range', () => {
  const flights = generatedFlights();

  it('never gives a type a trip longer than its range', () => {
    expect(flights.length).toBeGreaterThan(500);
    for (const flight of flights) {
      const from = position(flight.from);
      const to = position(flight.to);
      if (!from || !to) continue;
      const trip = distanceNm(from, to);
      expect(
        trip,
        `${flight.callsign} ${flight.type} ${flight.from}-${flight.to}`,
      ).toBeLessThanOrEqual(performance.get(flight.type).rangeNm);
    }
  });

  it('keeps regional jets off transatlantic routes, which wide-bodies and the A321LR still fly', () => {
    const europe = flights.filter(
      (f) => /^E/.test(f.to) || /^E/.test(f.from) || /^LF/.test(f.to) || /^LF/.test(f.from),
    );
    expect(europe.length).toBeGreaterThan(5);
    for (const flight of europe)
      expect(['CRJ9', 'E175', 'A320', 'A321', 'B738', 'B739']).not.toContain(flight.type);
    expect(new Set(europe.map((f) => f.type)).size).toBeGreaterThan(1);
  });
});
