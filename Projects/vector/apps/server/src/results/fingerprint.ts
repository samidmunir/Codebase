import { createHash } from 'node:crypto';
import { stateFingerprint, type SimState } from '@vector/sim-core';

/** SHA-256 (hex) of a session state's fingerprint: what verification compares. */
export function fingerprintHash(state: Readonly<SimState>): string {
  return createHash('sha256').update(stateFingerprint(state)).digest('hex');
}
