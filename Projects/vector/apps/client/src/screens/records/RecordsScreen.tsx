import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  AIRSPACE_IDS,
  DIFFICULTY_LEVELS,
  RECORD_BOARDS,
  RECORD_MINIMUMS,
  RECORD_PERIODS,
  type RecordBoard,
  type RecordEntry,
  type RecordPeriod,
  type Records,
} from '@vector/shared';
import { getRecords } from '../../api/records-api';
import { DIFFICULTY_LABELS } from '../../settings/difficulty';
import { airspaceLabel } from '../pilots/pilot-format';
import { formatRp } from '../scope/score-format';
import './records.css';

const BOARDS: Record<RecordBoard, { label: string; value: string; about: string }> = {
  career: {
    label: 'Career RP',
    value: 'RP',
    about: 'RP over every verified session.',
  },
  best: {
    label: 'Best session',
    value: 'RP',
    about: `The most RP in one session of ${RECORD_MINIMUMS.bestSessionSec / 60} minutes or more.`,
  },
  landings: { label: 'Landings', value: 'Landed', about: 'Arrivals landed.' },
  safety: {
    label: 'Safety',
    value: 'Losses per 100 flights',
    about: `Fewest losses of separation per 100 flights, with ${RECORD_MINIMUMS.safetyFlights} flights or more.`,
  },
  onTime: {
    label: 'On time',
    value: 'On time',
    about: `Most flights finished by their target time, with ${RECORD_MINIMUMS.onTimeFlights} timed flights or more.`,
  },
};

const PERIODS: Record<RecordPeriod, string> = {
  all: 'All time',
  month: 'This month',
  week: 'This week',
};

const formatValue = (board: RecordBoard, value: number) =>
  board === 'career' || board === 'best'
    ? formatRp(value)
    : board === 'safety'
      ? value.toFixed(2)
      : board === 'onTime'
        ? `${value.toFixed(1)}%`
        : value.toLocaleString('en-US');

/** The leaderboards: verified sessions only. */
export function RecordsScreen() {
  const [params, setParams] = useSearchParams();
  const board = (RECORD_BOARDS as readonly string[]).includes(params.get('board') ?? '')
    ? (params.get('board') as RecordBoard)
    : 'career';
  const period = (RECORD_PERIODS as readonly string[]).includes(params.get('period') ?? '')
    ? (params.get('period') as RecordPeriod)
    : 'all';
  const airspace = AIRSPACE_IDS.find((id) => id === params.get('airspace'));
  const difficulty = DIFFICULTY_LEVELS.find((level) => level === params.get('difficulty'));
  const key = `${board}|${period}|${airspace ?? ''}|${difficulty ?? ''}`;
  const [loaded, setLoaded] = useState<{ key: string; records?: Records; error?: string }>();

  useEffect(() => {
    let cancelled = false;
    getRecords({
      board,
      period,
      ...(airspace ? { airspace } : {}),
      ...(difficulty ? { difficulty } : {}),
    })
      .then((records) => !cancelled && setLoaded({ key, records }))
      .catch(
        () => !cancelled && setLoaded({ key, error: "Couldn't load the records. Try again." }),
      );
    return () => {
      cancelled = true;
    };
  }, [board, period, airspace, difficulty, key]);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    setParams(next, { replace: true });
  };

  const current = loaded?.key === key ? loaded : undefined;
  const records = current?.records;
  const about = BOARDS[board];
  const youOutside = records?.you && !records.entries.some((e) => e.handle === records.you!.handle);

  return (
    <div className="site-page records-page">
      <h1>Records</h1>
      <p className="site-page__lede">
        The best controllers on Vector. Only sessions the server has replayed and verified count.
      </p>

      <nav className="records-boards" aria-label="Boards">
        {RECORD_BOARDS.map((id) => (
          <button
            key={id}
            type="button"
            className="records-boards__tab"
            aria-current={board === id ? 'page' : undefined}
            onClick={() => update({ board: id === 'career' ? undefined : id })}
          >
            {BOARDS[id].label}
          </button>
        ))}
      </nav>

      <div className="records-filters">
        <div className="records-periods" role="radiogroup" aria-label="Period">
          {RECORD_PERIODS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={period === id}
              onClick={() => update({ period: id === 'all' ? undefined : id })}
            >
              {PERIODS[id]}
            </button>
          ))}
        </div>
        <select
          className="records-select"
          aria-label="Airspace"
          value={airspace ?? ''}
          onChange={(event) => update({ airspace: event.target.value || undefined })}
        >
          <option value="">All airspaces</option>
          {AIRSPACE_IDS.map((id) => (
            <option key={id} value={id}>
              {airspaceLabel(id)}
            </option>
          ))}
        </select>
        <select
          className="records-select"
          aria-label="Difficulty"
          value={difficulty ?? ''}
          onChange={(event) => update({ difficulty: event.target.value || undefined })}
        >
          <option value="">Any difficulty</option>
          {DIFFICULTY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {DIFFICULTY_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <p className="records-about">{about.about}</p>

      {current?.error && (
        <p className="records-empty" role="alert">
          {current.error}
        </p>
      )}
      {!current && <p className="records-empty">Loading…</p>}
      {records &&
        (records.entries.length === 0 ? (
          <p className="records-empty">
            No verified sessions qualify yet. Play one and it could be you.
          </p>
        ) : (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Pilot</th>
                  <th className="num">{about.value}</th>
                  <th className="num">Sessions</th>
                  {board === 'best' && <th>Session</th>}
                </tr>
              </thead>
              <tbody>
                {records.entries.map((entry) => (
                  <Row
                    key={entry.handle}
                    entry={entry}
                    board={board}
                    you={records.you?.handle === entry.handle}
                  />
                ))}
                {youOutside && (
                  <>
                    <tr className="records-table__gap" aria-hidden="true">
                      <td colSpan={board === 'best' ? 5 : 4}>⋯</td>
                    </tr>
                    <Row entry={records.you!} board={board} you />
                  </>
                )}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

function Row({ entry, board, you }: { entry: RecordEntry; board: RecordBoard; you: boolean }) {
  return (
    <tr data-you={you ? 'true' : undefined} data-podium={entry.rank <= 3 ? entry.rank : undefined}>
      <td className="num records-table__rank">{entry.rank}</td>
      <td>
        <Link to={`/pilots/${entry.handle}`} className="records-pilot">
          <span>{entry.displayName}</span>
          <span className="records-pilot__handle">
            @{entry.handle}
            {you && ' · you'}
          </span>
        </Link>
      </td>
      <td className="num records-table__value">{formatValue(board, entry.value)}</td>
      <td className="num">{entry.sessions}</td>
      {board === 'best' && (
        <td>{entry.resultId && <Link to={`/results/${entry.resultId}`}>View</Link>}</td>
      )}
    </tr>
  );
}
