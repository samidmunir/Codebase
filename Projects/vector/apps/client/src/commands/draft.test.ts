import type { AircraftState } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { newYorkPack as pack } from '../testing/new-york-pack';
import { draftCommands, draftPreview, isEmptyDraft, transmissionText } from './draft';

const aircraft: AircraftState = {
  id: 'AC1',
  callsign: 'DAL412',
  telephony: 'Delta',
  aircraftType: 'B739',
  squawk: '3342',
  flightPlan: { origin: 'KATL', destination: 'KLGA', route: [] },
  phase: 'arrival',
  owner: 'N90',
  position: { lat: 40.9, lon: -73.6 },
  altitudeFt: 7_000,
  headingDeg: 250,
  iasKts: 240,
  verticalSpeedFpm: 0,
  targets: {
    altitudeFt: 7_000,
    headingDeg: 250,
    turnDirection: 'shortest',
    iasKts: 240,
    speedMode: 'assigned',
  },
  navigation: { mode: 'heading' },
};

describe('instruction drafts', () => {
  it('knows when nothing has been chosen', () => {
    expect(isEmptyDraft({})).toBe(true);
    expect(isEmptyDraft({ handoff: false })).toBe(true);
    expect(isEmptyDraft({ altitudeFt: 4_000 })).toBe(false);
  });

  it('builds commands and the exact transmission', () => {
    const commands = draftCommands(
      {
        altitudeFt: 4_000,
        heading: { headingDeg: 220, turn: 'left' },
        speed: 210,
        ilsRunway: '22',
      },
      pack,
      aircraft,
    );
    expect(commands.map((c) => c.type)).toEqual(['heading', 'altitude', 'speed', 'clearedIls']);
    expect(transmissionText(commands, aircraft)).toBe(
      'Delta four twelve, turn left heading two two zero, descend and maintain four thousand, reduce speed to two one zero knots, cleared ILS runway two two approach.',
    );
  });

  it('resolves direct-to fixes and previews them on the scope', () => {
    const draft = { directTo: 'CAMRN' };
    const [command] = draftCommands(draft, pack, aircraft);
    expect(command).toMatchObject({ type: 'directTo', fix: 'CAMRN' });
    expect(draftPreview(draft, pack)?.directTo).toEqual(pack.fix('CAMRN')!.position);
    expect(draftPreview({ heading: { headingDeg: 90, turn: 'right' } }, pack)).toEqual({
      headingDeg: 90,
    });
  });
});
