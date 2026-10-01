import { destinationPoint, type AircraftState } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { performanceCatalog } from '../airspaces/registry';
import { newYorkPack as pack } from '../testing/new-york-pack';
import { draftCommands } from './draft';
import {
  altitudeOptions,
  centerHandoff,
  climbViaOption,
  holdFixOptions,
  holdSummary,
  descendViaOption,
  directToGroups,
  ilsClearance,
  ilsRunways,
  isDeparting,
  minimumVectoringAltitude,
  planningNotes,
  speedOptions,
} from './command-options';

function aircraft(overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    id: 'AC1',
    callsign: 'JBU1024',
    aircraftType: 'A320',
    squawk: '4521',
    flightPlan: { origin: 'KBOS', destination: 'KJFK', route: ['CAMRN5'] },
    phase: 'arrival',
    owner: 'N90',
    position: { lat: 40.3, lon: -73.8 },
    altitudeFt: 8_000,
    headingDeg: 20,
    iasKts: 250,
    verticalSpeedFpm: 0,
    targets: {
      altitudeFt: 8_000,
      headingDeg: 20,
      turnDirection: 'shortest',
      iasKts: 250,
      speedMode: 'assigned',
    },
    navigation: { mode: 'heading' },
    ...overrides,
  };
}

const a320 = performanceCatalog.get('A320');

describe('command options', () => {
  it('builds an ILS clearance from the runway and approach data', () => {
    expect(ilsClearance(pack, 'KJFK', '22L')).toMatchObject({
      airport: 'KJFK',
      runway: '22L',
      approachId: 'I22L',
      courseDeg: 223.8,
      glideslopeDeg: 3,
    });
    expect(ilsClearance(pack, 'KLGA', '31')).toBeUndefined(); // LOC only, no ILS
  });

  it('lists ILS runways only for aircraft landing in the airspace', () => {
    expect(ilsRunways(pack, aircraft())).toEqual(['04L', '04R', '13L', '22L', '22R', '31L', '31R']);
    expect(
      ilsRunways(
        pack,
        aircraft({ flightPlan: { origin: 'KJFK', destination: 'KLAX', route: [] } }),
      ),
    ).toEqual([]);
  });

  it('hands off to the Center the aircraft is leaving into', () => {
    const plan = { origin: 'KJFK', destination: 'KBOS', route: [] };
    const heading = (headingDeg: number) =>
      aircraft({ flightPlan: plan, headingDeg, altitudeFt: 24_000 });
    expect(isDeparting(pack, heading(360))).toBe(true);
    // North toward Albany is Boston Center; southwest toward Baltimore is Washington Center.
    expect(centerHandoff(pack, heading(360))).toMatchObject({
      type: 'handoff',
      to: 'ZBW',
      facility: 'Boston Center',
      frequencyMhz: expect.any(Number),
    });
    expect(centerHandoff(pack, heading(225))).toMatchObject({ to: 'ZDC' });
    // East over the Atlantic stays with New York Center.
    expect(centerHandoff(pack, heading(110))).toMatchObject({ to: 'ZNY' });
  });

  it('offers route fixes first, then the rest in distance rings, alphabetical within each', () => {
    const camrn = pack.fix('CAMRN')!.position;
    const onStar = aircraft({
      navigation: {
        mode: 'procedure',
        name: 'CAMRN5',
        legIndex: 1,
        legStart: { lat: 40.3, lon: -73.8 },
        legs: [
          { pathTerminator: 'TF', fix: 'KARRS', position: pack.fix('KARRS')!.position },
          { pathTerminator: 'TF', fix: 'CAMRN', position: camrn },
        ],
      },
    });
    const groups = directToGroups(pack, onStar, 10);
    // Only the fixes still ahead: KARRS is behind (leg 0 already flown).
    expect(groups[0]).toMatchObject({ title: 'Route' });
    expect(groups[0]!.fixes.map((o) => o.fix.ident)).toEqual(['CAMRN']);

    const rings = groups.slice(1);
    expect(rings.map((g) => g.title)).toEqual(
      ['Within 10 NM', '10–20 NM', '20–30 NM', '30–40 NM'].filter((title) =>
        rings.some((g) => g.title === title),
      ),
    );
    for (const ring of rings) {
      const idents = ring.fixes.map((o) => o.fix.ident);
      expect(idents).toEqual([...idents].sort((a, b) => a.localeCompare(b)));
      expect(ring.fixes.every((o) => o.bearingDeg >= 1 && o.bearingDeg <= 360)).toBe(true);
    }
    const [low, high] = rings[1]!.title.split(/[–\s]/).map(Number);
    expect(rings[1]!.fixes.every((o) => o.distanceNm > low! && o.distanceNm <= high!)).toBe(true);
    // No fix appears twice, and nothing beyond 40 NM.
    const all = groups.flatMap((g) => g.fixes.map((o) => o.fix.ident));
    expect(new Set(all).size).toBe(all.length);
    expect(rings.flatMap((g) => g.fixes).every((o) => o.distanceNm <= 40)).toBe(true);
  });

  it('follows the ring width setting, and has no route group on vectors', () => {
    expect(directToGroups(pack, aircraft(), 20).map((g) => g.title)).toEqual([
      'Within 20 NM',
      '20–40 NM',
    ]);
  });

  it('offers altitudes up to the top of the airspace', () => {
    const altitudes = altitudeOptions(pack, a320);
    expect(altitudes[0]).toBe(2_000);
    // The A320's ceiling (FL390) is below the top of the airspace (FL450).
    expect(altitudes.at(-1)).toBe(39_000);
  });

  it('offers speeds in 10 kt steps, capped at 250 below 10,000 ft', () => {
    expect(speedOptions(a320, 8_000)).toEqual([
      140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250,
    ]);
    expect(speedOptions(a320, 12_000).at(-1)).toBe(350);
  });

  it('looks up the minimum vectoring altitude from the N90 MVA chart', () => {
    // Over Manhattan the MVA is raised for tall buildings; off the Jersey shore it is low.
    const manhattan = minimumVectoringAltitude(pack, { lat: 40.758, lon: -73.9855 });
    const offshore = minimumVectoringAltitude(pack, { lat: 40.3, lon: -73.6 });
    expect(manhattan).toBeGreaterThan(offshore!);
    expect(offshore).toBeGreaterThanOrEqual(1_500);
  });
});

describe('planning notes', () => {
  const label = (ft: number) => (ft >= 18_000 ? `FL${ft / 100}` : `${ft}`);

  it('tells when to start an arrival down (3:1)', () => {
    const jfk = pack.airport('KJFK').position;
    const arrival = (nm: number, targetFt = 35_000) =>
      aircraft({
        flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
        phase: 'arrival',
        position: destinationPoint(jfk, 45, nm),
        altitudeFt: 35_000,
        targets: { ...aircraft({}).targets, altitudeFt: targetFt },
      });
    // FL350 to 3,000 ft above the field is about 96 NM of descent.
    expect(planningNotes(pack, arrival(150), label)).toEqual([
      { label: 'JFK', value: '150 NM', tone: 'normal' },
      { label: 'Descent', value: 'start in 54 NM', tone: 'normal' },
    ]);
    expect(planningNotes(pack, arrival(100), label)[1]).toMatchObject({
      value: 'start down now',
      tone: 'caution',
    });
    expect(planningNotes(pack, arrival(100, 11_000), label)[1]).toMatchObject({
      value: 'descending',
      tone: 'good',
    });
  });

  it('shows the requested level and where a departure leaves', () => {
    const departure = aircraft({
      flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [], requestedAltitudeFt: 30_000 },
      headingDeg: 360,
      altitudeFt: 20_000,
      targets: { ...aircraft({}).targets, altitudeFt: 30_000 },
    });
    const settings = {
      'center.handoffWindowNm': 20,
      'center.handoffMinimumEastboundFt': 17_000,
      'center.handoffMinimumWestboundFt': 18_000,
    };
    const notes = planningNotes(pack, departure, label, settings);
    expect(notes[0]).toEqual({ label: 'Requested', value: 'FL300 ✓', tone: 'good' });
    // Far from the N90 boundary: Boston Center takes it near the TRACON's northern edge.
    expect(notes[1]).toMatchObject({
      label: 'Handoff',
      value: expect.stringMatching(/^Boston · in \d+ NM$/),
    });
  });
});

describe('descend via', () => {
  // A procedure with a published altitude: a STAR for an arrival, a SID for a departure.
  const procedure = (name: string): AircraftState['navigation'] => ({
    mode: 'procedure',
    name,
    legs: [
      {
        pathTerminator: 'TF',
        fix: 'KORRY',
        position: destinationPoint({ lat: 40.3, lon: -73.8 }, 0, 20),
        altitudeRestriction: { minFt: 10_000, maxFt: 10_000 },
      },
    ],
    legIndex: 0,
    legStart: { lat: 40.3, lon: -73.8 },
  });

  it('is offered for an arrival on its STAR', () => {
    const arrival = aircraft({
      flightPlan: { origin: 'KATL', destination: 'KLGA', route: ['PROUD2'] },
      navigation: procedure('PROUD2'),
    });
    expect(descendViaOption(arrival)).toMatchObject({ procedure: 'PROUD2', bottomFt: 10_000 });
  });

  it('is never offered on a departure’s SID or a missed approach', () => {
    const departure = aircraft({
      flightPlan: { origin: 'KLGA', destination: 'KATL', route: ['GLDMN8', 'NEWEL'] },
      phase: 'enroute',
      navigation: procedure('GLDMN8'),
    });
    expect(descendViaOption(departure)).toBeUndefined();
    expect(descendViaOption({ ...departure, phase: 'departure' })).toBeUndefined();
    const wentAround = aircraft({
      flightPlan: { origin: 'KATL', destination: 'KLGA', route: ['PROUD2'] },
      navigation: procedure('Missed approach'),
    });
    expect(descendViaOption(wentAround)).toBeUndefined();
  });
});

describe('climb via', () => {
  const onSid = (phase: AircraftState['phase'] = 'enroute') =>
    aircraft({
      flightPlan: { origin: 'KLGA', destination: 'KATL', route: ['GLDMN8', 'NEWEL'] },
      phase,
      targets: { ...aircraft().targets, altitudeFt: 5_000 },
      navigation: {
        mode: 'procedure',
        name: 'GLDMN8',
        legs: [
          {
            pathTerminator: 'TF',
            fix: 'VOBOZ',
            position: destinationPoint({ lat: 40.3, lon: -73.8 }, 90, 6),
            altitudeRestriction: { minFt: 4_500 },
          },
        ],
        legIndex: 0,
        legStart: { lat: 40.3, lon: -73.8 },
        climbVia: true,
      },
    });

  it('is offered for a departure on its SID, with its top altitude and next restriction', () => {
    expect(climbViaOption(onSid())).toMatchObject({
      procedure: 'GLDMN8',
      topFt: 5_000,
      active: true,
      next: { fix: 'VOBOZ', label: '045+' },
    });
    expect(climbViaOption(aircraft())).toBeUndefined(); // an arrival
  });

  it('turns climb via plus an altitude into "climb via, except maintain"', () => {
    expect(draftCommands({ climbVia: true, altitudeFt: 17_000 }, pack, onSid())).toEqual([
      { type: 'climbVia', procedure: 'GLDMN8', exceptMaintainFt: 17_000 },
    ]);
    expect(draftCommands({ climbVia: true }, pack, onSid())).toEqual([
      { type: 'climbVia', procedure: 'GLDMN8' },
    ]);
    expect(draftCommands({ altitudeFt: 17_000 }, pack, onSid())).toEqual([
      { type: 'altitude', altitudeFt: 17_000 },
    ]);
  });
});

describe('holding', () => {
  const clock = {
    tick: 600,
    tickSeconds: 1,
    utcAtTick: (tick: number) => new Date(Date.UTC(2026, 8, 30, 14, 0, tick)),
  };
  const camrn = pack.fix('CAMRN')!;

  it('offers route fixes first, then nearby fixes with published holds', () => {
    const onCamrn = aircraft({
      position: destinationPoint(camrn.position, 200, 20),
      flightPlan: { origin: 'KATL', destination: 'KJFK', route: ['CAMRN'] },
    });
    const options = holdFixOptions(pack, onCamrn);
    expect(options[0]).toMatchObject({
      fix: { ident: 'CAMRN' },
      onRoute: true,
      published: { turn: 'left' },
    });
    expect(options.slice(1).every((o) => !o.onRoute && o.published && o.distanceNm <= 60)).toBe(
      true,
    );
    expect(holdSummary(options[0]!.published!)).toBe('041° inbound, left turns, 210 kt');
  });

  it('builds the published hold with an EFC time from the sim clock', () => {
    const commands = draftCommands(
      {
        hold: {
          fix: 'CAMRN',
          published: true,
          inboundCourseDeg: 200,
          turn: 'right',
          efcMinutes: 15,
        },
      },
      pack,
      aircraft(),
      clock,
    );
    expect(commands).toEqual([
      {
        type: 'hold',
        fix: 'CAMRN',
        position: camrn.position,
        inboundCourseDeg: 41,
        turn: 'left',
        maxSpeedKts: 210,
        published: true,
        efcTick: 1_500,
        efcTimeZ: '1425',
      },
    ]);
  });

  it('builds a described hold, and resume', () => {
    const [hold] = draftCommands(
      {
        hold: {
          fix: 'CAMRN',
          published: false,
          inboundCourseDeg: 200,
          turn: 'right',
          efcMinutes: 5,
        },
      },
      pack,
      aircraft(),
      clock,
    );
    expect(hold).toMatchObject({
      inboundCourseDeg: 200,
      turn: 'right',
      published: false,
      efcTimeZ: '1415',
    });
    expect(draftCommands({ resume: true }, pack, aircraft(), clock)).toEqual([
      { type: 'resumeProcedure' },
    ]);
  });
});
