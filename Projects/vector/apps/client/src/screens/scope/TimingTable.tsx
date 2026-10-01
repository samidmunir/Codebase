import { formatDuration, type FlightKind, type TimingStats } from '@vector/sim-core';
import { FLIGHT_KIND_LABELS, formatVsTarget } from './timing-format';

const KINDS: FlightKind[] = ['arrival', 'departure', 'transit'];

/** Per kind of flight: how many were finished, the average time and against target, on time. */
export function TimingTable({
  stats,
}: {
  stats: Readonly<Partial<Record<FlightKind, Readonly<TimingStats>>>>;
}) {
  return (
    <table className="timing-table">
      <thead>
        <tr>
          <th scope="col">Flights</th>
          <th scope="col" title="Landed or handed off">
            Done
          </th>
          <th scope="col" title="Average time from when it became yours">
            Avg time
          </th>
          <th scope="col" title="Average against the target time (− is ahead)">
            vs target
          </th>
          <th scope="col">On time</th>
        </tr>
      </thead>
      <tbody>
        {KINDS.map((kind) => {
          const s = stats[kind];
          return (
            <tr key={kind}>
              <th scope="row">{FLIGHT_KIND_LABELS[kind]}</th>
              <td>{s?.count ?? 0}</td>
              <td>{s?.count ? formatDuration(s.totalSec / s.count) : '–'}</td>
              <td
                data-sign={
                  s?.count ? (s.totalSec > s.totalTargetSec ? 'minus' : 'plus') : undefined
                }
              >
                {s?.count ? formatVsTarget((s.totalSec - s.totalTargetSec) / s.count) : '–'}
              </td>
              <td>{s?.count ? `${Math.round((s.onTime / s.count) * 100)}%` : '–'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
