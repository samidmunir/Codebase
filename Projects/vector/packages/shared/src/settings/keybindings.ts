import { USER_SETTINGS, type UserSettings } from './registry';

export interface KeybindingConflict {
  binding: string;
  settings: string[];
}

/** Keybinding settings that share the same key. Unbound ('') keys never conflict. */
export function findKeybindingConflicts(settings: UserSettings): KeybindingConflict[] {
  const byBinding = new Map<string, string[]>();
  for (const [key, definition] of Object.entries(USER_SETTINGS)) {
    if (definition.kind !== 'keybinding') continue;
    const binding = settings[key as keyof UserSettings] as string;
    if (binding === '') continue;
    byBinding.set(binding, [...(byBinding.get(binding) ?? []), key]);
  }
  return [...byBinding]
    .filter(([, keys]) => keys.length > 1)
    .map(([binding, keys]) => ({ binding, settings: keys }));
}
