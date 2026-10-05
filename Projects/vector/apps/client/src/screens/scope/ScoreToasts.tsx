import { useEffect, useState } from 'react';
import type { ScoreEvent } from '@vector/sim-core';
import type { ScopeSession } from '../../sim/scope-session';
import { formatRp } from './score-format';

/** How long each RP notification stays up, and how many show at once. */
const TOAST_MS = 4_000;
const MAX_TOASTS = 4;

/** A small notification for each RP earned or lost: how much, and for what. */
export function ScoreToasts({ session }: { session: ScopeSession }) {
  const [toasts, setToasts] = useState<ScoreEvent[]>([]);

  useEffect(
    () =>
      session.engine.subscribe((event) => {
        if (event.type !== 'scored') return;
        const scored = event.event;
        setToasts((current) => [...current, scored].slice(-MAX_TOASTS));
        setTimeout(
          () => setToasts((current) => current.filter((toast) => toast.id !== scored.id)),
          TOAST_MS,
        );
      }),
    [session],
  );

  return (
    <div className="score-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="score-toast" data-sign={toast.rp < 0 ? 'minus' : 'plus'}>
          <span className="score-toast__rp">{formatRp(toast.rp, true)}</span>
          <span className="score-toast__callsigns">{toast.callsigns.join(' / ')}</span>
          <span className="score-toast__detail">{toast.detail}</span>
        </div>
      ))}
    </div>
  );
}
