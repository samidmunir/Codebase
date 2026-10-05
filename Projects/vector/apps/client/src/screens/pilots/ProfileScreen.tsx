import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import type { PilotProfile, ResultSummary } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import { getPilot, getPilotResults } from '../../api/results-api';
import { useAuth } from '../../auth/auth-store';
import { formatDate } from '../../format/dates';
import { RpChart } from '../scope/RpChart';
import { formatRp } from '../scope/score-format';
import {
  airspaceLabel,
  flightsOf,
  formatHours,
  initials,
  lossesPer100,
  onTimeRate,
} from './pilot-format';
import { ResultList } from './ResultList';
import { usePageMeta } from '../../site/page-meta';
import './pilots.css';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: PilotProfile };

/** `/me`: your own profile. */
export function MyProfileRedirect() {
  const auth = useAuth();
  return auth.status === 'signedIn' ? (
    <Navigate to={`/pilots/${auth.user.handle}`} replace />
  ) : null;
}

/** A pilot's career: totals, RP over time, each airspace, and every session. */
export function ProfileScreen() {
  const { handle = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  usePageMeta({ title: `@${handle}` });

  useEffect(() => {
    let cancelled = false;
    getPilot(handle)
      .then((profile) => !cancelled && setState({ kind: 'ready', profile }))
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiRequestError && caught.status === 404)
          setState({ kind: 'missing' });
        else setState({ kind: 'error', message: "Couldn't load this profile. Try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (state.kind === 'loading')
    return (
      <div className="site-page">
        <p className="pilot-muted">Loading…</p>
      </div>
    );
  if (state.kind === 'missing')
    return (
      <div className="site-empty">
        <h1>@{handle}</h1>
        <p>There’s no pilot with that handle.</p>
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="site-page">
        <p role="alert">{state.message}</p>
      </div>
    );

  const { profile } = state;
  if (profile.visibility === 'private')
    return (
      <div className="site-empty">
        <h1>@{profile.pilot.handle}</h1>
        <p>This pilot keeps their profile private.</p>
      </div>
    );
  return <PublicProfile key={profile.pilot.handle} profile={profile} />;
}

function PublicProfile({ profile }: { profile: Extract<PilotProfile, { visibility: 'public' }> }) {
  const { pilot, career, byAirspace, history } = profile;
  const [sessions, setSessions] = useState<ResultSummary[]>(profile.recent);
  const [total, setTotal] = useState(career.sessions);
  const [loadingMore, setLoadingMore] = useState(false);
  const losses = lossesPer100(career);
  const onTime = onTimeRate(career.stats);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getPilotResults(pilot.handle, sessions.length);
      setSessions((current) => [...current, ...page.results]);
      setTotal(page.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const tiles: { label: string; value: string; tone?: string | undefined; link?: string }[] = [
    { label: 'Career RP', value: formatRp(career.rp), tone: career.rp < 0 ? 'minus' : undefined },
    {
      label: 'Career rank',
      value: profile.careerRank ? `#${profile.careerRank}` : '–',
      link: '/records',
    },
    { label: 'Sessions', value: career.sessions.toLocaleString('en-US') },
    { label: 'Time controlled', value: formatHours(career.simTimeSec) },
    { label: 'Landed', value: career.stats.arrivals.toLocaleString('en-US') },
    {
      label: 'Handed off',
      value: (career.stats.departures + career.stats.overflights).toLocaleString('en-US'),
    },
    { label: 'On time', value: onTime === undefined ? '–' : `${onTime}%` },
    {
      label: 'Losses per 100 flights',
      value: losses === undefined ? '–' : losses.toFixed(1),
      tone: losses ? 'minus' : undefined,
    },
    { label: 'Go-arounds', value: career.stats.goArounds.toLocaleString('en-US') },
  ];

  return (
    <div className="site-page pilot-page">
      <header className="pilot-header">
        <span className="pilot-avatar" aria-hidden="true">
          {initials(pilot.displayName)}
        </span>
        <div className="pilot-header__who">
          <h1>{pilot.displayName}</h1>
          <p>
            @{pilot.handle} · joined {formatDate(pilot.joinedAt)}
          </p>
        </div>
        {pilot.isYou && (
          <div className="pilot-header__actions">
            {!pilot.isPublic && (
              <span className="pilot-pill" title="Only you can see this profile">
                Private
              </span>
            )}
            <Link to="/account" className="site-button">
              Edit profile
            </Link>
          </div>
        )}
      </header>

      <dl className="pilot-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="pilot-tile">
            <dt>{tile.label}</dt>
            <dd data-sign={tile.tone}>
              {tile.link ? <Link to={tile.link}>{tile.value}</Link> : tile.value}
            </dd>
          </div>
        ))}
      </dl>

      {career.sessions === 0 ? (
        <section className="pilot-card pilot-empty">
          <p>
            {pilot.isYou
              ? 'No sessions yet. Every session you play from now on builds your career here.'
              : 'No sessions yet.'}
          </p>
          {pilot.isYou && (
            <Link to="/play" className="site-button site-button--primary">
              Play
            </Link>
          )}
        </section>
      ) : (
        <>
          <section className="pilot-card" aria-labelledby="career-chart-title">
            <h2 id="career-chart-title">Career RP</h2>
            <RpChart
              points={history.map((point, i) => [i + 1, point.rp] as const)}
              durationSec={history.length}
              minSpan={1}
              subject="the career"
              xHeading="After session"
              formatX={(x) => {
                const point = history[Math.round(x) - 1];
                return point ? formatDate(point.at) : 'Start';
              }}
            />
          </section>

          <section className="pilot-card" aria-labelledby="airspaces-title">
            <h2 id="airspaces-title">By airspace</h2>
            <div className="pilot-table-wrap">
              <table className="pilot-table">
                <thead>
                  <tr>
                    <th>Airspace</th>
                    <th className="num">Sessions</th>
                    <th className="num">Time</th>
                    <th className="num">Flights</th>
                    <th className="num">RP</th>
                    <th className="num">Best session</th>
                  </tr>
                </thead>
                <tbody>
                  {byAirspace.map((row) => (
                    <tr key={row.airspaceId}>
                      <td>{airspaceLabel(row.airspaceId)}</td>
                      <td className="num">{row.sessions}</td>
                      <td className="num">{formatHours(row.simTimeSec)}</td>
                      <td className="num">{flightsOf(row.stats)}</td>
                      <td className="num">{formatRp(row.rp)}</td>
                      <td className="num">{formatRp(row.bestRp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pilot-card" aria-labelledby="sessions-title">
            <h2 id="sessions-title">Sessions</h2>
            <ResultList results={sessions} />
            {sessions.length < total && (
              <div className="pilot-more">
                <button
                  type="button"
                  className="site-button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  Show more ({total - sessions.length})
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
