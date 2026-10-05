import { useState, type ReactNode } from 'react';
import { compact } from './chart-scale';
import './charts.css';

/** A chart with its title, legend, and a switch to see the numbers as a table. */
export function ChartCard({
  title,
  description,
  legend,
  chart,
  table,
  wide = false,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  wide?: boolean;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="chart-card" data-wide={wide || undefined} aria-label={title}>
      <header className="chart-card__header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <button
          type="button"
          className="chart-card__toggle"
          aria-pressed={asTable}
          onClick={() => setAsTable((shown) => !shown)}
        >
          {asTable ? 'Chart' : 'Table'}
        </button>
      </header>
      {!asTable && legend}
      {asTable ? table : chart}
    </section>
  );
}

/** Up is good for every number on the dashboard. */
function Delta({
  current,
  previous,
  period,
}: {
  current: number;
  previous: number;
  period: string;
}) {
  if (previous === 0)
    return current === 0 ? (
      <span className="stat-tile__delta">No change vs {period}</span>
    ) : (
      <span className="stat-tile__delta" data-direction="up">
        <span aria-hidden="true">▲ </span>New vs {period}
      </span>
    );
  const change = ((current - previous) / previous) * 100;
  const direction = Math.abs(change) < 0.5 ? 'flat' : change > 0 ? 'up' : 'down';
  // A big jump from a small start reads better as a multiple than as thousands of percent.
  const ratio = current / previous;
  if (ratio >= 10)
    return (
      <span className="stat-tile__delta" data-direction="up">
        <span aria-hidden="true">▲ </span>
        {Math.round(ratio).toLocaleString('en-US')}× {period}
      </span>
    );
  return (
    <span className="stat-tile__delta" data-direction={direction}>
      <span aria-hidden="true">
        {direction === 'up' ? '▲ ' : direction === 'down' ? '▼ ' : '– '}
      </span>
      {direction === 'flat'
        ? `No change vs ${period}`
        : `${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(change).toFixed(0)}% vs ${period}`}
    </span>
  );
}

/** A headline number, how it compares with the period before, and its trend. */
export function StatTile({
  label,
  current,
  previous,
  period,
  trend,
  format = compact,
}: {
  label: string;
  current: number;
  previous: number | null;
  /** What it's compared with, e.g. "the 30 days before". */
  period: string;
  trend: number[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...trend);
  const step = trend.length > 1 ? 100 / (trend.length - 1) : 0;
  const points = trend.map((value, i) => `${i * step},${30 - (value / max) * 28}`).join(' ');
  return (
    <div className="stat-tile">
      <dt>{label}</dt>
      <dd className="stat-tile__value">{format(current)}</dd>
      <dd>
        {previous === null ? (
          <span className="stat-tile__delta">Since the start</span>
        ) : (
          <Delta current={current} previous={previous} period={period} />
        )}
      </dd>
      {trend.length > 1 && (
        <dd className="stat-tile__trend" aria-hidden="true">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none">
            <polyline points={points} />
            <circle
              cx={(trend.length - 1) * step}
              cy={30 - ((trend.at(-1) ?? 0) / max) * 28}
              r={2.5}
            />
          </svg>
        </dd>
      )}
    </div>
  );
}

/** Shares of a whole as horizontal bars, the value at each bar's end. */
export function BreakdownBars({
  rows,
  format = compact,
  empty = 'Nothing yet in this period.',
}: {
  rows: { key: string; label: string; value: number; note?: string }[];
  format?: (value: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="chart-empty">{empty}</p>;
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="breakdown">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="breakdown__label">{row.label}</span>
          <span className="breakdown__track">
            <span className="breakdown__rail">
              <span className="breakdown__bar" style={{ width: `${(row.value / max) * 100}%` }} />
            </span>
            <span className="breakdown__value">
              {format(row.value)}
              {row.note && <span className="breakdown__note"> · {row.note}</span>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
