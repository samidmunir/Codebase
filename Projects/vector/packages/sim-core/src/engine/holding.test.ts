import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AtcCommand } from '../commands/commands';
import { destinationPoint, distanceNm } from '../math/geo';
import { airlines, newYork, newAircraft, NEW_YORK_WORLD, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

function createEngine() {
  return SimEngine.create({
    performance,
    world: NEW_YORK_WORLD,
    seed: 3,
    startTimeUtc: '2026-09-28T14:00:00Z',
    settings: { ...defaultSettings('session'), 'pilots.responseDelaySec': [1, 1] },
  });
}
const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

const camrn = newYork.fix('CAMRN')!;
const published = newYork.holdAt('CAMRN')!;
const holdAtCamrn = (engine: SimEngine, efcMinutes = 15): AtcCommand => ({
  type: 'hold',
  fix: 'CAMRN',
  position: camrn.position,
  inboundCourseDeg: published.inboundCourseDeg,
  turn: published.turn,
  ...(published.maxSpeedKts ? { maxSpeedKts: published.maxSpeedKts } : {}),
  published: true,
  efcTick: engine.tick + efcMinutes * 60,
  efcTimeZ: '1415',
});

describe('holding', () => {
  it('uses the published hold at CAMRN (041° inbound, left turns, 210 kt)', () => {
    expect(published).toMatchObject({ inboundCourseDeg: 41, turn: 'left', maxSpeedKts: 210 });
  });

  it('flies a racetrack at the fix at holding speed, and stays near it', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(
      newAircraft({
        position: destinationPoint(camrn.position, 200, 15),
        headingDeg: 33,
        altitudeFt: 9_000,
        iasKts: 250,
      }),
    );
    expect(engine.issueInstruction(aircraft.id, [holdAtCamrn(engine)])).toEqual({ ok: true });
    expect(engine.comms.at(-1)!.text).toMatch(
      /hold at CAMRN as published, expect further clearance one four one five\.$/,
    );
    const passes: number[] = [];
    engine.subscribe(
      (event) => event.type === 'fixPassed' && event.fix === 'CAMRN' && passes.push(engine.tick),
    );
    let farthest = 0;
    let fastestHolding = 0;
    for (let t = 0; t < 30 * 60; t++) {
      engine.step();
      const now = engine.getAircraft(aircraft.id)!;
      if (passes.length > 0) {
        farthest = Math.max(farthest, distanceNm(now.position, camrn.position));
        fastestHolding = Math.max(fastestHolding, now.iasKts);
      }
    }
    const holding = engine.getAircraft(aircraft.id)!;
    expect(holding.navigation).toMatchObject({ mode: 'hold', fix: 'CAMRN' });
    // Several laps of about 4 minutes each (1-minute legs below 14,000 ft, two turns).
    expect(passes.length).toBeGreaterThanOrEqual(5);
    const lap = (passes.at(-1)! - passes.at(-2)!) / 60;
    expect(lap).toBeGreaterThan(3);
    expect(lap).toBeLessThan(6);
    // Within a few miles of the fix, and slowed to the published 210 kt.
    expect(farthest).toBeLessThan(8);
    expect(fastestHolding).toBeLessThanOrEqual(212);
  });

  it('asks for further clearance at the EFC time', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(
      newAircraft({
        position: destinationPoint(camrn.position, 200, 5),
        headingDeg: 33,
        altitudeFt: 8_000,
      }),
    );
    engine.issueInstruction(aircraft.id, [holdAtCamrn(engine, 5)]);
    run(engine, 4 * 60);
    expect(engine.comms.some((c) => /request further clearance/.test(c.text))).toBe(false);
    run(engine, 2 * 60);
    const calls = engine.comms.filter((c) => /request further clearance/.test(c.text));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toMatch(/holding at CAMRN, we're at our expect further clearance time/);
  });

  it('describes a hold that is not published, and leaves it for a heading', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(
      newAircraft({ position: destinationPoint(camrn.position, 200, 5), headingDeg: 33 }),
    );
    engine.issueInstruction(aircraft.id, [
      {
        type: 'hold',
        fix: 'CAMRN',
        position: camrn.position,
        inboundCourseDeg: 30,
        turn: 'right',
        published: false,
        efcTick: engine.tick + 600,
        efcTimeZ: '1410',
      },
    ]);
    expect(engine.comms.at(-1)!.text).toMatch(
      /hold southwest of CAMRN, zero three zero inbound, right turns, expect further clearance one four one zero\.$/,
    );
    run(engine, 5);
    engine.issueInstruction(aircraft.id, [{ type: 'heading', headingDeg: 90, turn: 'shortest' }]);
    run(engine, 5);
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
  });
});

describe('holding on a STAR', () => {
  it('holds at a STAR fix, stops descending via, and resumes the STAR from there', () => {
    // An arrival on a STAR with published altitudes.
    let engine: SimEngine | undefined;
    let id: string | undefined;
    for (let seed = 1; seed <= 30 && !id; seed++) {
      engine = SimEngine.create({
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
      engine.subscribe((event) => {
        if (event.type === 'arrivalEntered' && !id && ['PROUD2', 'PHLBO4'].includes(event.star))
          id = event.aircraftId;
      });
      for (let t = 0; t < 3_600 && !id; t++) engine.step();
    }
    const e = engine!;
    const arrival = e.getAircraft(id!)!;
    const navigation = arrival.navigation;
    if (navigation.mode !== 'procedure') throw new Error('not on its STAR');
    // A fix two legs ahead on the STAR.
    const ahead = navigation.legs
      .map((leg, index) => ({ leg, index }))
      .filter(({ leg, index }) => index > navigation.legIndex && leg.fix && leg.position)[1]!;
    e.issueInstruction(arrival.id, [
      {
        type: 'hold',
        fix: ahead.leg.fix!,
        position: ahead.leg.position!,
        inboundCourseDeg: 90,
        turn: 'right',
        published: false,
        efcTick: e.tick + 1_200,
        efcTimeZ: '1430',
      },
    ]);
    run(e, 5);
    const holding = e.getAircraft(arrival.id)!;
    expect(holding.navigation).toMatchObject({
      mode: 'hold',
      resume: { mode: 'procedure', name: navigation.name, legIndex: ahead.index + 1 },
    });
    // It levels where it is instead of descending to the STAR's bottom altitude.
    expect(Math.abs(holding.targets.altitudeFt - holding.altitudeFt)).toBeLessThan(1_500);

    expect(e.issueInstruction(arrival.id, [{ type: 'resumeProcedure' }])).toEqual({ ok: true });
    expect(e.comms.at(-1)!.text).toMatch(/resume the .* arrival\.$/);
    run(e, 5);
    expect(e.getAircraft(arrival.id)!.navigation).toMatchObject({
      mode: 'procedure',
      legIndex: ahead.index + 1,
      descendVia: true,
    });
  });

  it('refuses "resume" when not holding on a procedure', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(
      newAircraft({ position: destinationPoint(camrn.position, 200, 5) }),
    );
    expect(engine.checkInstruction(aircraft.id, [{ type: 'resumeProcedure' }])).toMatchObject({
      ok: false,
    });
  });
});
