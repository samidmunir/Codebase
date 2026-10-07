import { useEffect, useState } from 'react';
import {
  defaultScoring,
  SCORING_KEYS,
  SESSION_SETTINGS,
  scoringValuesSchema,
  type AdminScoring,
  type ScoringValues,
} from '@vector/shared';
import { getAdminScoring, updateAdminScoring } from '../../api/scoring-api';
import { SettingRow } from '../../components/settings/SettingControl';
import { errorMessage, formatAgo, formatDateTime } from './admin-format';

/**
 * The official RP scoring: every new session uses it, and players can't change it,
 * so the records compare like with like. Each save is a new version; sessions played
 * under the version it replaces keep counting for a week.
 */
export function ScoringTab() {
  const [scoring, setScoring] = useState<AdminScoring>();
  const [draft, setDraft] = useState<ScoringValues>();
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    getAdminScoring()
      .then((loaded) => {
        if (!current) return;
        setScoring(loaded);
        setDraft(scoringValuesSchema.parse(loaded.current.values));
      })
      .catch(
        (caught: unknown) => current && setNotice({ tone: 'alert', text: errorMessage(caught) }),
      );
    return () => {
      current = false;
    };
  }, [reload]);

  if (!scoring || !draft)
    return notice ? (
      <p className="admin-error" role="alert">
        {notice.text}
      </p>
    ) : (
      <p className="admin-muted">Loading…</p>
    );

  const saved = scoringValuesSchema.parse(scoring.current.values);
  const defaults = defaultScoring();
  const changed = SCORING_KEYS.filter((key) => draft[key] !== saved[key]);
  const save = async () => {
    setBusy(true);
    setNotice(undefined);
    try {
      await updateAdminScoring(draft);
      setNotice({
        tone: 'ok',
        text: `Saved: new sessions use it from now on (${changed.length} value${changed.length === 1 ? '' : 's'} changed).`,
      });
      setReload((n) => n + 1);
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-users__list">
      <section className="admin-card" aria-label="Official scoring">
        <header className="admin-card__header">
          <div>
            <h2>Official scoring</h2>
            <p className="admin-muted">
              The RP every session earns and loses, the same for every pilot. Players can’t change
              it, so the records stay fair. A change applies to sessions started after it; sessions
              under the previous version keep counting for a week.
            </p>
          </div>
        </header>
        <p className="admin-muted">
          {scoring.current.changedAt
            ? `Current version from ${formatDateTime(scoring.current.changedAt)}${scoring.current.changedBy ? ` by ${scoring.current.changedBy}` : ''}.`
            : 'The defaults: never changed.'}
        </p>
        <div className="admin-scoring">
          {SCORING_KEYS.map((key) => (
            <SettingRow
              key={key}
              settingKey={key}
              definition={SESSION_SETTINGS[key]}
              value={draft[key]}
              onChange={(value) => setDraft({ ...draft, [key]: value } as ScoringValues)}
              {...(draft[key] !== defaults[key]
                ? { onReset: () => setDraft({ ...draft, [key]: defaults[key] } as ScoringValues) }
                : {})}
            />
          ))}
        </div>
        {notice && (
          <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
            {notice.text}
          </p>
        )}
        <div className="admin-form__actions">
          <button
            type="button"
            className="admin-button"
            disabled={busy || changed.length === 0}
            onClick={() => setDraft(saved)}
          >
            Undo changes
          </button>
          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={busy || changed.length === 0}
            onClick={() => void save()}
          >
            {changed.length > 0
              ? `Save ${changed.length} change${changed.length === 1 ? '' : 's'}`
              : 'Save'}
          </button>
        </div>
      </section>

      {scoring.versions.length > 0 && (
        <section className="admin-card" aria-label="Earlier versions">
          <h2>Versions</h2>
          <ul className="admin-scoring__versions">
            {scoring.versions.map((version, index) => (
              <li key={version.id}>
                <span>{index === 0 ? 'Current' : `Version ${version.id}`}</span>
                <span className="admin-muted">
                  {formatAgo(version.changedAt)}
                  {version.changedBy ? ` · ${version.changedBy}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="admin-muted">Every change is also in the Activity log, value by value.</p>
        </section>
      )}
    </div>
  );
}
