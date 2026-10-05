import { useEffect, useState, type ReactNode } from 'react';
import {
  REGISTRATION_MODES,
  type AdminSiteSettings,
  type RegistrationMode,
  type SiteSettingKey,
  type SiteSettings,
} from '@vector/shared';
import { getAdminSite, updateAdminSite } from '../../api/site-api';
import { refreshSiteStatus } from '../../site/site-status';
import { errorMessage, formatAgo } from './admin-format';

const REGISTRATION_LABEL: Record<RegistrationMode, string> = {
  open: 'Open',
  invite: 'Invite only',
  closed: 'Closed',
};

const REGISTRATION_HELP: Record<RegistrationMode, string> = {
  open: 'Anyone can create an account.',
  invite: 'Only with an invite code (Beta tab). Others can join the waitlist.',
  closed: 'Nobody can create an account; the page shows the message below.',
};

const REGISTRATION_DONE: Record<RegistrationMode, string> = {
  open: 'Registration is open.',
  invite: 'Registration is invite only.',
  closed: 'Registration is closed.',
};

/** One switch's card: what it does, when it last changed, and Save. */
function SwitchCard({
  title,
  description,
  changed,
  dirty,
  busy,
  onSave,
  children,
}: {
  title: string;
  description: string;
  changed: AdminSiteSettings['changed'][SiteSettingKey];
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <section className="admin-card admin-switch-card" aria-label={title}>
      <header className="admin-card__header">
        <div>
          <h2>{title}</h2>
          <p className="admin-muted">{description}</p>
        </div>
      </header>
      {children}
      <div className="admin-form__actions admin-switch-card__footer">
        <span className="admin-muted">
          {changed
            ? `Changed ${formatAgo(changed.at)}${changed.by ? ` by ${changed.by}` : ''}`
            : 'Never changed'}
        </span>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={busy || !dirty}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </section>
  );
}

/** Site-wide switches: registration, the beta, a banner on every page, and the community's posting. */
export function SiteTab() {
  const [saved, setSaved] = useState<AdminSiteSettings | undefined>(undefined);
  const [draft, setDraft] = useState<SiteSettings | undefined>(undefined);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'alert'; text: string }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAdminSite()
      .then((loaded) => {
        setSaved(loaded);
        setDraft(loaded.settings);
      })
      .catch((caught: unknown) => setNotice({ tone: 'alert', text: errorMessage(caught) }));
  }, []);

  if (!saved || !draft)
    return notice ? (
      <p className="admin-error" role="alert">
        {notice.text}
      </p>
    ) : (
      <p className="admin-muted">Loading…</p>
    );

  const dirty = (key: SiteSettingKey) =>
    JSON.stringify(draft[key]) !== JSON.stringify(saved.settings[key]);
  const save = async (key: SiteSettingKey, done: string) => {
    setBusy(true);
    setNotice(undefined);
    try {
      const next = await updateAdminSite({ [key]: draft[key] });
      setSaved(next);
      setDraft({ ...draft, [key]: next.settings[key] });
      setNotice({ tone: 'ok', text: done });
      refreshSiteStatus();
    } catch (caught) {
      setNotice({ tone: 'alert', text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };
  const set = <K extends SiteSettingKey>(key: K, value: Partial<SiteSettings[K]>) =>
    setDraft({ ...draft, [key]: { ...draft[key], ...value } });

  return (
    <div className="admin-site">
      {notice && (
        <p className={notice.tone === 'ok' ? 'admin-notice' : 'admin-error'} role="status">
          {notice.text}
        </p>
      )}
      <div className="admin-site__grid">
        <SwitchCard
          title="Registration"
          description="Who can create an account. Admins can always create them from Users."
          changed={saved.changed.registration}
          dirty={dirty('registration')}
          busy={busy}
          onSave={() => void save('registration', REGISTRATION_DONE[draft.registration.mode])}
        >
          <div className="admin-segmented" role="radiogroup" aria-label="Registration">
            {REGISTRATION_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={draft.registration.mode === mode}
                onClick={() => set('registration', { mode })}
              >
                {REGISTRATION_LABEL[mode]}
              </button>
            ))}
          </div>
          <p className="admin-muted">{REGISTRATION_HELP[draft.registration.mode]}</p>
          <label className="admin-site__field">
            Message on the registration page while it’s closed
            <textarea
              className="admin-input"
              rows={2}
              maxLength={300}
              placeholder="We’re not creating new accounts right now. Check back soon."
              value={draft.registration.message}
              onChange={(event) => set('registration', { message: event.target.value })}
            />
          </label>
        </SwitchCard>

        <SwitchCard
          title="Beta"
          description="Marks Vector as a beta: a Beta badge by the logo, and the waitlist on the registration page while it’s closed."
          changed={saved.changed.beta}
          dirty={dirty('beta')}
          busy={busy}
          onSave={() =>
            void save('beta', draft.beta.enabled ? 'Vector is in beta.' : 'The beta badge is off.')
          }
        >
          <label className="admin-switch">
            <input
              type="checkbox"
              role="switch"
              aria-label="Vector is in beta"
              checked={draft.beta.enabled}
              onChange={(event) => set('beta', { enabled: event.target.checked })}
            />
            <span className="admin-switch__track" aria-hidden="true" />
            <span className="admin-switch__label">{draft.beta.enabled ? 'Beta' : 'Off'}</span>
          </label>
        </SwitchCard>

        <SwitchCard
          title="Banner"
          description="A message across the top of every page, e.g. planned maintenance. Readers can dismiss it; a new message shows again."
          changed={saved.changed.banner}
          dirty={dirty('banner')}
          busy={busy}
          onSave={() =>
            void save('banner', draft.banner.enabled ? 'The banner is up.' : 'The banner is down.')
          }
        >
          <label className="admin-switch">
            <input
              type="checkbox"
              role="switch"
              aria-label="Show the banner"
              checked={draft.banner.enabled}
              onChange={(event) => set('banner', { enabled: event.target.checked })}
            />
            <span className="admin-switch__track" aria-hidden="true" />
            <span className="admin-switch__label">
              {draft.banner.enabled ? 'Showing' : 'Hidden'}
            </span>
          </label>
          <label className="admin-site__field">
            Message
            <textarea
              className="admin-input"
              rows={2}
              maxLength={300}
              placeholder="Vector will be down for maintenance at 22:00Z for about 15 minutes."
              value={draft.banner.message}
              onChange={(event) => set('banner', { message: event.target.value })}
            />
          </label>
          <div className="admin-segmented" role="radiogroup" aria-label="Tone">
            {(['info', 'warning'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={draft.banner.tone === tone}
                onClick={() => set('banner', { tone })}
              >
                {tone === 'info' ? 'Information' : 'Warning'}
              </button>
            ))}
          </div>
          {draft.banner.message.trim() && (
            <div className="site-notice admin-site__preview" data-tone={draft.banner.tone}>
              <span className="site-notice__icon" aria-hidden="true">
                {draft.banner.tone === 'warning' ? '!' : 'i'}
              </span>
              <span className="site-notice__text">{draft.banner.message}</span>
            </div>
          )}
        </SwitchCard>

        <SwitchCard
          title="Community"
          description="Read-only: players can read but not post, reply, react or report. Moderators and admins carry on."
          changed={saved.changed.community}
          dirty={dirty('community')}
          busy={busy}
          onSave={() =>
            void save(
              'community',
              draft.community.readOnly ? 'The community is read-only.' : 'The community is open.',
            )
          }
        >
          <label className="admin-switch">
            <input
              type="checkbox"
              role="switch"
              aria-label="Community is read-only"
              checked={draft.community.readOnly}
              onChange={(event) => set('community', { readOnly: event.target.checked })}
            />
            <span className="admin-switch__track" aria-hidden="true" />
            <span className="admin-switch__label">
              {draft.community.readOnly ? 'Read-only' : 'Open for posting'}
            </span>
          </label>
          <label className="admin-site__field">
            Message to players while it’s read-only
            <textarea
              className="admin-input"
              rows={2}
              maxLength={300}
              placeholder="The community is read-only for now. You can still read everything."
              value={draft.community.message}
              onChange={(event) => set('community', { message: event.target.value })}
            />
          </label>
        </SwitchCard>
      </div>
    </div>
  );
}
