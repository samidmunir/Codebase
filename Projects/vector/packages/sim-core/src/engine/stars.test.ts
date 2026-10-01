import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { descendViaBottomFt, restrictionsAhead } from '../aircraft/navigation';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

/** STARs whose FAA coded data publishes altitude restrictions. */
const RESTRICTED = new Set(['PROUD2', 'APPLE3', 'PHLBO4', 'BRAND1', 'PAWLN1']);

/** Runs a session until an arrival enters on a STAR with published altitudes. */
function arrivalDescendingVia() {
  for (let seed = 1; seed <= 30; seed++) {
    const engine = SimEngine.create({
      performance,
      world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
      seed,
      startTimeUtc: '2026-09-28T14:00:00Z',
      settings: {
        ...defaultSettings('session'),
        'weather.windMode': 'random',
        'traffic.arrivalRatePerHour': 20,
        'traffic.departureRatePerHour': 0,
        'traffic.transitRatePerHour': 0,
        'pilots.responseDelaySec': [1, 1],
      },
      airspace: newYork,
      airlines,
    });
    let found: string | undefined;
    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'arrivalEntered' && RESTRICTED.has(event.star) && !found) {
        const aircraft = engine.getAircraft(event.aircraftId)!;
        if (restrictionsAhead(aircraft).length > 0) found = event.aircraftId;
      }
    });
    for (let t = 0; t < 3_600 && !found; t++) engine.step();
    unsubscribe();
    if (found) return { engine, id: found };
  }
  throw new Error('No arrival on a STAR with published altitudes');
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

describe('arrivals on STARs', () => {
  it('enter descending via the STAR, and say so on check-in', () => {
    const { engine, id } = arrivalDescendingVia();
    const aircraft = engine.getAircraft(id)!;
    expect(aircraft.navigation).toMatchObject({ mode: 'procedure', descendVia: true });
    expect(aircraft.targets.altitudeFt).toBe(descendViaBottomFt(aircraft));
    const checkIn = engine.comms.filter((c) => c.aircraftId === id).at(-1)!;
    expect(checkIn.text).toMatch(/descending via the .* arrival\.$/);
  });

  it('drop the restrictions for an assigned altitude, and take them again on "descend via"', () => {
    const { engine, id } = arrivalDescendingVia();
    const star = (engine.getAircraft(id)!.navigation as { name: string }).name;
    const current = Math.round(engine.getAircraft(id)!.altitudeFt / 1_000) * 1_000;
    expect(engine.issueInstruction(id, [{ type: 'altitude', altitudeFt: current }])).toEqual({
      ok: true,
    });
    run(engine, 5);
    expect(engine.getAircraft(id)!.navigation).not.toHaveProperty('descendVia');
    expect(engine.getAircraft(id)!.targets.altitudeFt).toBe(current);

    expect(engine.issueInstruction(id, [{ type: 'descendVia', procedure: star }])).toEqual({
      ok: true,
    });
    expect(engine.comms.at(-1)!.text).toContain('descend via the');
    run(engine, 5);
    const aircraft = engine.getAircraft(id)!;
    expect(aircraft.navigation).toMatchObject({ descendVia: true });
    expect(aircraft.targets.altitudeFt).toBe(descendViaBottomFt(aircraft));
    // Not with a heading (vectors take it off the arrival), nor with an altitude too.
    expect(
      engine.checkInstruction(id, [
        { type: 'descendVia', procedure: star },
        { type: 'heading', headingDeg: 90, turn: 'shortest' },
      ]),
    ).toMatchObject({ ok: false });
    expect(
      engine.checkInstruction(id, [
        { type: 'descendVia', procedure: star },
        { type: 'altitude', altitudeFt: 10_000 },
      ]),
    ).toMatchObject({ ok: false });
    expect(engine.checkInstruction(id, [{ type: 'descendVia', procedure: 'NOPE1' }])).toMatchObject(
      { ok: false },
    );
  });

  it('skip ahead on the STAR for a direct-to one of its fixes, keeping it', () => {
    const { engine, id } = arrivalDescendingVia();
    const navigation = engine.getAircraft(id)!.navigation;
    if (navigation.mode !== 'procedure') throw new Error('not on a procedure');
    const later = navigation.legs
      .map((leg, index) => ({ leg, index }))
      .filter(({ leg, index }) => index > navigation.legIndex + 1 && leg.fix && leg.position)[0]!;
    engine.issueInstruction(id, [
      { type: 'directTo', fix: later.leg.fix!, position: later.leg.position! },
    ]);
    run(engine, 5);
    expect(engine.getAircraft(id)!.navigation).toMatchObject({
      mode: 'procedure',
      legIndex: later.index,
      descendVia: true,
    });
  });

  it('refuse "descend via" for a departure on its SID', () => {
    const engine = SimEngine.create({
      performance,
      world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
      seed: 2,
      startTimeUtc: '2026-09-28T14:00:00Z',
      settings: {
        ...defaultSettings('session'),
        'weather.windMode': 'random',
        'traffic.arrivalRatePerHour': 0,
        'traffic.departureRatePerHour': 20,
        'traffic.transitRatePerHour': 0,
      },
      airspace: newYork,
      airlines,
    });
    let departure: string | undefined;
    for (let t = 0; t < 1_800 && !departure; t++) {
      for (const entry of engine.departureQueue)
        if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick)
          engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
      engine.step();
      departure = engine
        .listAircraft()
        .find(
          (a) =>
            a.owner === 'N90' &&
            a.navigation.mode === 'procedure' &&
            a.navigation.name !== 'Runway heading',
        )?.id;
    }
    const aircraft = engine.getAircraft(departure!)!;
    const sid = (aircraft.navigation as { name: string }).name;
    expect(engine.checkInstruction(aircraft.id, [{ type: 'descendVia', procedure: sid }])).toEqual({
      ok: false,
      reason: `${aircraft.callsign} is not on the ${sid} arrival`,
    });
  });
});

describe('departures on SIDs', () => {
  function departureOnSid() {
    const engine = SimEngine.create({
      performance,
      world: { magneticVariationDeg: newYork.airspace.magneticVariationDeg },
      seed: 2,
      startTimeUtc: '2026-09-28T14:00:00Z',
      settings: {
        ...defaultSettings('session'),
        'weather.windMode': 'random',
        'traffic.arrivalRatePerHour': 0,
        'traffic.departureRatePerHour': 20,
        'traffic.transitRatePerHour': 0,
        'pilots.responseDelaySec': [1, 1],
      },
      airspace: newYork,
      airlines,
    });
    for (let t = 0; t < 1_800; t++) {
      for (const entry of engine.departureQueue)
        if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick)
          engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
      engine.step();
      const id = engine
        .listAircraft()
        .find(
          (a) =>
            a.owner === 'N90' &&
            a.navigation.mode === 'procedure' &&
            a.navigation.name !== 'Runway heading',
        )?.id;
      if (id) return { engine, id };
    }
    throw new Error('No departure on a SID');
  }
  const sidOf = (engine: SimEngine, id: string) =>
    (engine.getAircraft(id)!.navigation as { name: string }).name;

  it('take off climbing via their SID and say so on check-in', () => {
    const { engine, id } = departureOnSid();
    expect(engine.getAircraft(id)!.navigation).toMatchObject({ climbVia: true });
    const checkIn = engine.comms.filter((c) => c.aircraftId === id).at(-1)!;
    expect(checkIn.text).toMatch(/climbing via the .* departure\.$/);
  });

  it('keep the restrictions for "climb via, except maintain", and drop them for an altitude', () => {
    const { engine, id } = departureOnSid();
    const sid = sidOf(engine, id);
    expect(
      engine.issueInstruction(id, [{ type: 'climbVia', procedure: sid, exceptMaintainFt: 17_000 }]),
    ).toEqual({ ok: true });
    expect(engine.comms.at(-1)!.text).toMatch(
      /climb via the .* departure, except maintain one seven thousand\.$/,
    );
    for (let i = 0; i < 5; i++) engine.step();
    expect(engine.getAircraft(id)!.navigation).toMatchObject({ climbVia: true });
    expect(engine.getAircraft(id)!.targets.altitudeFt).toBe(17_000);

    engine.issueInstruction(id, [{ type: 'altitude', altitudeFt: 23_000 }]);
    for (let i = 0; i < 5; i++) engine.step();
    expect(engine.getAircraft(id)!.navigation).not.toHaveProperty('climbVia');
    expect(engine.getAircraft(id)!.targets.altitudeFt).toBe(23_000);
  });

  it('refuse "climb via" for an arrival, and with an altitude or a heading in the same instruction', () => {
    const { engine, id } = departureOnSid();
    const sid = sidOf(engine, id);
    expect(
      engine.checkInstruction(id, [
        { type: 'climbVia', procedure: sid },
        { type: 'altitude', altitudeFt: 10_000 },
      ]),
    ).toMatchObject({ ok: false });
    expect(
      engine.checkInstruction(id, [
        { type: 'climbVia', procedure: sid },
        { type: 'heading', headingDeg: 90, turn: 'shortest' },
      ]),
    ).toMatchObject({ ok: false });
    const arrival = arrivalDescendingVia();
    const star = sidOf(arrival.engine, arrival.id);
    expect(
      arrival.engine.checkInstruction(arrival.id, [{ type: 'climbVia', procedure: star }]),
    ).toMatchObject({ ok: false });
  });
});
