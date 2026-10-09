import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AtcCommand } from '@vector/sim-core';
import { isDeparting } from '../../commands/command-options';
import type { ScopeSession } from '../../sim/scope-session';
import { useSiteStatus } from '../../site/site-status';
import { heading, pickAircraft, roundTo, type HeroVisitor } from './hero-try';

// "Try it": a visitor works an aircraft in the hero's live session, no account needed.
// One instruction, the pilot reads it back, and they've done the job.

/** How often the panel reads the aircraft (real ms). */
const READ_MS = 500;

interface Option {
  label: string;
  commands: AtcCommand[];
  /** What to watch for on the scope afterwards. */
  watch: string;
}

/** The try-it panel: the aircraft, a few instructions, the readback, and what's next. */
export function TryPanel({ session, visitor }: { session: ScopeSession; visitor: HeroVisitor }) {
  const { engine, pack } = session;
  const aircraftId = visitor.selectedId!;
  const [, setNow] = useState(0);
  const [sent, setSent] = useState<{ aircraftId: string; tick: number; watch: string }>();
  const [problem, setProblem] = useState<string>();
  const { registrationMode } = useSiteStatus();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), READ_MS);
    return () => clearInterval(timer);
  }, []);

  const aircraft = engine.getAircraft(aircraftId);
  const close = () => visitor.onSelect(undefined);
  const pickAnother = () => {
    setSent(undefined);
    setProblem(undefined);
    visitor.onSelect(pickAircraft(session));
  };

  if (!aircraft)
    return (
      <TryCard onClose={close}>
        <p>That aircraft has left the airspace.</p>
        <button type="button" className="hero-try__primary" onClick={pickAnother}>
          Pick another for me
        </button>
      </TryCard>
    );

  const yours = aircraft.owner === engine.playerId;
  const departing = isDeparting(pack, aircraft);
  const altitudeTarget = departing
    ? roundTo(aircraft.altitudeFt + 2_000, 1_000)
    : Math.max(3_000, roundTo(aircraft.altitudeFt - 2_000, 1_000));
  const options: Option[] = [
    {
      label: 'Turn left 30°',
      watch: 'watch it turn on the scope',
      commands: [
        {
          type: 'heading',
          headingDeg: heading(roundTo(aircraft.headingDeg - 30, 5)),
          turn: 'left',
        },
      ],
    },
    {
      label: 'Turn right 30°',
      watch: 'watch it turn on the scope',
      commands: [
        {
          type: 'heading',
          headingDeg: heading(roundTo(aircraft.headingDeg + 30, 5)),
          turn: 'right',
        },
      ],
    },
    {
      label: `${departing ? 'Climb' : 'Descend'} to ${altitudeTarget.toLocaleString('en-US')} ft`,
      commands: [{ type: 'altitude', altitudeFt: altitudeTarget }],
      watch: `watch its altitude ${departing ? 'climb' : 'come down'} in its data block`,
    },
  ];

  const give = (option: Option) => {
    const result = session.issueInstruction(aircraft.id, option.commands);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setProblem(undefined);
    visitor.work(aircraft.id);
    setSent({ aircraftId: aircraft.id, tick: engine.tick, watch: option.watch });
  };

  // What was said on frequency since the instruction: yours, then the pilot's readback.
  // (The radio log keeps the latest calls only, so they're found by when they were made.)
  const calls =
    sent?.aircraftId === aircraft.id
      ? engine.comms.filter((call) => call.tick >= sent.tick && call.aircraftId === aircraft.id)
      : [];
  const instruction = calls.find((call) => call.speaker === 'controller' && !call.facility);
  const readback = calls.find((call) => call.speaker === 'pilot');

  return (
    <TryCard onClose={close}>
      <header className="hero-try__aircraft">
        <strong>{aircraft.callsign}</strong>
        <span>
          {aircraft.aircraftType} · {aircraft.flightPlan.origin} → {aircraft.flightPlan.destination}
        </span>
        <span className="hero-try__data">
          {Math.round(aircraft.altitudeFt / 100)
            .toString()
            .padStart(3, '0')}{' '}
          · HDG {heading(aircraft.headingDeg).toString().padStart(3, '0')} ·{' '}
          {Math.round(aircraft.iasKts)} kt
        </span>
      </header>

      {!yours ? (
        <>
          <p>
            That one isn’t on your frequency yet (Center or Tower has it). Pick another, or let
            Vector choose one that’s yours.
          </p>
          <button type="button" className="hero-try__primary" onClick={pickAnother}>
            Pick one for me
          </button>
        </>
      ) : !sent || sent.aircraftId !== aircraft.id ? (
        <>
          <p>It’s yours. Give it an instruction:</p>
          <div className="hero-try__options">
            {options.map((option) => (
              <button key={option.label} type="button" onClick={() => give(option)}>
                {option.label}
              </button>
            ))}
          </div>
          {problem && (
            <p className="hero-try__problem" role="alert">
              The pilot would be unable: {problem}
            </p>
          )}
        </>
      ) : (
        <div className="hero-try__done" aria-live="polite">
          <ol className="hero-try__calls">
            {instruction && (
              <li data-controller>
                <span>You</span> {instruction.text}
              </li>
            )}
            {readback ? (
              <li>
                <span>{aircraft.callsign}</span> {readback.text}
              </li>
            ) : (
              <li className="hero-try__waiting">
                <span>{aircraft.callsign}</span> …
              </li>
            )}
          </ol>
          {readback && (
            <>
              <p className="hero-try__nice">
                <strong>That’s the job.</strong> You just worked your first aircraft: {sent.watch}.
              </p>
              <div className="hero-try__next">
                {registrationMode === 'closed' ? (
                  <Link to="/airspaces" className="hero-try__primary">
                    See the airspaces
                  </Link>
                ) : (
                  <Link to="/register" className="hero-try__primary">
                    {registrationMode === 'invite'
                      ? 'Join the beta: work the whole sector'
                      : 'Work the whole sector, free'}
                  </Link>
                )}
                <button type="button" className="hero-try__link" onClick={pickAnother}>
                  Try another
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </TryCard>
  );
}

function TryCard({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <section className="hero-try" aria-label="Try Vector">
      <div className="hero-try__head">
        <span className="hero-try__eyebrow">
          <span className="landing-hero__pulse" aria-hidden="true" /> You’re on frequency
        </span>
        <button
          type="button"
          className="hero-try__close"
          aria-label="Stop trying"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </section>
  );
}
