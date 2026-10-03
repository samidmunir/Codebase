import { useState } from 'react';
import { Link } from 'react-router';
import type { LiveWeatherReport, Wind } from '@vector/sim-core';
import type { LiveWeatherStatus, SessionStatus } from '../../sim/scope-session';
import { shortAirport } from '../../scope/data-block';
import { formatUtc, formatWind } from './format';
import { formatRp } from './score-format';

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
  departuresOpen: boolean;
  onToggleDepartures: () => void;
  trafficOpen: boolean;
  onToggleTraffic: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  scoreOpen: boolean;
  onToggleScore: () => void;
  /** For pointing the wind arrow on a true-north display. */
  magneticVariationDeg: number;
  /** Leaving the scope (the Vector link): shows the debrief first. */
  onLeave: () => void;
}

function WindReadout({
  wind,
  winds,
  windKey,
  magneticVariationDeg,
  live,
  reports,
}: {
  wind: Wind;
  winds: Readonly<Record<string, Wind>>;
  windKey: string;
  magneticVariationDeg: number;
  live: LiveWeatherStatus;
  reports: Readonly<Record<string, Readonly<LiveWeatherReport>>>;
}) {
  const calm = formatWind(wind) === 'Calm';
  // The arrow points where the wind blows to, turning the short way when the wind shifts
  // (e.g. 350° to 010°): the angle accumulates instead of wrapping.
  const toward = wind.directionDeg + magneticVariationDeg + 180;
  const [arrow, setArrow] = useState({ toward, rotation: toward });
  if (arrow.toward !== toward) {
    const shortest = ((((toward - arrow.toward) % 360) + 540) % 360) - 180;
    setArrow({ toward, rotation: arrow.rotation + shortest });
  }
  const towardDeg = arrow.rotation;
  const detail = Object.entries(winds)
    .map(([icao, w]) => {
      const report = reports[icao];
      return `${shortAirport(icao)} ${formatWind(w)}${report ? `\n  ${report.raw}` : ''}`;
    })
    .join('\n');
  const liveNote =
    live.state === 'ok'
      ? `Live weather, checked ${live.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : live.state === 'failed'
        ? `Live weather unavailable (${live.message}); ${live.updatedAt ? 'showing the last reports' : 'using a realistic wind'}`
        : live.state === 'waiting'
          ? 'Getting live weather…'
          : undefined;
  return (
    <div
      className="scope-wind"
      title={`${liveNote ? `${liveNote}\n` : ''}Regional wind (magnetic)\n${detail}`}
      data-live={live.state}
      aria-label={`Wind ${formatWind(wind)}`}
    >
      <span className="scope-wind__label">Wind</span>
      {live.state !== 'off' && (
        <span className="scope-wind__live" aria-label={liveNote}>
          {live.state === 'failed' ? 'LIVE ⚠' : 'LIVE'}
        </span>
      )}
      {!calm && (
        <svg
          className="scope-wind__arrow"
          viewBox="0 0 16 16"
          width="13"
          height="13"
          aria-hidden="true"
          style={{ rotate: `${towardDeg}deg` }}
        >
          <path
            d="M8 14 V3 M4.5 6.5 L8 2.5 L11.5 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span key={windKey} className="scope-wind__value">
        {formatWind(wind)}
      </span>
    </div>
  );
}

export function ScopeTopBar(props: ScopeTopBarProps) {
  const { status } = props;
  return (
    <header className="scope-topbar">
      <div className="scope-topbar__identity">
        <Link
          to="/"
          className="scope-brand"
          aria-label="Vector home"
          onClick={(event) => {
            event.preventDefault();
            props.onLeave();
          }}
        >
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
          {/* Each airport with its current ATIS letter; hover for the broadcasts. */}
          <span
            className="scope-chip__airports"
            title={
              props.airports
                .map((icao) => status.atis[icao]?.text)
                .filter(Boolean)
                .join('\n\n') || undefined
            }
          >
            {props.airports.map((icao, i) => (
              <span key={icao}>
                {i > 0 && ' · '}
                {shortAirport(icao)}
                {status.atis[icao] && (
                  <b
                    key={status.atis[icao].letter}
                    className="scope-chip__atis"
                    aria-label={`information ${status.atis[icao].letter}`}
                  >
                    {status.atis[icao].letter}
                  </b>
                )}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="scope-topbar__center">
        <div className="scope-clock" aria-label="UTC time">
          {formatUtc(status.utcTime)}
          <span className="scope-clock__zone">Z</span>
        </div>
        {status.regionalWind && (
          <WindReadout
            wind={status.regionalWind}
            winds={status.winds}
            windKey={status.windKey}
            magneticVariationDeg={props.magneticVariationDeg}
            live={status.liveWeather}
            reports={status.liveReports}
          />
        )}
      </div>

      <div className="scope-topbar__controls">
        <button
          type="button"
          className="scope-button scope-rp"
          data-sign={status.rp < 0 ? 'minus' : 'plus'}
          aria-pressed={props.scoreOpen}
          onClick={props.onToggleScore}
          title="RP this session"
        >
          <span key={status.scoreEventCount} className="scope-rp__value">
            {formatRp(status.rp)}
          </span>
        </button>

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
          aria-pressed={props.departuresOpen}
          onClick={props.onToggleDepartures}
          title="Departure queues (Q)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M2 12.5 H14 M3.5 10 L12.5 4.5 M9 4 L12.5 4.5 L11.5 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="scope-button__label">Departures</span>
        </button>

        <button
          type="button"
          className="scope-button"
          aria-pressed={props.commsOpen}
          onClick={props.onToggleComms}
          title="Radio log (L)"
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
          <span className="scope-button__label">Radio</span>
        </button>

        <button
          type="button"
          className="scope-button"
          aria-pressed={props.trafficOpen}
          onClick={props.onToggleTraffic}
          title="Traffic (T)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M2.5 4.5 H13.5 M2.5 8 H13.5 M2.5 11.5 H13.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="10" cy="4.5" r="1.6" fill="currentColor" />
            <circle cx="5.5" cy="8" r="1.6" fill="currentColor" />
            <circle cx="11" cy="11.5" r="1.6" fill="currentColor" />
          </svg>
          <span className="scope-button__label">Traffic</span>
        </button>

        <button
          type="button"
          className="scope-button"
          aria-pressed={props.layersOpen}
          onClick={props.onToggleLayers}
          title="Map layers (M)"
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
          <span className="scope-button__label">Layers</span>
        </button>

        <button
          type="button"
          className="scope-button"
          onClick={props.onSave}
          title="Save session (Shift+S)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M3 2.5 H11 L13.5 5 V13.5 H2.5 V3 Z M5 2.5 V6 H10.5 V2.5 M5 13.5 V9.5 H11 V13.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="scope-button__label">Save</span>
        </button>

        <button
          type="button"
          className="scope-button scope-button--icon"
          onClick={props.onOpenHelp}
          aria-label="Quick reference"
          title="Quick reference (?)"
        >
          <span className="scope-button__glyph" aria-hidden="true">
            ?
          </span>
        </button>

        <button
          type="button"
          className="scope-button scope-button--icon"
          onClick={props.onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1.5 V3.2 M8 12.8 V14.5 M1.5 8 H3.2 M12.8 8 H14.5 M3.4 3.4 L4.6 4.6 M11.4 11.4 L12.6 12.6 M3.4 12.6 L4.6 11.4 M11.4 4.6 L12.6 3.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
