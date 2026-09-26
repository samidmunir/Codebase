import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { applyDifficulty, defaultSettings } from '@vector/shared';
import type { AirspacePack, LatLon } from '@vector/sim-core';
import { findAirspace } from '../airspaces/registry';
import { draftPreview, EMPTY_DRAFT, type InstructionDraft } from '../commands/draft';
import { useGameControls } from '../controls/use-game-controls';
import { Basemap, BASEMAP_ATTRIBUTION, type BasemapHandle } from '../scope/Basemap';
import type { Camera } from '../scope/camera';
import { RadarScope, type RadarScopeHandle } from '../scope/RadarScope';
import { DEFAULT_LEADER_DIRECTION, type LeaderDirection } from '../scope/render/traffic-layer';
import { DEFAULT_DIFFICULTY, DIFFICULTY_LABELS, parseDifficulty } from '../settings/difficulty';
import { useUserSettings } from '../settings/user-settings-store';
import { ScopeSession } from '../sim/scope-session';
import { CommandPanel } from './scope/command/CommandPanel';
import { CommsLog } from './scope/CommsLog';
import { DeparturesPanel } from './scope/DeparturesPanel';
import { MapLayersPanel } from './scope/MapLayersPanel';
import { ScopeTopBar } from './scope/ScopeTopBar';
import { formatPosition } from './scope/format';
import './scope-screen.css';
import './scope/command/command-panel.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: ScopeSession };

export function ScopeScreen() {
  const { airspaceId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const difficulty = parseDifficulty(searchParams.get('difficulty')) ?? DEFAULT_DIFFICULTY;
  const entry = findAirspace(airspaceId);
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | undefined>(undefined);

  useEffect(() => {
    if (!entry?.load) return;
    let cancelled = false;
    const finish = (state: LoadState) =>
      !cancelled && setLoaded({ id: `${entry.id}:${difficulty}`, state });
    entry
      .load()
      .then((pack: AirspacePack) =>
        finish({
          kind: 'ready',
          session: new ScopeSession(pack, applyDifficulty(defaultSettings('session'), difficulty)),
        }),
      )
      .catch((error: unknown) =>
        finish({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [entry, difficulty]);

  const state: LoadState = !entry?.load
    ? { kind: 'error', message: `Airspace "${airspaceId}" is not available.` }
    : loaded?.id === `${entry.id}:${difficulty}`
      ? loaded.state
      : { kind: 'loading' };

  if (state.kind === 'loading') {
    return (
      <div className="scope-screen scope-screen--message">
        <div className="scope-loading" role="status">
          <span className="scope-loading__ring" aria-hidden="true" />
          Loading airspace
        </div>
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="scope-screen scope-screen--message">
        <div className="scope-error" role="alert">
          <p>{state.message}</p>
          <Link to="/">Back to start</Link>
        </div>
      </div>
    );
  }
  return <Scope session={state.session} difficultyLabel={DIFFICULTY_LABELS[difficulty]} />;
}

function Scope({ session, difficultyLabel }: { session: ScopeSession; difficultyLabel: string }) {
  const settings = useUserSettings();
  const status = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getStatus(),
  );
  const scopeRef = useRef<RadarScopeHandle>(null);
  const basemapRef = useRef<BasemapHandle>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(true);
  const [departuresOpen, setDeparturesOpen] = useState(true);
  const [cursor, setCursor] = useState<LatLon | undefined>(undefined);
  const [selection, setSelection] = useState<{ id: string; draft: InstructionDraft } | undefined>(
    undefined,
  );
  const [leaderDirections, setLeaderDirections] = useState<ReadonlyMap<string, LeaderDirection>>(
    new Map(),
  );

  // The selected aircraft, if it is still on the scope (it may have landed or left).
  const selected = selection ? session.engine.getAircraft(selection.id) : undefined;
  const select = useCallback((id: string | undefined) => {
    setSelection((current) =>
      id === undefined ? undefined : current?.id === id ? current : { id, draft: EMPTY_DRAFT },
    );
  }, []);
  const preview = useMemo(
    () => (selection && selected ? draftPreview(selection.draft, session.pack) : undefined),
    [selection, selected, session.pack],
  );

  const onCameraChange = useCallback((camera: Camera) => basemapRef.current?.sync(camera), []);

  useGameControls({
    togglePause: () => session.togglePause(),
    simSpeedUp: () => session.changeSpeed(1),
    simSpeedDown: () => session.changeSpeed(-1),
    zoomIn: () => scopeRef.current?.zoomBy(1),
    zoomOut: () => scopeRef.current?.zoomBy(-1),
    centerScope: () => scopeRef.current?.recenter(),
    toggleMapLayers: () => setLayersOpen((open) => !open),
    toggleCommsLog: () => setCommsOpen((open) => !open),
    toggleDepartureQueue: () => setDeparturesOpen((open) => !open),
    // Closes the topmost panel: map layers first, then the selected aircraft.
    closeMenu: () => (layersOpen ? setLayersOpen(false) : select(undefined)),
  });

  const { airspace } = session.pack;

  return (
    <div
      className="scope-screen"
      style={{ filter: `brightness(${settings['display.brightness'] / 100})` }}
    >
      <Basemap
        ref={basemapRef}
        enabled={settings['map.basemap']}
        opacity={settings['map.basemapOpacity']}
      />
      <RadarScope
        ref={scopeRef}
        session={session}
        settings={settings}
        onCameraChange={onCameraChange}
        onCursorChange={setCursor}
        selectedId={selected?.id}
        onSelect={select}
        leaderDirections={leaderDirections}
        preview={preview}
      />
      <div className="scope-vignette" aria-hidden="true" />

      <ScopeTopBar
        facility={airspace.facility}
        name={airspace.name}
        airports={airspace.airports}
        status={status}
        onTogglePause={() => session.togglePause()}
        onSetSpeed={(speed) => session.setSpeed(speed)}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((open) => !open)}
        commsOpen={commsOpen}
        onToggleComms={() => setCommsOpen((open) => !open)}
        departuresOpen={departuresOpen}
        onToggleDepartures={() => setDeparturesOpen((open) => !open)}
      />

      {status.paused && <div className="scope-paused">Paused</div>}

      {selection && selected && (
        <CommandPanel
          key={selected.id}
          session={session}
          aircraft={selected}
          draft={selection.draft}
          onDraftChange={(draft) => setSelection({ id: selected.id, draft })}
          leaderDirection={leaderDirections.get(selected.id) ?? DEFAULT_LEADER_DIRECTION}
          onLeaderDirectionChange={(direction) =>
            setLeaderDirections((current) => new Map(current).set(selected.id, direction))
          }
          onClose={() => select(undefined)}
        />
      )}

      {layersOpen && <MapLayersPanel settings={settings} onClose={() => setLayersOpen(false)} />}

      {departuresOpen && (
        <DeparturesPanel
          session={session}
          queueVersion={status.queueVersion}
          onClose={() => setDeparturesOpen(false)}
        />
      )}

      {commsOpen && (
        <CommsLog
          session={session}
          lastMessageId={status.lastMessageId}
          selectedId={selected?.id}
          onSelect={select}
          onClose={() => setCommsOpen(false)}
        />
      )}

      <div className="scope-footer">
        <div className="scope-readout">
          <span className="scope-readout__position">{cursor ? formatPosition(cursor) : '—'}</span>
          <span className="scope-readout__hint">
            Drag to pan · Scroll to zoom · Right-drag to measure
          </span>
          {settings['map.basemap'] && (
            <span className="scope-readout__attribution">{BASEMAP_ATTRIBUTION}</span>
          )}
        </div>

        <div className="scope-notice">
          <span className="scope-notice__dot" aria-hidden="true" />
          {difficultyLabel} · {status.aircraftCount} aircraft · click an aircraft to instruct it
        </div>

        <div className="scope-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => scopeRef.current?.zoomBy(1)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => scopeRef.current?.zoomBy(-1)} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            onClick={() => scopeRef.current?.recenter()}
            aria-label="Recenter"
            title="Recenter"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
