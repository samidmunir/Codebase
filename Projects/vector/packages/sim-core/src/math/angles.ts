export type TurnDirection = 'left' | 'right' | 'shortest';

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Normalizes a heading to [0, 360). */
export function normalizeHeading(degrees: number): number {
  const heading = degrees % 360;
  // `+ 0` turns -0 into 0.
  return heading < 0 ? heading + 360 : heading + 0;
}

/** Signed shortest turn from one heading to another, in (-180, 180]. Positive is a right turn. */
export function headingDifference(from: number, to: number): number {
  const difference = normalizeHeading(to - from);
  return difference > 180 ? difference - 360 : difference;
}

/**
 * Signed degrees to turn from `from` to `to` in the given direction.
 * Positive is a right turn, negative a left turn, 0 means already on heading.
 */
export function turnDelta(from: number, to: number, direction: TurnDirection): number {
  if (direction === 'shortest') return headingDifference(from, to);
  const rightTurn = normalizeHeading(to - from);
  if (rightTurn === 0) return 0;
  return direction === 'right' ? rightTurn : rightTurn - 360;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
