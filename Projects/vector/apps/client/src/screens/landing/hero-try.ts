import { useCallback, useMemo, useRef, useState } from 'react';
import type { LiveScopeVisitor } from '../../demo/LiveScope';
import type { ScopeSession } from '../../sim/scope-session';

// The landing page's try-it: which aircraft a visitor is working, and which to offer.

/** The stand-in controller leaves a visitor's aircraft alone this long (real ms). */
const LEAVE_ALONE_MS = 3 * 60_000;

/** Mouse (or trackpad) users: the scope isn't made for touch. */
export function useCanTry(): boolean {
  const [fine] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : false,
  );
  return fine;
}

/** The visitor's selection and the aircraft they're working, for the live scope. */
export function useHeroVisitor(): LiveScopeVisitor & { work: (id: string) => void } {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const worked = useRef(new Map<string, number>());
  const leaveAlone = useCallback((id: string) => (worked.current.get(id) ?? 0) > Date.now(), []);
  const work = useCallback((id: string) => {
    worked.current.set(id, Date.now() + LEAVE_ALONE_MS);
  }, []);
  return useMemo(
    () => ({ selectedId, onSelect: setSelectedId, leaveAlone, work }),
    [selectedId, leaveAlone, work],
  );
}

export const roundTo = (value: number, step: number) => Math.round(value / step) * step;
/** 1–360. */
export const heading = (deg: number) => ((Math.round(deg) % 360) + 360) % 360 || 360;

/** An arrival a visitor can work now: on the player's frequency and able to take a turn. */
export function pickAircraft(session: ScopeSession): string | undefined {
  const { engine } = session;
  const candidates = engine
    .listAircraft()
    .filter(
      (aircraft) =>
        aircraft.owner === engine.playerId &&
        // An arrival: easy to follow (it'll land), and it descends.
        aircraft.phase === 'arrival' &&
        session.pack.airspace.airports.includes(aircraft.flightPlan.destination) &&
        aircraft.altitudeFt > 4_000 &&
        engine.pendingInstructions(aircraft.id).length === 0 &&
        engine.checkInstruction(aircraft.id, [
          { type: 'heading', headingDeg: heading(aircraft.headingDeg + 30), turn: 'right' },
        ]).ok,
    )
    // Inside the TRACON, around 10,000 ft: on the scope, and with room to descend.
    .sort((a, b) => Math.abs(a.altitudeFt - 10_000) - Math.abs(b.altitudeFt - 10_000));
  return candidates[0]?.id;
}

export type HeroVisitor = ReturnType<typeof useHeroVisitor>;
