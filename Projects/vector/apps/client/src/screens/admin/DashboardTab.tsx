import { useEffect, useState } from 'react';
import type { AdminStats, StatsRange } from '@vector/shared';
import { getAdminStats } from '../../api/admin-api';
import { findAirspace } from '../../airspaces/registry';
import { BreakdownBars, ChartCard, StatTile } from '../../components/charts/ChartParts';
import { ChartTable, Legend, TimeChart, type Series } from '../../components/charts/TimeChart';
import { compact } from '../../components/charts/chart-scale';
import { difficultyLabel } from '../pilots/pilot-format';
import { errorMessage } from './admin-format';

const RANGES: { id: StatsRange; label: string; compared: string }[] = [
  { id: '7d', label: '7 days', compared: 'the 7 days before' },
  { id: '30d', label: '30 days', compared: 'the 30 days before' },
  { id: '90d', label: '90 days', compared: 'the 90 days before' },
  { id: '1y', label: '1 year', compared: 'the year before' },
  { id: 'all', label: 'All time', compared: '' },
];

const hours = (value: number) =>
  value >= 10
    ? compact(Math.round(value))
    : value.toLocaleString('en-US', { maximumFractionDigits: 1 });

/** Charts and trends: how Vector is doing over a period, and what's happening now. */
export function DashboardTab({ onOpen }: { onOpen: (tab: 'community') => void }) {
  const [range, setRange] = useState<StatsRange>('30d');
  const [stats, setStats] = useState<AdminStats | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAdminStats(range)
      .then((loaded) => {
        if (cancelled) return;
        setStats(loaded);
        setError(undefined);
      })
      .catch((caught: unknown) => !cancelled && setError(errorMessage(caught)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, reload]);

  const choose = (next: StatsRange) => {
    setLoading(true);
    setRange(next);
  };
  const compared = RANGES.find((r) => r.id === range)?.compared ?? '';
  const per = stats?.bucket === 'week' ? 'week' : 'day';

  const line = (key: keyof AdminStats['series'], label: string, color: string): Series => ({
    key,
    label,
    color,
    values: stats?.series[key] ?? [],
  });

  const charts = stats && [
    {
      title: 'Active pilots',
      description: `Pilots who signed in or played, each ${per}`,
      kind: 'line' as const,
      series: [line('activePilots', 'Active pilots', 'var(--chart-single)')],
    },
    {
      title: 'New pilots',
      description: `Accounts created and emails verified, each ${per}`,
      kind: 'line' as const,
      series: [
        line('signups', 'New accounts', 'var(--chart-1)'),
        line('verifiedEmails', 'Emails verified', 'var(--chart-2)'),
      ],
    },
    {
      title: 'Sessions played',
      description: `Sessions started, each ${per}`,
      kind: 'columns' as const,
      series: [line('sessions', 'Sessions', 'var(--chart-single)')],
    },
    {
      title: 'Hours flown',
      description: `Sim time played, each ${per}`,
      kind: 'line' as const,
      series: [line('simHours', 'Hours', 'var(--chart-single)')],
      format: hours,
    },
    {
      title: 'Verification',
      description: `Sessions by how their replay check came out, by the ${per} played`,
      kind: 'columns' as const,
      series: [
        line('resultsVerified', 'Verified', 'var(--chart-1)'),
        line('resultsFailed', 'Failed', 'var(--chart-2)'),
      ],
    },
    {
      title: 'Community',
      description: `Threads, posts and reports, each ${per}`,
      kind: 'line' as const,
      series: [
        line('posts', 'Posts', 'var(--chart-1)'),
        line('threads', 'Threads', 'var(--chart-2)'),
        line('reports', 'Reports', 'var(--chart-3)'),
      ],
    },
  ];

  return (
    <div className="admin-dashboard" data-loading={loading || undefined}>
      <div className="admin-dashboard__filters">
        <div className="admin-segmented" role="radiogroup" aria-label="Period">
          {RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={range === option.id}
              onClick={() => choose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="admin-muted admin-dashboard__updated">
          {stats &&
            `Updated ${new Date(stats.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · UTC ${per}s`}
        </span>
        <button
          type="button"
          className="admin-button"
          onClick={() => {
            setLoading(true);
            setReload((n) => n + 1);
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!stats && !error && <p className="admin-muted">Loading…</p>}

      {stats && charts && (
        <>
          <ul className="admin-now" aria-label="Right now">
            <li>
              <span className="admin-now__dot" aria-hidden="true" />
              <strong>{stats.now.online}</strong> online now
            </li>
            <li>
              <button type="button" className="admin-link" onClick={() => onOpen('community')}>
                <strong>{stats.now.openReports}</strong> open report
                {stats.now.openReports === 1 ? '' : 's'}
              </button>
            </li>
            <li>
              <strong>{stats.now.pendingResults}</strong> result
              {stats.now.pendingResults === 1 ? '' : 's'} waiting to verify
            </li>
            <li>
              <strong>{stats.now.verifiedUsers.toLocaleString('en-US')}</strong> of{' '}
              {stats.now.users.toLocaleString('en-US')} pilots verified
            </li>
          </ul>

          <dl className="admin-stat-tiles">
            {(
              [
                ['activePilots', 'Active pilots', compact],
                ['signups', 'New pilots', compact],
                ['sessions', 'Sessions played', compact],
                ['simHours', 'Hours flown', hours],
                ['posts', 'Community posts', compact],
              ] as const
            ).map(([key, label, format]) => (
              <StatTile
                key={key}
                label={label}
                current={stats.totals[key].current}
                previous={stats.totals[key].previous}
                period={compared}
                trend={stats.series[key]}
                format={format}
              />
            ))}
          </dl>

          <div className="admin-charts">
            {charts.map((chart) => (
              <ChartCard
                key={chart.title}
                title={chart.title}
                description={chart.description}
                legend={<Legend series={chart.series} kind={chart.kind} />}
                chart={
                  <TimeChart
                    buckets={stats.buckets}
                    series={chart.series}
                    kind={chart.kind}
                    label={`${chart.title}: ${chart.description}`}
                    {...('format' in chart ? { format: chart.format } : {})}
                  />
                }
                table={
                  <ChartTable
                    buckets={stats.buckets}
                    series={chart.series}
                    caption={chart.title}
                    {...('format' in chart ? { format: chart.format } : {})}
                  />
                }
              />
            ))}

            <ChartCard
              title="Airspaces played"
              description="Sessions in each airspace this period, with hours flown"
              chart={
                <BreakdownBars
                  rows={stats.airspaces.map((a) => ({
                    key: a.id,
                    label: findAirspace(a.id)?.name ?? a.id,
                    value: a.sessions,
                    note: `${hours(a.simHours)} h`,
                  }))}
                />
              }
              table={
                <BreakdownTable
                  caption="Airspaces played"
                  columns={['Airspace', 'Sessions', 'Hours']}
                  rows={stats.airspaces.map((a) => [
                    findAirspace(a.id)?.name ?? a.id,
                    compact(a.sessions),
                    hours(a.simHours),
                  ])}
                />
              }
            />
            <ChartCard
              title="Difficulty"
              description="Sessions at each difficulty this period"
              chart={
                <BreakdownBars
                  rows={stats.difficulties.map((d) => ({
                    key: d.difficulty ?? 'none',
                    label: difficultyLabel(d.difficulty) || 'Not recorded',
                    value: d.sessions,
                  }))}
                />
              }
              table={
                <BreakdownTable
                  caption="Difficulty"
                  columns={['Difficulty', 'Sessions']}
                  rows={stats.difficulties.map((d) => [
                    difficultyLabel(d.difficulty) || 'Not recorded',
                    compact(d.sessions),
                  ])}
                />
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={column} scope="col" className={i > 0 ? 'num' : undefined}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="num">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
