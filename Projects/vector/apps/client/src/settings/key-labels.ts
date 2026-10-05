// Human-readable labels for keybinding settings ('Shift+KeyS' → 'Shift S').

const NAMED_KEYS: Record<string, string> = {
  Space: 'Space',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '−',
  Equal: '=',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Home: 'Home',
  End: 'End',
};

/** One key code as shown on a keycap: 'KeyS' → 'S', 'Digit1' → '1', 'Numpad4' → 'Num 4'. */
export function keyLabel(code: string): string {
  if (NAMED_KEYS[code]) return NAMED_KEYS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

/** The parts of a binding as keycaps: 'Shift+KeyS' → ['Shift', 'S']. Unbound → []. */
export function bindingKeys(binding: string): string[] {
  if (!binding) return [];
  return binding
    .split('+')
    .map((part, index, parts) =>
      index === parts.length - 1 ? keyLabel(part) : part === 'Meta' ? '⌘' : part,
    );
}

/** Keys that only modify another key; a binding needs a main key too. */
export const isModifierCode = (code: string) =>
  /^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/.test(code);
