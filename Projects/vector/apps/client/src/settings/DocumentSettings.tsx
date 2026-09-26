import { useEffect } from 'react';
import { useUserSettings } from './user-settings-store';

/** Applies settings that affect the whole page, such as the amount of UI motion. */
export function DocumentSettings() {
  const motion = useUserSettings()['display.uiAnimations'];
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  return null;
}
