import { describe, expect, it } from 'vitest';
import {
  chainEdges,
  clipLines,
  landTester,
  leftOfEdge,
  lineLengthMeters,
  simplify,
  unsharedEdges,
  type Line,
  type Point,
} from './geometry';

// Two unit squares side by side (clockwise, as in shapefiles), sharing the edge x = 1.
const left: Point[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const right: Point[] = [
  [1, 0],
  [1, 1],
  [2, 1],
  [2, 0],
  [1, 0],
];

describe('unsharedEdges and chainEdges', () => {
  it('cancels the shared seam and joins the outline into one line', () => {
    const edges = unsharedEdges([left, right]);
    expect(edges).toHaveLength(6);
    expect(edges.some(([a, b]) => a[0] === 1 && b[0] === 1)).toBe(false);

    const lines = chainEdges(edges);
    expect(lines).toHaveLength(1);
    // A closed outline: 6 edges -> 7 points, first equals last.
    expect(lines[0]).toHaveLength(7);
    expect(lines[0]![0]).toEqual(lines[0]!.at(-1));
  });
});

describe('simplify', () => {
  it('removes points within the tolerance and keeps real corners', () => {
    // ~1.1 km east, a 1 m wiggle, then a corner 1.1 km north.
    const line: Line = [
      [0, 0],
      [0.005, 0.000009],
      [0.01, 0],
      [0.01, 0.01],
    ];
    expect(simplify(line, 5)).toEqual([
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
    ]);
  });
});

describe('clipLines', () => {
  it('splits lines into the runs inside the box', () => {
    const line: Line = [
      [0, 0],
      [1, 0],
      [5, 0],
      [6, 0],
      [7, 0],
    ];
    const box = { minLon: -1, maxLon: 1.5, minLat: -1, maxLat: 1 };
    expect(clipLines([line], box)).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
    ]);
  });
});

describe('lineLengthMeters', () => {
  it('measures a degree of latitude as ~111 km', () => {
    expect(
      lineLengthMeters([
        [0, 40],
        [0, 41],
      ]),
    ).toBeCloseTo(111_320, -2);
  });
});

describe('land tests', () => {
  it('puts the left of a clockwise edge outside the polygon', () => {
    // Bottom edge of `left`, walked clockwise: from (1,0) to (0,0). Outside is south.
    const outside = leftOfEdge([1, 0], [0, 0], 1000);
    expect(outside[1]).toBeLessThan(0);
  });

  it('counts points inside land, or near its outline, as land', () => {
    const isLand = landTester([left], 200);
    expect(isLand([0.5, 0.5])).toBe(true);
    expect(isLand([0.5, -0.001])).toBe(true); // ~110 m outside the outline
    expect(isLand([0.5, -0.1])).toBe(false);
  });
});
