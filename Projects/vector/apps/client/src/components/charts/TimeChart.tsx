import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { compact, labelledIndexes, niceTicks, shortDate } from './chart-scale';
import './charts.css';

export interface Series {
  key: string;
  label: string;
  /** A validated chart color (see charts.css). */
  color: string;
  values: number[];
}

const HEIGHT = 200;
const MARGIN = { top: 12, right: 16, bottom: 26, left: 44 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

/** A rect with only its top corners rounded: a column's data end. */
function topRounded(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

/** Follows its container's width. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Numbers over time: lines, or stacked columns. A crosshair (or the column under
 * the pointer) shows every series' value at that date; arrow keys do the same.
 */
export function TimeChart({
  buckets,
  series,
  kind = 'line',
  format = compact,
  label,
}: {
  buckets: string[];
  series: Series[];
  kind?: 'line' | 'columns';
  format?: (value: number) => string;
  /** What the chart shows, for screen readers. */
  label: string;
}) {
  const { ref, width } = useWidth();
  const [hover, setHover] = useState<number | undefined>(undefined);
  const titleId = useId();
  const n = buckets.length;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const totals = buckets.map((_, i) =>
    kind === 'columns'
      ? series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)
      : Math.max(0, ...series.map((s) => s.values[i] ?? 0)),
  );
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks.at(-1) ?? 1;
  const y = (value: number) => MARGIN.top + plotHeight - (value / top) * plotHeight;
  const band = n > 0 ? plotWidth / n : 0;
  const x = (i: number) =>
    kind === 'columns'
      ? MARGIN.left + band * (i + 0.5)
      : MARGIN.left + (n > 1 ? (plotWidth * i) / (n - 1) : plotWidth / 2);
  const shown = labelledIndexes(n, Math.max(2, Math.floor(plotWidth / 80)));

  const nearest = (event: PointerEvent<SVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    let best = 0;
    for (let i = 1; i < n; i += 1) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowRight') setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (event.key === 'ArrowLeft') setHover((i) => Math.max(0, (i ?? n) - 1));
    else if (event.key === 'Escape') setHover(undefined);
    else return;
    event.preventDefault();
  };

  const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP * 2, band * 0.72));
  const single = series.length === 1;

  return (
    <div className="time-chart" ref={ref}>
      {width > 0 && n > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(undefined)}
          onPointerMove={(event) => setHover(nearest(event))}
          onPointerLeave={() => setHover(undefined)}
        >
          <title id={titleId}>{label}. Use the arrow keys to read each date.</title>
          {ticks.map((tick) => (
            <g key={tick} className="time-chart__grid">
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {format(tick)}
              </text>
            </g>
          ))}
          {[...shown].map((i) => (
            <text
              key={i}
              className="time-chart__x"
              x={x(i)}
              y={HEIGHT - 6}
              textAnchor={
                i === 0 && kind === 'line'
                  ? 'start'
                  : i === n - 1 && kind === 'line'
                    ? 'end'
                    : 'middle'
              }
            >
              {shortDate(buckets[i]!)}
            </text>
          ))}

          {kind === 'columns'
            ? buckets.map((_, i) => {
                let base = 0;
                const visible = series.filter((s) => (s.values[i] ?? 0) > 0);
                return (
                  <g key={i} className="time-chart__column" data-hover={hover === i || undefined}>
                    {visible.map((s, index) => {
                      const value = s.values[i] ?? 0;
                      const y0 = y(base);
                      const y1 = y(base + value);
                      base += value;
                      // The surface gap between stacked segments comes off each segment's top.
                      const gap = index < visible.length - 1 ? GAP : 0;
                      const height = Math.max(0, y0 - y1 - gap);
                      const left = x(i) - barWidth / 2;
                      return index === visible.length - 1 ? (
                        <path
                          key={s.key}
                          d={topRounded(left, y1, barWidth, height, RADIUS)}
                          fill={s.color}
                        />
                      ) : (
                        <rect
                          key={s.key}
                          x={left}
                          y={y1 + gap}
                          width={barWidth}
                          height={height}
                          fill={s.color}
                        />
                      );
                    })}
                  </g>
                );
              })
            : series.map((s) => {
                const points = s.values.map((value, i) => `${x(i)},${y(value)}`);
                return (
                  <g key={s.key}>
                    {single && (
                      <path
                        d={`M${x(0)},${y(0)}L${points.join('L')}L${x(n - 1)},${y(0)}Z`}
                        fill={s.color}
                        opacity={0.1}
                      />
                    )}
                    <path
                      d={`M${points.join('L')}`}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      className="time-chart__dot"
                      cx={x(hover ?? n - 1)}
                      cy={y(s.values[hover ?? n - 1] ?? 0)}
                      r={4}
                      fill={s.color}
                    />
                  </g>
                );
              })}

          {hover !== undefined && kind === 'line' && (
            <line
              className="time-chart__crosshair"
              x1={x(hover)}
              x2={x(hover)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
            />
          )}
        </svg>
      )}
      {hover !== undefined && (
        <div
          className="chart-tooltip"
          role="status"
          style={{
            left: Math.min(Math.max(x(hover), 90), width - 90),
          }}
        >
          <p className="chart-tooltip__date">{shortDate(buckets[hover]!)}</p>
          {series.map((s) => (
            <p key={s.key} className="chart-tooltip__row">
              <span className="chart-key chart-key--line" style={{ background: s.color }} />
              <strong>{format(s.values[hover] ?? 0)}</strong>
              <span>{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** The legend: a key for each series (lines for line charts, swatches for columns). */
export function Legend({ series, kind }: { series: Series[]; kind: 'line' | 'columns' }) {
  if (series.length < 2) return null;
  return (
    <ul className="chart-legend">
      {series.map((s) => (
        <li key={s.key}>
          <span
            className={`chart-key ${kind === 'line' ? 'chart-key--line' : 'chart-key--box'}`}
            style={{ background: s.color }}
            aria-hidden="true"
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Every value in a table: the chart's data without the chart. */
export function ChartTable({
  buckets,
  series,
  format = compact,
  caption,
}: {
  buckets: string[];
  series: Series[];
  format?: (value: number) => string;
  caption: string;
}) {
  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="num">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket, i) => (
            <tr key={bucket}>
              <th scope="row">{shortDate(bucket)}</th>
              {series.map((s) => (
                <td key={s.key} className="num">
                  {format(s.values[i] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
