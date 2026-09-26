import { describe, expect, it } from 'vitest';
import { bindingKeys, isModifierCode, keyLabel } from './key-labels';

describe('key labels', () => {
  it('shows key codes as keycaps', () => {
    expect(keyLabel('KeyS')).toBe('S');
    expect(keyLabel('Digit7')).toBe('7');
    expect(keyLabel('Period')).toBe('.');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('F5')).toBe('F5');
  });

  it('splits bindings into keycaps', () => {
    expect(bindingKeys('Shift+KeyS')).toEqual(['Shift', 'S']);
    expect(bindingKeys('Meta+Equal')).toEqual(['⌘', '=']);
    expect(bindingKeys('')).toEqual([]);
  });

  it('recognizes modifier keys', () => {
    expect(isModifierCode('ShiftLeft')).toBe(true);
    expect(isModifierCode('MetaRight')).toBe(true);
    expect(isModifierCode('KeyM')).toBe(false);
  });
});
