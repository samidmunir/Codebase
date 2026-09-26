import { USER_SETTINGS, type UserSettings } from '@vector/shared';

/**
 * Game, menu and display controls. These never issue aircraft instructions:
 * aircraft are controlled only through the command UI.
 */
export type GameAction =
  | 'togglePause'
  | 'simSpeedUp'
  | 'simSpeedDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'centerScope'
  | 'toggleCommsLog'
  | 'toggleDepartureQueue'
  | 'toggleMapLayers'
  | 'openSettings'
  | 'saveSession'
  | 'closeMenu';

interface KeyEventLike {
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** Formats a key event the way keybinding settings store it, e.g. 'Shift+KeyS'. */
export function bindingFromEvent(event: KeyEventLike): string {
  const modifiers = [
    event.ctrlKey && 'Ctrl',
    event.altKey && 'Alt',
    event.shiftKey && 'Shift',
    event.metaKey && 'Meta',
  ].filter(Boolean);
  return [...modifiers, event.code].join('+');
}

/** Normalizes a stored binding so modifier order doesn't matter. */
function normalize(binding: string): string {
  const parts = binding.split('+');
  const key = parts.pop()!;
  const order = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  return [...parts.sort((a, b) => order.indexOf(a) - order.indexOf(b)), key].join('+');
}

/** Builds a lookup from binding to action from the user's keybinding settings. */
export function actionsByBinding(settings: UserSettings): Map<string, GameAction> {
  const map = new Map<string, GameAction>();
  for (const [key, definition] of Object.entries(USER_SETTINGS)) {
    if (definition.kind !== 'keybinding') continue;
    const binding = settings[key as keyof UserSettings] as string;
    if (binding) map.set(normalize(binding), key.replace('controls.keys.', '') as GameAction);
  }
  return map;
}

/** Whether keyboard focus is somewhere that should receive typing instead. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
