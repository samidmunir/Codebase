import { formatDuration, sessionReport } from '@vector/sim-core';
import { useEffect, useMemo, useState } from 'react';
import { getAccount } from '../../api/account-api';
import { ShareButton } from '../../components/ShareButton';
import { resultShare } from '../pilots/share-result';
import type { ScopeSession } from '../../sim/scope-session';
import { formatRp } from './score-format';
import { SessionReportView } from './SessionReportView';

export type DebriefReason = { kind: 'saved'; name: string } | { kind: 'leaving' };

/**
 * How the session went: RP over time and its breakdown, timing per kind of
 * flight, separation, and the best and worst flights. Shown after a save
 * and before leaving the scope.
 */
export function DebriefDialog({
  session,
  reason,
  onKeepWorking,
  onSave,
  onLeave,
}: {
  session: ScopeSession;
  reason: DebriefReason;
  onKeepWorking: () => void;
  onSave: () => void;
  onLeave: () => void;
}) {
  // The report as it stands when the debrief opens.
  const report = useMemo(() => sessionReport(session.engine.toSnapshot().state), [session]);
  const durationSec = report.finalTick * report.tickSeconds;
  const leaving = reason.kind === 'leaving';
  // Sharing needs the session's result kept (it is, once it's a minute long) and a public profile.
  const [resultId, setResultId] = useState(session.resultId);
  const [profilePublic, setProfilePublic] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let current = true;
    void session.recordResult().then(() => current && setResultId(session.resultId));
    getAccount()
      .then((account) => current && setProfilePublic(account.profilePublic))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [session]);

  return (
    <div className="scope-dialog-backdrop" onMouseDown={onKeepWorking}>
      <section
        className="scope-dialog scope-dialog--debrief"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="debrief__header">
          <div>
            <p className="debrief__eyebrow">
              {reason.kind === 'saved'
                ? `Saved “${reason.name}”`
                : session.saved
                  ? session.saved.name
                  : 'This session'}
            </p>
            <h2 id="debrief-title">Session debrief</h2>
            <p className="scope-dialog__detail">
              {formatDuration(durationSec)} of sim time · {session.pack.airspace.facility}{' '}
              {session.pack.airspace.name}
            </p>
          </div>
          <p className="debrief__total" data-sign={report.total < 0 ? 'minus' : 'plus'}>
            {formatRp(report.total)}
          </p>
        </header>

        <SessionReportView report={report} />

        <div className="scope-dialog__actions">
          {resultId && profilePublic && (
            <div className="debrief__share">
              <ShareButton
                share={resultShare({
                  id: resultId,
                  airspaceId: session.pack.airspace.id,
                  rp: report.total,
                  by: 'you',
                })}
                className="scope-button"
                opens="up"
              />
            </div>
          )}
          {resultId && profilePublic === false && (
            <p className="debrief__share debrief__share-note">
              Your profile is private, so a shared link wouldn’t open for others. Make it public on
              your Account page to share sessions.
            </p>
          )}
          {leaving && (
            <button type="button" className="scope-button" onClick={onLeave}>
              Leave{session.saved ? '' : ' without saving'}
            </button>
          )}
          {leaving && (
            <button type="button" className="scope-button" onClick={onSave}>
              Save first
            </button>
          )}
          {!leaving && (
            <button type="button" className="scope-button" onClick={onLeave}>
              Back to start
            </button>
          )}
          <button
            type="button"
            className="scope-button scope-button--primary"
            onClick={onKeepWorking}
          >
            Keep working
          </button>
        </div>
      </section>
    </div>
  );
}
