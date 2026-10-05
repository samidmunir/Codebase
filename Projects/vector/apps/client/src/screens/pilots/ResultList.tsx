import { Link } from 'react-router';
import type { ResultSummary } from '@vector/shared';
import { formatDateTime } from '../../format/dates';
import { formatRp } from '../scope/score-format';
import { airspaceLabel, difficultyLabel, formatHours, VERIFICATION } from './pilot-format';

/** Sessions, newest first, each opening its overview. */
export function ResultList({ results }: { results: readonly ResultSummary[] }) {
  return (
    <ol className="result-list">
      {results.map((result) => {
        const verification = VERIFICATION[result.verification];
        const losses = result.stats.separationLosses + result.stats.nearMidAirs;
        return (
          <li key={result.id}>
            <Link to={`/results/${result.id}`} className="result-row">
              <span className="result-row__when">{formatDateTime(result.playedAt)}</span>
              <span className="result-row__where">
                {airspaceLabel(result.airspaceId)}
                {result.difficulty && (
                  <span className="pilot-muted"> · {difficultyLabel(result.difficulty)}</span>
                )}
              </span>
              <span className="result-row__numbers">
                {formatHours(result.simTimeSec)} · {result.stats.arrivals} landed
                {losses > 0 && (
                  <span data-sign="minus">
                    {' '}
                    · {losses} loss{losses === 1 ? '' : 'es'}
                  </span>
                )}
              </span>
              <span className="result-row__rp" data-sign={result.rp < 0 ? 'minus' : undefined}>
                {formatRp(result.rp)}
              </span>
              <span className="pilot-pill" data-tone={verification.tone} title={verification.title}>
                {verification.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
