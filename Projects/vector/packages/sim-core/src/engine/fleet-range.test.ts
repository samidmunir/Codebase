import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { distanceNm } from '../math/geo';
import { servesDestination } from '../traffic/operations';
import type { AirspacePack } from '../airspace/airspace-pack';
import { airlines, allAirspaces, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

/** Every flight generated over a few busy hours: type, origin and destination. */
function generatedFlights(pack: AirspacePack) {
  const flights: { type: string; from: string; to: string; callsign: string }[] = [];
  for (const seed of [1, 2, 3]) {
    const engine = SimEngine.create({
      performance,
      world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
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
      airspace: pack,
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

/** Carriers that fly only to their hubs, which should still show up in each airspace. */
const HUB_CARRIERS: Record<string, string[]> = {
  'new-york': ['BAW', 'UAE', 'FDX', 'SWA'],
  chicago: ['BAW', 'DLH', 'FDX', 'SWA'],
};

describe.each(allAirspaces.map((pack) => [pack.airspace.name, pack] as const))(
  'fleet range in %s',
  (_name, pack) => {
    const flights = generatedFlights(pack);
    const position = (icao: string) =>
      pack.traffic.cityPositions[icao] ??
      (pack.airspace.airports.includes(icao) ? pack.airport(icao).position : undefined);

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
        expect([
          'CRJ9',
          'E175',
          'BCS1',
          'BCS3',
          'A320',
          'A20N',
          'A321',
          'B738',
          'B38M',
          'B739',
          'B39M',
        ]).not.toContain(flight.type);
      expect(new Set(europe.map((f) => f.type)).size).toBeGreaterThan(1);
    });

    it('flies each airline only where it serves, in a type it flies there', () => {
      const airports = pack.traffic.airports;
      const fliesTo = (airport: string, airline: string, type: string, city: string) => {
        const entry = airports[airport]!.airlines.find((a) => a.icao === airline);
        const destination = airports[airport]!.destinations.find((d) => d.icao === city);
        return (
          entry !== undefined &&
          entry.types.includes(type) &&
          destination !== undefined &&
          servesDestination(entry, destination)
        );
      };
      const seen = new Set<string>();
      for (const flight of flights) {
        const airline = flight.callsign.slice(0, 3);
        seen.add(airline);
        const label = `${flight.callsign} ${flight.type} ${flight.from}-${flight.to}`;
        if (airports[flight.from])
          expect(fliesTo(flight.from, airline, flight.type, flight.to), label).toBe(true);
        else if (airports[flight.to])
          expect(fliesTo(flight.to, airline, flight.type, flight.from), label).toBe(true);
        else {
          // An overflight: cities only some airlines serve are flown by those airlines.
          for (const city of [flight.from, flight.to]) {
            const entries = Object.values(airports)
              .flatMap((t) => t.destinations)
              .filter((d) => d.icao === city);
            if (entries.every((d) => d.airlines))
              expect(
                entries.flatMap((d) => d.airlines!),
                label,
              ).toContain(airline);
          }
        }
      }
      // The carriers that only fly to their hubs still show up.
      for (const airline of HUB_CARRIERS[pack.airspace.id]!) expect(seen).toContain(airline);
      expect(
        flights.filter((f) => f.type === 'A388').every((f) => f.callsign.startsWith('UAE')),
      ).toBe(true);
    });
  },
);
