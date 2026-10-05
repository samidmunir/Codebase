import { useEffect, useRef } from 'react';
import { useUserSettings } from '../settings/user-settings-store';
import { actionsByBinding, bindingFromEvent, isTypingTarget, type GameAction } from './keybindings';

/** Actions that make sense to repeat while the key is held. */
const REPEATABLE = new Set<GameAction>(['zoomIn', 'zoomOut']);

/**
 * Listens for the player's keybindings and runs the matching game control.
 * Only game, menu and display controls are bindable; aircraft are never
 * commanded from the keyboard.
 */
export function useGameControls(handlers: Partial<Record<GameAction, () => void>>): void {
  const settings = useUserSettings();
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const actions = actionsByBinding(settings);
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const action = actions.get(bindingFromEvent(event));
      if (!action) return;
      const handler = handlersRef.current[action];
      if (!handler) return;
      event.preventDefault();
      if (event.repeat && !REPEATABLE.has(action)) return;
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings]);
}
