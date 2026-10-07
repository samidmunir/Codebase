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
