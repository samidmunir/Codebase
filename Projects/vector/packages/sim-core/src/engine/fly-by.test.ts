import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { airlines, allAirspaces, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

/** STAR fixes where aircraft used to loop (sharp turns between close fixes), in each airspace. */
const SHARP_TURN_FIXES: Record<string, string[]> = {
  'new-york': ['BASYE', 'PROUD', 'CRANK'],
  chicago: [],
  dallas: [],
};

describe.each(allAirspaces.map((pack) => [pack.airspace.name, pack] as const))(
  'flying procedures in %s',
  (_name, pack) => {
    it('turns early at fly-by fixes, so no aircraft overshoots one and loops back to it', () => {
      const looped = new Set<string>();
      const passed = new Map<string, number>();
      for (const seed of [1, 2]) {
        const engine = SimEngine.create({
          performance,
          world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
          seed,
          startTimeUtc: '2026-09-30T14:00:00Z',
          settings: {
            ...defaultSettings('session'),
            'weather.windMode': 'random',
            'traffic.arrivalRatePerHour': 15,
            'traffic.departureRatePerHour': 15,
            'traffic.transitRatePerHour': 0,
          },
          airspace: pack,
          airlines,
        });
        engine.subscribe((event) => {
          if (event.type === 'fixPassed') passed.set(event.fix, (passed.get(event.fix) ?? 0) + 1);
        });
        for (let t = 0; t < 5_400; t++) {
          for (const entry of engine.departureQueue)
            if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick)
              engine.releaseDeparture(
                entry.id,
                engine.activeRunways[entry.airport]!.departures[0]!,
              );
          engine.step();
          for (const aircraft of engine.listAircraft()) {
            const navigation = aircraft.navigation;
            if (navigation.mode === 'procedure' && navigation.extending)
              looped.add(`${seed} ${aircraft.callsign} ${navigation.name}`);
          }
        }
      }
      expect([...looped]).toEqual([]);
      expect(passed.size).toBeGreaterThan(20);
      for (const fix of SHARP_TURN_FIXES[pack.airspace.id]!)
        expect(passed.get(fix) ?? 0, fix).toBeGreaterThan(0);
    });
  },
);
