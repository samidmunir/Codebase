import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AirspacePack } from '../airspace/airspace-pack';
import { distanceNm } from '../math/geo';
import { isHemisphericLevel } from '../traffic/cruise-levels';
import { windComponents } from '../weather/wind';
import { airlines, allAirspaces, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

// What every airspace must do, whichever it is: the same operations as New York.

function createEngine(pack: AirspacePack, overrides: Partial<SessionSettings> = {}, seed = 3) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
    seed,
    startTimeUtc: '2026-10-03T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'pilots.responseDelaySec': [2, 2],
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      'traffic.transitRatePerHour': 0,
      ...overrides,
    },
    airspace: pack,
    airlines,
  });
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

describe.each(allAirspaces.map((pack) => [pack.airspace.name, pack] as const))(
  '%s airspace',
  (_name, pack) => {
    const facility = pack.airspace.controllers.approach.id;
    const { approachCallsign, departureCallsign } = pack.airspace.controllers.approach;
    const centerCallsign = pack.airspace.controllers.center.callsign;

    it('makes the player its approach facility', () => {
      expect(createEngine(pack).playerId).toBe(facility);
    });

    it('picks runways for each airport that suit its wind', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const engine = createEngine(pack, { 'weather.windMode': 'random' }, seed);
        for (const icao of pack.airspace.airports) {
          const wind = engine.winds[icao]!;
          const { arrivals, departures } = engine.activeRunways[icao]!;
          expect(arrivals.length).toBeGreaterThan(0);
          for (const id of [...arrivals, ...departures]) {
            const { headwindKts } = windComponents(wind, pack.runway(icao, id).magneticHeadingDeg);
            expect(
              headwindKts,
              `${icao} ${id} in ${wind.directionDeg}/${wind.speedKts}`,
            ).toBeGreaterThanOrEqual(-5.01);
          }
        }
      }
    });

    it('lines up departures at each airport, and they take off and check in with the player', () => {
      const engine = createEngine(pack, { 'traffic.departureRatePerHour': 10 });
      const events: SimEvent[] = [];
      engine.subscribe((event) => events.push(event));
      for (const icao of pack.airspace.airports) {
        const entry = engine.departureQueue.find((d) => d.airport === icao)!;
        expect(entry, icao).toBeDefined();
        const runway = engine.activeRunways[icao]!.departures[0]!;
        expect(engine.releaseDeparture(entry.id, runway)).toEqual({ ok: true });
      }
      run(engine, 240);
      const tookOff = events.filter((e) => e.type === 'tookOff');
      expect(new Set(tookOff.map((e) => e.airport))).toEqual(new Set(pack.airspace.airports));
      for (const event of tookOff) {
        const aircraft = engine.getAircraft(event.aircraftId)!;
        expect(aircraft.owner).toBe(facility);
        expect(aircraft.altitudeFt).toBeGreaterThan(2_000);
        expect(
          engine.comms.some(
            (c) => c.aircraftId === aircraft.id && c.text.startsWith(`${departureCallsign},`),
          ),
        ).toBe(true);
      }
    });

    it('sends departures on toward their gate when not vectored (on a SID, or direct)', () => {
      const engine = createEngine(pack, { 'traffic.departureRatePerHour': 10 });
      for (const entry of engine.departureQueue)
        engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
      run(engine, 900);
      const departed = engine
        .listAircraft()
        .filter((a) => pack.airspace.airports.includes(a.flightPlan.origin));
      expect(departed.length).toBeGreaterThan(0);
      for (const aircraft of departed) {
        const gate = aircraft.flightPlan.route.at(-1)!;
        expect(pack.fix(gate), gate).toBeDefined();
        // Still on its SID (whose exit is toward the gate), or direct to the gate or beyond.
        const navigation = aircraft.navigation;
        if (navigation.mode === 'procedure')
          expect(navigation.name, aircraft.callsign).not.toBe('Runway heading');
        else expect(navigation, aircraft.callsign).toMatchObject({ mode: 'direct' });
      }
    });

    it('brings arrivals in on their STARs to every airport, checking in', () => {
      const engine = createEngine(pack, { 'traffic.arrivalRatePerHour': 20 });
      const entered: string[] = [];
      const entryNm: number[] = [];
      engine.subscribe((event) => {
        if (event.type !== 'arrivalEntered') return;
        entered.push(event.aircraftId);
        const arrival = engine.getAircraft(event.aircraftId)!;
        expect(arrival.owner).toBe(facility);
        entryNm.push(distanceNm(pack.airspace.center, arrival.position));
      });
      run(engine, 2_400);
      expect(entered.length).toBeGreaterThan(10);
      // At the boundary, far out.
      for (const distance of entryNm) {
        expect(distance).toBeLessThan(pack.boundaryRadiusNm);
        expect(distance).toBeGreaterThan(pack.boundaryRadiusNm - 15);
      }
      const arrivals = entered.map((id) => engine.getAircraft(id)).filter((a) => a !== undefined);
      expect(new Set(arrivals.map((a) => a.flightPlan.destination))).toEqual(
        new Set(pack.airspace.airports),
      );
      expect(arrivals.some((a) => a.navigation.mode === 'procedure')).toBe(true);
      const checkIns = engine.comms.filter(
        (c) => c.text.startsWith(`${centerCallsign},`) || c.text.startsWith(`${approachCallsign},`),
      );
      expect(checkIns.length).toBe(entered.length);
    });

    it('sends overflights across at their filed level, direct to an exit fix', () => {
      const engine = createEngine(pack, { 'traffic.transitRatePerHour': 12 });
      const entered: Extract<SimEvent, { type: 'transitEntered' }>[] = [];
      const headings = new Map<string, number>();
      engine.subscribe((event) => {
        if (event.type !== 'transitEntered') return;
        entered.push(event);
        headings.set(event.aircraftId, engine.getAircraft(event.aircraftId)!.headingDeg);
      });
      run(engine, 1_800);
      expect(entered.length).toBeGreaterThan(2);
      for (const event of entered) {
        const transit = engine.getAircraft(event.aircraftId);
        if (!transit) continue;
        expect(transit.owner).toBe(facility);
        expect(transit.flightPlan.route).toEqual([event.exitFix]);
        expect(isHemisphericLevel(transit.altitudeFt, headings.get(transit.id)!)).toBe(true);
        expect(pack.airspace.airports).not.toContain(transit.flightPlan.destination);
      }
    });

    it('publishes holds at its arrival fixes', () => {
      const starFixes = new Set(
        pack.arrivals.flatMap((star) =>
          [...star.enrouteTransitions, ...star.commonRoutes, ...star.runwayTransitions].flatMap(
            (segment) => segment.legs.map((leg) => leg.fix),
          ),
        ),
      );
      const held = pack.holds.filter((hold) => starFixes.has(hold.fix));
      expect(held.length).toBeGreaterThan(5);
    });
  },
);
