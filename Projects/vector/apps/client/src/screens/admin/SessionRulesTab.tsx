import { useEffect, useState } from 'react';
import {
  defaultOfficial,
  OFFICIAL_GROUPS,
  OFFICIAL_KEYS,
  officialValuesSchema,
  SESSION_SETTINGS,
  type AdminSessionRules,
  type OfficialValues,
} from '@vector/shared';
import { getAdminSessionRules, updateSessionRules } from '../../api/session-rules-api';
import { SettingRow } from '../../components/settings/SettingControl';
import { errorMessage, formatAgo, formatDateTime } from './admin-format';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The official settings: scoring, the rules and the conditions. Every new session uses
 * them and players can't change them, so the records compare like with like. Each save
 * is a new version; sessions played under the one it replaces keep counting for a week.
 */
export function SessionRulesTab() {
  const [rules, setRules] = useState<AdminSessionRules>();
  const [draft, setDraft] = useState<OfficialValues>();
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    getAdminSessionRules()
      .then((loaded) => {
        if (!current) return;
        setRules(loaded);
        setDraft(officialValuesSchema.parse(loaded.current.values));
      })
      .catch(
        (caught: unknown) => current && setNotice({ tone: 'alert', text: errorMessage(caught) }),
      );
    return () => {
      current = false;
    };
  }, [reload]);

  if (!rules || !draft)
    return notice ? (
      <p className="admin-error" role="alert">
        {notice.text}
      </p>
    ) : (
      <p className="admin-muted">Loading…</p>
    );

  const saved = officialValuesSchema.parse(rules.current.values);
  const defaults = defaultOfficial();
  const changed = OFFICIAL_KEYS.filter((key) => !same(draft[key], saved[key]));
  const save = async () => {
    setBusy(true);
    setNotice(undefined);
    try {
      await updateSessionRules(draft);
      setNotice({
        tone: 'ok',
        text: `Saved: new sessions use them from now on (${changed.length} value${changed.length === 1 ? '' : 's'} changed).`,
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
      <section className="admin-card" aria-label="Session rules">
        <header className="admin-card__header">
          <div>
            <h2>Session rules</h2>
            <p className="admin-muted">
              Scoring, the rules and the conditions every session uses, the same for every pilot.
              Players choose only the difficulty, live or random wind, sim speeds and their aids. A
              change applies to sessions started after it; sessions under the previous version keep
              counting for a week.
            </p>
          </div>
        </header>
        <p className="admin-muted">
          {rules.current.changedAt
            ? `Current version from ${formatDateTime(rules.current.changedAt)}${rules.current.changedBy ? ` by ${rules.current.changedBy}` : ''}.`
            : 'The defaults: never changed.'}
        </p>

        {OFFICIAL_GROUPS.map((group, index) => {
          const custom = group.keys.filter((key) => !same(draft[key], defaults[key])).length;
          return (
            <details key={group.label} className="admin-rules__group" open={index === 0}>
              <summary>
                <span>{group.label}</span>
                <span className="admin-muted">
                  {group.keys.length} setting{group.keys.length === 1 ? '' : 's'}
                  {custom > 0 ? ` · ${custom} not the default` : ''}
                </span>
              </summary>
              <div className="admin-scoring">
                {group.keys.map((key) => (
                  <SettingRow
                    key={key}
                    settingKey={key}
                    definition={SESSION_SETTINGS[key]}
                    value={draft[key]}
                    onChange={(value) => setDraft({ ...draft, [key]: value })}
                    {...(!same(draft[key], defaults[key])
                      ? { onReset: () => setDraft({ ...draft, [key]: defaults[key] }) }
                      : {})}
                  />
                ))}
              </div>
            </details>
          );
        })}

        {notice && (
          <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
            {notice.text}
          </p>
        )}
        <div className="admin-form__actions admin-rules__save">
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

      {rules.versions.length > 0 && (
        <section className="admin-card" aria-label="Earlier versions">
          <h2>Versions</h2>
          <ul className="admin-scoring__versions">
            {rules.versions.map((version, index) => (
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
