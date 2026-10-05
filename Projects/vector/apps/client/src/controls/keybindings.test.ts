import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import { actionsByBinding, bindingFromEvent } from './keybindings';

const key = (
  code: string,
  modifiers: Partial<Record<'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey', boolean>> = {},
) => ({
  code,
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...modifiers,
});

describe('keybindings', () => {
  it('formats events with modifiers in a fixed order', () => {
    expect(bindingFromEvent(key('KeyS', { shiftKey: true }))).toBe('Shift+KeyS');
    expect(bindingFromEvent(key('KeyZ', { metaKey: true, ctrlKey: true }))).toBe('Ctrl+Meta+KeyZ');
  });

  it('maps the default bindings to game actions', () => {
    const actions = actionsByBinding(defaultSettings('user'));
    expect(actions.get('Space')).toBe('togglePause');
    expect(actions.get('Shift+KeyS')).toBe('saveSession');
    expect(actions.get('KeyS')).toBeUndefined();
  });

  it('follows rebinding and ignores unbound actions', () => {
    const settings = {
      ...defaultSettings('user'),
      'controls.keys.togglePause': 'KeyP',
      'controls.keys.zoomIn': '',
    };
    const actions = actionsByBinding(settings);
    expect(actions.get('KeyP')).toBe('togglePause');
    expect(actions.get('Space')).toBeUndefined();
    expect([...actions.values()]).not.toContain('zoomIn');
  });
});
