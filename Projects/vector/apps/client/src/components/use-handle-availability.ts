import { useEffect, useState } from 'react';
import type { HandleAvailability } from '@vector/shared';
import { checkHandle } from '../api/account-api';

/** How long typing must pause before checking a handle. */
const CHECK_DELAY_MS = 350;

/**
 * Whether a handle is free, checked as the pilot types. `current` is the handle
 * they already have (no need to check it).
 */
export function useHandleAvailability(
  handle: string,
  current?: string,
): HandleAvailability | undefined {
  const [result, setResult] = useState<HandleAvailability | undefined>(undefined);
  const trimmed = handle.trim();
  const unchanged = current !== undefined && trimmed === current;

  useEffect(() => {
    if (!trimmed || unchanged) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkHandle(trimmed)
        .then((availability) => !cancelled && setResult(availability))
        .catch(() => undefined);
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, unchanged]);

  // Only a result for what's in the box now counts (and nothing for an empty or unchanged one).
  return !trimmed || unchanged || result?.handle.toLowerCase() !== trimmed.toLowerCase()
    ? undefined
    : result;
}
