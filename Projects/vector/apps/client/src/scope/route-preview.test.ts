import type { AircraftState } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { newYorkPack as pack } from '../testing/new-york-pack';
import { routePreview } from './route-preview';

const base: AircraftState = {
  id: 'AC1',
  callsign: 'JBU1024',
  aircraftType: 'A320',
  squawk: '4521',
  flightPlan: { origin: 'KLGA', destination: 'KBOS', route: ['TNNIS6', 'MERIT'] },
  phase: 'departure',
  owner: 'N90',
  position: { lat: 40.77, lon: -73.86 },
  altitudeFt: 3_000,
  headingDeg: 134,
  iasKts: 220,
  verticalSpeedFpm: 2_000,
  targets: {
    altitudeFt: 5_000,
    headingDeg: 134,
    turnDirection: 'shortest',
    iasKts: 250,
    speedMode: 'normal',
  },
  navigation: { mode: 'heading' },
};

describe('route preview', () => {
  it('draws the remaining procedure fixes, speed limits and the gate', () => {
    const jutes = pack.fix('JUTES')!.position;
    const tnnis = pack.fix('TNNIS')!.position;
    const preview = routePreview(
      {
        ...base,
        navigation: {
          mode: 'procedure',
          name: 'TNNIS6',
          legIndex: 1,
          legStart: base.position,
          legs: [
            { pathTerminator: 'VI', courseDeg: 134 },
            {
              pathTerminator: 'CF',
              fix: 'JUTES',
              position: jutes,
              courseDeg: 91,
              speedLimitKts: 220,
            },
            { pathTerminator: 'TF', fix: 'TNNIS', position: tnnis },
            { pathTerminator: 'FM', courseDeg: 45 },
          ],
        },
      },
      pack,
    );
    expect(preview.label).toBe('TNNIS six departure');
    expect(preview.path).toEqual([base.position, jutes, tnnis]);
    expect(preview.fixes.map((f) => [f.ident, f.note])).toEqual([
      ['JUTES', '≤220'],
      ['TNNIS', undefined],
      ['MERIT', 'gate'],
    ]);
    expect(preview.headingTail?.from).toEqual(tnnis);
  });

  it('draws a from-fix leg as a heading, not a line back to a fix already passed', () => {
    const watja = pack.fix('WATJA')!.position;
    const preview = routePreview(
      {
        ...base,
        flightPlan: { origin: 'KMCO', destination: 'KEWR', route: ['BRAND1'] },
        phase: 'arrival',
        navigation: {
          mode: 'procedure',
          name: 'BRAND1',
          legIndex: 1,
          legStart: base.position,
          legs: [
            { pathTerminator: 'TF', fix: 'WATJA', position: watja },
            { pathTerminator: 'FM', fix: 'WATJA', position: watja, courseDeg: 61 },
          ],
        },
      },
      pack,
    );
    expect(preview.path).toEqual([base.position]);
    expect(preview.fixes).toEqual([]);
    expect(preview.headingTail?.from).toEqual(base.position);
  });

  it('draws a heading line on vectors', () => {
    const preview = routePreview(
      { ...base, flightPlan: { ...base.flightPlan, destination: 'KJFK', route: [] } },
      pack,
    );
    expect(preview.path).toEqual([base.position]);
    expect(preview.headingTail).toBeDefined();
  });

  it('draws the final approach course once cleared for the ILS', () => {
    const runway = pack.runway('KJFK', '22L');
    const preview = routePreview(
      {
        ...base,
        flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
        phase: 'approach',
        navigation: {
          mode: 'approach',
          clearance: {
            airport: 'KJFK',
            runway: '22L',
            approachId: 'I22L',
            threshold: runway.threshold,
            thresholdElevationFt: 13,
            courseDeg: 223.8,
            glideslopeDeg: 3,
            thresholdCrossingHeightFt: 55,
          },
          localizerCaptured: true,
          glideslopeCaptured: true,
          gatePassed: false,
        },
      },
      pack,
    );
    expect(preview.label).toBe('ILS 22L');
    expect(preview.path.at(-1)).toEqual(runway.threshold);
    expect(preview.onward.at(-1)).toEqual(runway.threshold);
  });
});
