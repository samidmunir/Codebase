import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatDuration } from '@vector/sim-core';
import { formatRp } from './score-format';

const WIDTH = 560;
const HEIGHT = 190;
const PAD = { top: 14, right: 78, bottom: 26, left: 52 };

/** A round step for about `count` gridlines across `span`. */
function niceStep(span: number, count: number): number {
  const raw = Math.max(1, span) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

/**
 * The session's RP over time: one step line (RP changes in jumps), a zero
 * baseline, a crosshair readout on hover or with the arrow keys, and the
 * same numbers as a table.
 */
export function RpChart({
  points,
  durationSec,
}: {
  /** [seconds since the start, RP total after the change]. */
  points: readonly (readonly [number, number])[];
  durationSec: number;
}) {
  const series = useMemo(() => {
    const steps: [number, number][] = [
      [0, 0],
      ...points.map(([t, rp]) => [t, rp] as [number, number]),
    ];
    return steps;
  }, [points]);
  const last = series.at(-1)!;
  const endSec = Math.max(durationSec, last[0], 60);
  const values = series.map(([, rp]) => rp);
  const step = niceStep(Math.max(...values, 0) - Math.min(...values, 0), 4);
  const yMin = Math.floor(Math.min(0, ...values) / step) * step;
  const yMax = Math.max(step, Math.ceil(Math.max(0, ...values) / step) * step);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (sec: number) => PAD.left + (sec / endSec) * plotW;
  const y = (rp: number) => PAD.top + (1 - (rp - yMin) / (yMax - yMin)) * plotH;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(v);

  // Step-after path to now.
  let path = `M${x(0)},${y(0)}`;
  for (const [t, rp] of series.slice(1)) path += ` H${x(t)} V${y(rp)}`;
  path += ` H${x(endSec)}`;

  const [focus, setFocus] = useState<number | undefined>(undefined);
  const valueAt = (sec: number) => {
    let value = 0;
    for (const [t, rp] of series) if (t <= sec) value = rp;
    return value;
  };
  const focusSec = focus;
  const onPointer = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setFocus(Math.max(0, Math.min(1, ratio)) * endSec);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const times = series.map(([t]) => t);
    const current = focusSec ?? endSec;
    const next =
      event.key === 'ArrowRight'
        ? (times.find((t) => t > current + 0.5) ?? endSec)
        : ([...times].reverse().find((t) => t < current - 0.5) ?? 0);
    setFocus(next);
  };

  const timeLabel = (sec: number) => formatDuration(sec);
  return (
    <figure className="rp-chart">
      <div
        className="rp-chart__plot"
        tabIndex={0}
        role="img"
        aria-label={`RP over the session: ${formatRp(last[1])} after ${timeLabel(endSec)}. Use the arrow keys to read values.`}
        onKeyDown={onKey}
        onFocus={() => setFocus((f) => f ?? endSec)}
        onBlur={() => setFocus(undefined)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" aria-hidden="true">
          {ticks.map((v) => (
            <g key={v}>
              <line
                className={v === 0 ? 'rp-chart__zero' : 'rp-chart__grid'}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(v)}
                y2={y(v)}
              />
              <text
                className="rp-chart__axis"
                x={PAD.left - 8}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {v.toLocaleString('en-US')}
              </text>
            </g>
          ))}
          {[0, endSec / 2, endSec].map((t) => (
            <text
              key={t}
              className="rp-chart__axis"
              x={x(t)}
              y={HEIGHT - 6}
              textAnchor={t === 0 ? 'start' : t === endSec ? 'end' : 'middle'}
            >
              {timeLabel(t)}
            </text>
          ))}
          <path className="rp-chart__line" d={path} />
          {/* The value now, at the end of the line (text in ink, not the line's color). */}
          <text
            className="rp-chart__end"
            x={x(endSec) + 8}
            y={y(last[1])}
            dominantBaseline="middle"
          >
            {formatRp(last[1])}
          </text>
          {focusSec !== undefined && (
            <g className="rp-chart__focus">
              <line x1={x(focusSec)} x2={x(focusSec)} y1={PAD.top} y2={PAD.top + plotH} />
              <circle cx={x(focusSec)} cy={y(valueAt(focusSec))} r={4} />
            </g>
          )}
          <rect
            className="rp-chart__hit"
            x={PAD.left}
            y={0}
            width={plotW}
            height={HEIGHT}
            onPointerMove={onPointer}
            onPointerLeave={() => setFocus(undefined)}
          />
        </svg>
        {focusSec !== undefined && (
          <div
            className="rp-chart__tooltip"
            style={{
              left: `${(x(focusSec) / WIDTH) * 100}%`,
              top: `${(y(valueAt(focusSec)) / HEIGHT) * 100}%`,
            }}
          >
            <b>{formatRp(valueAt(focusSec))}</b>
            <span>at {timeLabel(focusSec)}</span>
          </div>
        )}
      </div>
      <details className="rp-chart__table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">RP</th>
            </tr>
          </thead>
          <tbody>
            {series.slice(1).map(([t, rp], i) => (
              <tr key={i}>
                <td>{timeLabel(t)}</td>
                <td>{formatRp(rp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
