import type { Shareable } from '../../components/ShareButton';
import { formatRp } from '../scope/score-format';
import { airspaceLabel } from './pilot-format';

/** Sharing a session result: its page (which previews as the result's card) and a line about it. */
export function resultShare(result: {
  id: string;
  airspaceId: string;
  rp: number;
  /** Whose it is: "I" when it's yours, else their handle. */
  by: 'you' | { handle: string };
  /** When it last changed (with its verification): a new card each time. */
  version?: string;
}): Shareable {
  const who = result.by === 'you' ? 'I' : `@${result.by.handle}`;
  return {
    url: `${window.location.origin}/results/${result.id}`,
    text: `${who} worked ${airspaceLabel(result.airspaceId)} on Vector: ${formatRp(result.rp, true)}`,
    image: `/api/share/results/${result.id}/card.png${result.version ? `?v=${result.version}` : ''}`,
  };
}

/** Sharing a pilot's profile: their page (which previews as their career card). */
export function profileShare(profile: {
  handle: string;
  rp: number;
  sessions: number;
  by: 'you' | 'them';
  /** Changes when the card would (sessions, RP, rank). */
  version: string;
}): Shareable {
  const career =
    profile.sessions === 0
      ? 'controlling real airspace'
      : `${formatRp(profile.rp, true)} over ${profile.sessions} session${profile.sessions === 1 ? '' : 's'}`;
  return {
    url: `${window.location.origin}/pilots/${profile.handle}`,
    text:
      profile.by === 'you'
        ? `My controller career on Vector: ${career}`
        : `@${profile.handle} on Vector: ${career}`,
    image: `/api/share/pilots/${encodeURIComponent(profile.handle)}/card.png?v=${profile.version}`,
  };
}
