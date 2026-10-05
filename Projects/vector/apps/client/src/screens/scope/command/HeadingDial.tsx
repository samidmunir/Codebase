import { useRef } from 'react';

interface HeadingDialProps {
  /** Aircraft's current magnetic heading. */
  currentDeg: number;
  /** Heading being assigned, if any (1-360). */
  selectedDeg: number | undefined;
  onSelect: (headingDeg: number) => void;
}

const SIZE = 216;
const CENTER = SIZE / 2;
const RING = 92;
const SNAP_DEG = 5;

const point = (deg: number, radius: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CENTER + Math.cos(a) * radius, y: CENTER + Math.sin(a) * radius };
};

/** Heading from a pointer position on the dial, snapped to 5° and returned as 1-360. */
function headingAt(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const rect = svg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * SIZE - CENTER;
  const y = ((clientY - rect.top) / rect.height) * SIZE - CENTER;
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
  return Math.round(deg / SNAP_DEG) * SNAP_DEG || 360;
}

/** Compass dial for choosing a heading by clicking or dragging. */
export function HeadingDial({ currentDeg, selectedDeg, onSelect }: HeadingDialProps) {
  const dragging = useRef(false);

  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const current = point(currentDeg, RING - 16);
  const selected = selectedDeg === undefined ? undefined : point(selectedDeg, RING - 4);

  return (
    <svg
      className="heading-dial"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="slider"
      aria-label="Heading"
      aria-valuemin={1}
      aria-valuemax={360}
      aria-valuenow={selectedDeg ?? Math.round(currentDeg)}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect(headingAt(event.currentTarget, event.clientX, event.clientY));
      }}
      onPointerMove={(event) => {
        if (dragging.current)
          onSelect(headingAt(event.currentTarget, event.clientX, event.clientY));
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <circle className="heading-dial__face" cx={CENTER} cy={CENTER} r={RING + 12} />
      {ticks.map((deg) => {
        const major = deg % 30 === 0;
        const outer = point(deg, RING + 6);
        const inner = point(deg, RING + (major ? -4 : deg % 10 === 0 ? 0 : 3));
        return (
          <line
            key={deg}
            className={
              major ? 'heading-dial__tick heading-dial__tick--major' : 'heading-dial__tick'
            }
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
          />
        );
      })}
      {ticks
        .filter((deg) => deg % 30 === 0)
        .map((deg) => {
          const label = point(deg, RING - 16);
          return (
            <text key={deg} className="heading-dial__label" x={label.x} y={label.y}>
              {String(deg / 10 || 36).padStart(2, '0')}
            </text>
          );
        })}

      {/* Current heading */}
      <line
        className="heading-dial__current"
        x1={CENTER}
        y1={CENTER}
        x2={current.x}
        y2={current.y}
      />

      {/* Assigned heading */}
      {selected && (
        <>
          <line
            className="heading-dial__selected"
            x1={CENTER}
            y1={CENTER}
            x2={selected.x}
            y2={selected.y}
          />
          <circle className="heading-dial__handle" cx={selected.x} cy={selected.y} r={7} />
        </>
      )}

      <circle className="heading-dial__hub" cx={CENTER} cy={CENTER} r={30} />
      <text className="heading-dial__value" x={CENTER} y={CENTER - 3}>
        {String(selectedDeg ?? (Math.round(currentDeg) % 360 || 360)).padStart(3, '0')}
      </text>
      <text className="heading-dial__caption" x={CENTER} y={CENTER + 13}>
        {selectedDeg === undefined ? 'current' : 'assign'}
      </text>
    </svg>
  );
}
