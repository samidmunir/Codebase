import type { LeaderDirection } from './traffic-layer';

// Automatic data block placement. Blocks are placed most important first
// (selected, then the player's traffic, then others); each takes the leader
// direction whose block overlaps the least with blocks and targets already
// placed. An aircraft keeps its previous direction while that is still clear,
// so blocks don't jump around from frame to frame.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockRequest {
  id: string;
  /** Target position on screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Higher places first. */
  priority: number;
  /** A direction the player chose; it is never moved. */
  fixed?: LeaderDirection | undefined;
}

/** Preferred order when the default spot (northeast) is taken. */
const PREFERENCE: LeaderDirection[] = [1, 2, 7, 3, 0, 6, 5, 4];
/** Half-size of the keep-clear box around each target symbol. */
const TARGET_CLEARANCE_PX = 7;
/** Extra cost for leaving the previous direction, so small overlaps don't cause flicker. */
const MOVE_PENALTY = 40;

/** Where a data block sits for a leader direction (as the scope draws it). */
export function blockRect(
  x: number,
  y: number,
  direction: LeaderDirection,
  leaderLengthPx: number,
  width: number,
  height: number,
): Rect {
  const angle = -Math.PI / 2 + (direction * Math.PI) / 4;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const endX = x + cos * (leaderLengthPx + 6);
  const endY = y + sin * (leaderLengthPx + 6);
  const left = cos > 0.3 ? endX + 3 : cos < -0.3 ? endX - 3 - width : endX - width / 2;
  const top = sin < -0.3 ? endY - height : sin > 0.3 ? endY : endY - height / 2;
  return { x: left, y: top, width, height };
}

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/**
 * Chooses a leader direction for every block. `previous` holds last frame's
 * automatic choices and is updated in place.
 */
export function placeDataBlocks(
  requests: readonly BlockRequest[],
  leaderLengthPx: number,
  previous: Map<string, LeaderDirection>,
): Map<string, LeaderDirection> {
  const placed: Rect[] = requests.map((r) => ({
    x: r.x - TARGET_CLEARANCE_PX,
    y: r.y - TARGET_CLEARANCE_PX,
    width: TARGET_CLEARANCE_PX * 2,
    height: TARGET_CLEARANCE_PX * 2,
  }));
  const chosen = new Map<string, LeaderDirection>();
  const ordered = [...requests].sort((a, b) => b.priority - a.priority);

  for (const request of ordered) {
    const rectFor = (direction: LeaderDirection) =>
      blockRect(request.x, request.y, direction, leaderLengthPx, request.width, request.height);
    if (request.fixed !== undefined) {
      chosen.set(request.id, request.fixed);
      placed.push(rectFor(request.fixed));
      continue;
    }
    const last = previous.get(request.id);
    let best: { direction: LeaderDirection; cost: number } | undefined;
    for (const [rank, direction] of PREFERENCE.entries()) {
      const rect = rectFor(direction);
      const overlapArea = placed.reduce((sum, other) => sum + overlap(rect, other), 0);
      const cost =
        overlapArea + rank + (last !== undefined && direction !== last ? MOVE_PENALTY : 0);
      if (!best || cost < best.cost) best = { direction, cost };
      if (overlapArea === 0 && direction === last) break; // still clear: stay put
    }
    chosen.set(request.id, best!.direction);
    previous.set(request.id, best!.direction);
    placed.push(rectFor(best!.direction));
  }
  for (const id of previous.keys()) if (!chosen.has(id)) previous.delete(id);
  return chosen;
}
