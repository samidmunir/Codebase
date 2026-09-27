import { describe, expect, it } from 'vitest';
import { newYorkPack as pack } from '../testing/new-york-pack';
import { project, type Camera } from './camera';
import { fixAt } from './fix-picking';

const camera: Camera = { center: pack.airspace.center, zoom: 9, width: 1400, height: 900 };

describe('fixAt', () => {
  it('picks the fix under the cursor, and nothing when none is close', () => {
    const camrn = pack.fix('CAMRN')!;
    const at = project(camera, camrn.position);
    expect(fixAt(pack, camera, { x: at.x + 5, y: at.y - 4 })?.ident).toBe('CAMRN');
    expect(fixAt(pack, camera, { x: at.x + 200, y: at.y + 200 })?.ident).not.toBe('CAMRN');
    expect(fixAt(pack, camera, { x: -500, y: -500 })).toBeUndefined();
  });
});
