import { useMemo, useState } from 'react';
import {
  defaultSettings,
  findKeybindingConflicts,
  USER_SETTINGS,
  type SettingDefinition,
  type UserSettings,
} from '@vector/shared';
import { useAuth } from '../../auth/auth-store';
import { SettingRow } from '../../components/settings/SettingControl';
import { userSettings, useUserSettings } from '../../settings/user-settings-store';
import './settings-view.css';

type UserKey = keyof UserSettings;

interface Section {
  id: string;
  label: string;
  description: string;
  keys: UserKey[];
}

const ALL_KEYS = Object.keys(USER_SETTINGS) as UserKey[];
const DEFAULTS = defaultSettings('user');
const definitionOf = (key: UserKey): SettingDefinition => USER_SETTINGS[key];

/** User settings grouped for the settings screen; keybindings get their own section. */
const SETTINGS_SECTIONS: Section[] = [
  {
    id: 'display',
    label: 'Display',
    description: 'How the scope, targets and data blocks look.',
    keys: ALL_KEYS.filter((key) => key.startsWith('display.')),
  },
  {
    id: 'map',
    label: 'Map',
    description: 'Video map layers and the real-world map underneath.',
    keys: ALL_KEYS.filter((key) => key.startsWith('map.')),
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Alert tones and interface sounds.',
    keys: ALL_KEYS.filter((key) => key.startsWith('audio.')),
  },
  {
    id: 'controls',
    label: 'Controls',
    description: 'Mouse, zoom and command menu behavior.',
    keys: ALL_KEYS.filter(
      (key) => key.startsWith('controls.') && definitionOf(key).kind !== 'keybinding',
    ),
  },
  {
    id: 'keyboard',
    label: 'Keyboard',
    description:
      'Shortcuts for game, menu and display controls. Aircraft are only ever instructed from the command menus.',
    keys: ALL_KEYS.filter((key) => definitionOf(key).kind === 'keybinding'),
  },
];

const isDefault = (settings: UserSettings, key: UserKey) =>
  JSON.stringify(settings[key]) === JSON.stringify(DEFAULTS[key]);

/** The settings screen's content: section navigation, search and every user setting. */
export function SettingsView() {
  const settings = useUserSettings();
  const session = useAuth();
  const [sectionId, setSectionId] = useState(SETTINGS_SECTIONS[0]!.id);
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const conflicts = useMemo(() => {
    const byKey = new Map<string, string[]>();
    for (const conflict of findKeybindingConflicts(settings)) {
      for (const key of conflict.settings) {
        byKey.set(
          key,
          conflict.settings
            .filter((other) => other !== key)
            .map((other) => definitionOf(other as UserKey).label),
        );
      }
    }
    return byKey;
  }, [settings]);

  const search = query.trim().toLowerCase();
  const sections = search
    ? SETTINGS_SECTIONS.map((section) => ({
        ...section,
        keys: section.keys.filter((key) => {
          const definition = definitionOf(key);
          return `${definition.label} ${definition.description}`.toLowerCase().includes(search);
        }),
      })).filter((section) => section.keys.length > 0)
    : SETTINGS_SECTIONS.filter((section) => section.id === sectionId);

  const resetSection = (keys: UserKey[]) =>
    userSettings.update(Object.fromEntries(keys.map((key) => [key, DEFAULTS[key]])));

  return (
    <div className="settings-view">
      <nav className="settings-view__nav" aria-label="Settings sections">
        <input
          type="search"
          className="settings-view__search"
          placeholder="Search settings"
          aria-label="Search settings"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {SETTINGS_SECTIONS.map((section) => {
          const changed = section.keys.filter((key) => !isDefault(settings, key)).length;
          const warn = section.keys.some((key) => conflicts.has(key));
          return (
            <button
              key={section.id}
              type="button"
              aria-current={!search && section.id === sectionId ? 'page' : undefined}
              onClick={() => {
                setSectionId(section.id);
                setQuery('');
              }}
            >
              {section.label}
              {warn ? (
                <span
                  className="settings-view__badge settings-view__badge--warn"
                  title="Key conflict"
                >
                  !
                </span>
              ) : (
                changed > 0 && (
                  <span className="settings-view__badge" title={`${changed} changed`}>
                    {changed}
                  </span>
                )
              )}
            </button>
          );
        })}
        <p className="settings-view__sync">
          {session.status === 'signedIn'
            ? 'Saved to your account and synced across devices.'
            : 'Saved in this browser.'}
        </p>
      </nav>

      <div className="settings-view__content">
        {sections.length === 0 && (
          <p className="settings-view__empty">No settings match “{query}”.</p>
        )}
        {sections.map((section) => (
          <section key={section.id} className="settings-view__section" aria-label={section.label}>
            <header className="settings-view__header">
              <div>
                <h2>{section.label}</h2>
                {!search && <p>{section.description}</p>}
              </div>
              {!search && section.keys.some((key) => !isDefault(settings, key)) && (
                <button
                  type="button"
                  className="settings-view__text-button"
                  onClick={() => resetSection(section.keys)}
                >
                  Reset {section.label.toLowerCase()}
                </button>
              )}
            </header>
            <div className="settings-view__rows">
              {section.keys.map((key) => (
                <SettingRow
                  key={key}
                  settingKey={key}
                  definition={definitionOf(key)}
                  value={settings[key]}
                  onChange={(value) => userSettings.update({ [key]: value })}
                  {...(conflicts.has(key) ? { conflicts: conflicts.get(key)! } : {})}
                  {...(!isDefault(settings, key)
                    ? { onReset: () => userSettings.update({ [key]: DEFAULTS[key] }) }
                    : {})}
                />
              ))}
            </div>
          </section>
        ))}

        <footer className="settings-view__footer">
          {confirmReset ? (
            <>
              <span>Reset every setting to its default?</span>
              <button
                type="button"
                className="settings-view__text-button settings-view__text-button--danger"
                onClick={() => {
                  userSettings.update(DEFAULTS);
                  setConfirmReset(false);
                }}
              >
                Reset all
              </button>
              <button
                type="button"
                className="settings-view__text-button"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="settings-view__text-button"
              onClick={() => setConfirmReset(true)}
            >
              Reset all settings
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
