import { AIRSPACE_IDS } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { AIRSPACES } from './registry';

describe('airspace registry', () => {
  it('has exactly the airspaces the server knows, in the same order', () => {
    expect(AIRSPACES.map((airspace) => airspace.id)).toEqual([...AIRSPACE_IDS]);
  });
});
