import type { AircraftState } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { performanceCatalog } from '../airspaces/registry';
import { newYorkPack as pack } from '../testing/new-york-pack';
import {
  altitudeOptions,
  centerHandoff,
  directToOptions,
  ilsClearance,
  ilsRunways,
  isDeparting,
  minimumVectoringAltitude,
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

  it('hands departures to the nearest New York Center site on the right altitude band', () => {
    const departure = aircraft({ flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [] } });
    expect(isDeparting(pack, departure)).toBe(true);
    expect(centerHandoff(pack, departure)).toMatchObject({
      type: 'handoff',
      to: 'ZNY',
      facility: 'New York Center',
      frequencyMhz: expect.any(Number),
    });
  });

  it('offers route fixes first for direct-to', () => {
    const options = directToOptions(pack, aircraft());
    expect(options[0]!.onRoute).toBe(true);
    expect(options.filter((o) => o.onRoute).map((o) => o.fix.ident)).toContain('CAMRN');
    expect(options.every((o) => o.bearingDeg >= 1 && o.bearingDeg <= 360)).toBe(true);
  });

  it('offers altitudes up to the top of the airspace', () => {
    const altitudes = altitudeOptions(pack, a320);
    expect(altitudes[0]).toBe(2_000);
    expect(altitudes.at(-1)).toBe(17_000);
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
