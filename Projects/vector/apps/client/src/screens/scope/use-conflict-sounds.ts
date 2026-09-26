import { useEffect } from 'react';
import { alertSounds } from '../../audio/alert-sounds';
import { userSettings } from '../../settings/user-settings-store';
import type { ScopeSession } from '../../sim/scope-session';

/** Repeats the loss-of-separation tone this often while a loss continues. */
const REPEAT_MS = 4_000;

/** Plays Conflict Alert tones: once for a new predicted conflict, repeatedly while separation is lost. */
export function useConflictSounds(session: ScopeSession): void {
  useEffect(() => {
    const enabled = () => userSettings.get()['audio.conflictAlert'];
    const volume = () => userSettings.get()['audio.masterVolume'];

    const unsubscribe = session.engine.subscribe((event) => {
      if (!enabled()) return;
      if (event.type === 'separationLost') alertSounds.loss(volume());
      else if (event.type === 'conflictStarted' && event.conflict.kind === 'predicted')
        alertSounds.predicted(volume());
    });
    const timer = window.setInterval(() => {
      const losing = session.engine.conflicts.some((conflict) => conflict.kind === 'loss');
      if (losing && enabled() && !session.engine.paused) alertSounds.loss(volume());
    }, REPEAT_MS);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [session]);
}
