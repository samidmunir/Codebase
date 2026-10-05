import { distanceNm, type AirspacePack, type Fix } from '@vector/sim-core';
import { project, type Camera, type ScreenPoint } from './camera';

/** How close (in screen pixels) a click must be to a fix to pick it. */
export const FIX_PICK_RADIUS_PX = 14;

/** The fix nearest a screen point, within the pick radius; undefined if none is close. */
export function fixAt(
  pack: AirspacePack,
  camera: Camera,
  point: ScreenPoint,
  radiusPx = FIX_PICK_RADIUS_PX,
): Fix | undefined {
  const inRegion = pack.boundaryRadiusNm + 20;
  let best: { fix: Fix; distancePx: number } | undefined;
  for (const fix of pack.fixes) {
    if (distanceNm(pack.airspace.center, fix.position) > inRegion) continue;
    const screen = project(camera, fix.position);
    const distancePx = Math.hypot(screen.x - point.x, screen.y - point.y);
    if (distancePx <= radiusPx && (!best || distancePx < best.distancePx))
      best = { fix, distancePx };
  }
  return best?.fix;
}
