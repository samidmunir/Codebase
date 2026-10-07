import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { ResultDetail } from '@vector/shared';
import { sessionReportSchema, type SessionReport } from '@vector/sim-core';
import { ApiRequestError } from '../../api/api-client';
import { getResult } from '../../api/results-api';
import { formatDateTime } from '../../format/dates';
import { formatRp } from '../scope/score-format';
import { SessionReportView } from '../scope/SessionReportView';
import { airspaceLabel, difficultyLabel, formatHours, VERIFICATION } from './pilot-format';
import { usePageMeta } from '../../site/page-meta';
import { useAuth } from '../../auth/auth-store';
import { ShareButton } from '../../components/ShareButton';
import { JoinBanner } from '../../site/JoinBanner';
import { resultShare } from './share-result';
import './pilots.css';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; detail: ResultDetail; report: SessionReport };

/** A finished session's overview: the debrief as it was, kept for good. */
export function ResultScreen() {
  const { id = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const auth = useAuth();
  usePageMeta({
    title:
      state.kind === 'ready'
        ? `${state.detail.pilot.displayName} at ${airspaceLabel(state.detail.result.airspaceId)}`
        : 'Session result',
  });

  useEffect(() => {
    let cancelled = false;
    getResult(id)
      .then((detail) => {
        if (cancelled) return;
        const report = sessionReportSchema.safeParse(detail.report);
        setState(
          report.success
            ? { kind: 'ready', detail, report: report.data }
            : { kind: 'error', message: 'This session’s report can’t be shown.' },
        );
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiRequestError && caught.status === 404)
          setState({ kind: 'missing' });
        else setState({ kind: 'error', message: "Couldn't load this session. Try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === 'loading')
    return (
      <div className="site-page">
        <p className="pilot-muted">Loading…</p>
      </div>
    );
  if (state.kind === 'missing')
    return (
      <div className="site-empty">
        <h1>Not found</h1>
        <p>This session doesn’t exist, or its pilot keeps their profile private.</p>
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="site-page">
        <p role="alert">{state.message}</p>
      </div>
    );

  const { detail, report } = state;
  const { result, pilot } = detail;
  const verification = VERIFICATION[result.verification];
  const yours = auth.status === 'signedIn' && auth.user.handle === pilot.handle;
  return (
    <div className="site-page pilot-page">
      <JoinBanner />
      <header className="result-header">
        <div>
          <p className="result-header__eyebrow">
            <Link to={`/pilots/${pilot.handle}`}>
              {pilot.displayName} · @{pilot.handle}
            </Link>
          </p>
          <h1>{airspaceLabel(result.airspaceId)}</h1>
          <p className="pilot-muted">
            {formatDateTime(result.playedAt)} · {formatHours(result.simTimeSec)} of sim time
            {result.difficulty && ` · ${difficultyLabel(result.difficulty)}`}
          </p>
        </div>
        <div className="result-header__total">
          <span data-sign={result.rp < 0 ? 'minus' : undefined}>{formatRp(result.rp)}</span>
          <span className="pilot-pill" data-tone={verification.tone} title={verification.title}>
            {verification.label}
          </span>
        </div>
      </header>
      <div className="result-share">
        <ShareButton
          share={resultShare({
            id: result.id,
            airspaceId: result.airspaceId,
            rp: result.rp,
            by: yours ? 'you' : { handle: pilot.handle },
            version: `${Date.parse(result.updatedAt)}${result.verification[0]}`,
          })}
          label="Share this session"
          className="site-button site-button--primary"
        />
        {yours && (
          <Link to={`/community/general/new?result=${result.id}`} className="site-button">
            Discuss it in the community
          </Link>
        )}
      </div>
      <div className="pilot-card result-report">
        <SessionReportView report={report} flightsListed={10} lossesListed={20} />
      </div>
    </div>
  );
}
