import { Link } from 'react-router';
import type { SessionStatus } from '../../sim/scope-session';
import { shortAirport } from '../../scope/data-block';
import { formatUtc } from './format';

interface ScopeTopBarProps {
  facility: string;
  name: string;
  airports: string[];
  status: SessionStatus;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  commsOpen: boolean;
  onToggleComms: () => void;
}

export function ScopeTopBar(props: ScopeTopBarProps) {
  const { status } = props;
  return (
    <header className="scope-topbar">
      <div className="scope-topbar__identity">
        <Link to="/" className="scope-brand" aria-label="Vector home">
          <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
            <circle
              cx="16"
              cy="16"
              r="11"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <circle
              cx="16"
              cy="16"
              r="5.5"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <path d="M16 16 L25 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="21" cy="20" r="2" fill="currentColor" />
          </svg>
          Vector
        </Link>
        <div className="scope-chip">
          <span className="scope-chip__facility">{props.facility}</span>
          <span className="scope-chip__name">{props.name}</span>
          <span className="scope-chip__airports">
            {props.airports.map(shortAirport).join(' · ')}
          </span>
        </div>
      </div>

      <div className="scope-clock" aria-label="UTC time">
        {formatUtc(status.utcTime)}
        <span className="scope-clock__zone">Z</span>
      </div>

      <div className="scope-topbar__controls">
        <button
          type="button"
          className="scope-button scope-button--icon"
          onClick={props.onTogglePause}
          aria-label={status.paused ? 'Resume' : 'Pause'}
          title={status.paused ? 'Resume' : 'Pause'}
        >
          {status.paused ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5 L13 8 L4 13.5 Z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
              <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="scope-segmented" role="group" aria-label="Sim speed">
          {status.availableSpeeds.map((speed) => (
            <button
              key={speed}
              type="button"
              aria-pressed={status.speed === speed}
              onClick={() => props.onSetSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </div>

        <button
          type="button"
          className="scope-button"
          aria-pressed={props.commsOpen}
          onClick={props.onToggleComms}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M3 3.5 H13 V10.5 H7 L4 13 V10.5 H3 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Radio
        </button>

        <button
          type="button"
          className="scope-button"
          aria-pressed={props.layersOpen}
          onClick={props.onToggleLayers}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M8 2 L14.5 5.5 L8 9 L1.5 5.5 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M1.5 8.5 L8 12 L14.5 8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Layers
        </button>
      </div>
    </header>
  );
}
