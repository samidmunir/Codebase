import { letterWords } from '@vector/sim-core';
import { shortAirport } from '../scope/data-block';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { applyDifficulty, defaultSettings } from '@vector/shared';
import type { LatLon } from '@vector/sim-core';
import { useAirspaceStatus } from '../airspaces/airspace-status';
import { findAirspace } from '../airspaces/registry';
import { ApiRequestError } from '../api/api-client';
import { getSavedSession } from '../api/sessions-api';
import { draftPreview, EMPTY_DRAFT, type InstructionDraft } from '../commands/draft';
import { useGameControls } from '../controls/use-game-controls';
import { Basemap, BASEMAP_ATTRIBUTION, type BasemapHandle } from '../scope/Basemap';
import type { Camera } from '../scope/camera';
import { RadarScope, type RadarScopeHandle } from '../scope/RadarScope';
import type { LeaderDirection } from '../scope/render/traffic-layer';
import { DEFAULT_DIFFICULTY, DIFFICULTY_LABELS, parseDifficulty } from '../settings/difficulty';
import { useUserSettings } from '../settings/user-settings-store';
import { ScopeSession } from '../sim/scope-session';
import { parseSetup } from '../sim/session-setup';
import { CommandPanel } from './scope/command/CommandPanel';
import { CommsLog } from './scope/CommsLog';
import { DeparturesPanel } from './scope/DeparturesPanel';
import { MapLayersPanel } from './scope/MapLayersPanel';
import {
  playSelectSound,
  useConflictSounds,
  useInterfaceSounds,
} from './scope/use-conflict-sounds';
import { SaveSessionDialog } from './scope/SaveSessionDialog';
import { DebriefDialog, type DebriefReason } from './scope/DebriefDialog';
import { HelpDialog } from '../components/help/HelpDialog';
import { ScorePanel } from './scope/ScorePanel';
import { ScoreToasts } from './scope/ScoreToasts';
import { SettingsDialog } from './scope/SettingsDialog';
import { ScopeTopBar } from './scope/ScopeTopBar';
import { useLiveWeather } from './scope/use-live-weather';
import { TrafficPanel } from './scope/TrafficPanel';
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
  const difficultyParam = parseDifficulty(searchParams.get('difficulty'));
  const difficulty = difficultyParam ?? DEFAULT_DIFFICULTY;
  const savedId = searchParams.get('session');
  const location = useLocation();
  const setup = useMemo(() => parseSetup(location.state), [location.state]);
  const entry = findAirspace(airspaceId);
  const { isOpen } = useAirspaceStatus();
  // A new key for every start from the setup screen, so each start is a fresh session.
  const loadKey = `${entry?.id}:${savedId ? `session=${savedId}` : setup ? `setup=${location.key}` : difficulty}`;
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | undefined>(undefined);

  useEffect(() => {
    if (!entry?.load) return;
    let cancelled = false;
    const finish = (state: LoadState) => !cancelled && setLoaded({ id: loadKey, state });
    const start = async (): Promise<ScopeSession> => {
      if (!savedId) {
        const pack = await entry.load!();
        return new ScopeSession(
          pack,
          setup
            ? { kind: 'new', ...setup }
            : { kind: 'new', settings: applyDifficulty(defaultSettings('session'), difficulty) },
        );
      }
      const [pack, saved] = await Promise.all([entry.load!(), getSavedSession(savedId)]);
      if (saved.airspaceId !== entry.id) throw new Error('That session is for another airspace.');
      try {
        return new ScopeSession(pack, {
          kind: 'saved',
          snapshot: saved.snapshot,
          savedId: saved.id,
          name: saved.name,
        });
      } catch {
        throw new Error(`"${saved.name}" can't be resumed with this version of Vector.`);
      }
    };
    start()
      .then((session) => finish({ kind: 'ready', session }))
      .catch((error: unknown) =>
        finish({
          kind: 'error',
          message:
            error instanceof ApiRequestError || error instanceof Error
              ? error.message
              : String(error),
        }),
      );
    return () => {
      cancelled = true;
    };
  }, [entry, difficulty, savedId, setup, loadKey]);

  // Opened without a setup (e.g. a typed URL): choose the session first.
  if (entry?.load && !savedId && !setup && !difficultyParam) {
    return <Navigate to={`/setup/${entry.id}`} replace />;
  }

  const state: LoadState = !entry?.load
    ? { kind: 'error', message: `Airspace "${airspaceId}" is not available.` }
    : !isOpen(entry.id)
      ? { kind: 'error', message: `${entry.name} is closed right now. Try another airspace.` }
      : loaded?.id === loadKey
        ? loaded.state
        : { kind: 'loading' };

  if (state.kind === 'loading') {
    return (
      <div className="scope-screen scope-screen--message">
        <div className="scope-loading" role="status">
          <span className="scope-loading__ring" aria-hidden="true" />
          {savedId ? 'Loading saved session' : 'Loading airspace'}
        </div>
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="scope-screen scope-screen--message">
        <div className="scope-error" role="alert">
          <p>{state.message}</p>
          <Link to="/play">Back to start</Link>
        </div>
      </div>
    );
  }
  return <Scope session={state.session} />;
}

/** How often a running session's result is recorded. */
const RESULT_RECORD_INTERVAL_MS = 2 * 60_000;

/** How long the "Saved" confirmation shows. */
const TOAST_MS = 3_000;

function Scope({ session }: { session: ScopeSession }) {
  const settings = useUserSettings();
  const status = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getStatus(),
  );
  const scopeRef = useRef<RadarScopeHandle>(null);
  const basemapRef = useRef<BasemapHandle>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  // The debrief: after a save, or before leaving the scope. The sim pauses while it's open.
  const [debrief, setDebrief] = useState<DebriefReason | undefined>(undefined);
  const [leaveAfterSave, setLeaveAfterSave] = useState(false);
  const wasPausedRef = useRef(true);
  const navigate = useNavigate();
  const openDebrief = (reason: DebriefReason) => {
    if (!debrief) wasPausedRef.current = session.engine.paused;
    session.pause();
    setDebrief(reason);
    void session.recordResult();
  };

  // The session's result goes into the pilot's career as it goes on, and on leaving.
  useEffect(() => {
    const timer = setInterval(() => void session.recordResult(), RESULT_RECORD_INTERVAL_MS);
    const onHide = () => void session.recordResult();
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
      void session.recordResult();
    };
  }, [session]);
  const closeDebrief = () => {
    setDebrief(undefined);
    if (!wasPausedRef.current) session.togglePause();
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
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
  // The fix hovered in the direct-to list, highlighted on the scope.
  const [hoveredFix, setHoveredFix] = useState<string | undefined>(undefined);
  const selectedIdRef = useRef<string | undefined>(undefined);
  const select = useCallback((id: string | undefined) => {
    if (id !== undefined && id !== selectedIdRef.current) playSelectSound();
    if (id !== selectedIdRef.current) setHoveredFix(undefined);
    selectedIdRef.current = id;
    setSelection((current) =>
      id === undefined ? undefined : current?.id === id ? current : { id, draft: EMPTY_DRAFT },
    );
  }, []);
  const preview = useMemo(
    () => (selection && selected ? draftPreview(selection.draft, session.pack) : undefined),
    [selection, selected, session.pack],
  );

  const onCameraChange = useCallback((camera: Camera) => basemapRef.current?.sync(camera), []);

  useConflictSounds(session);
  useInterfaceSounds(session);
  useLiveWeather(session);

  // Runway changes: announced ahead, then made.
  useEffect(
    () =>
      session.engine.subscribe((event) => {
        const runways = (r: { arrivals: string[]; departures: string[] }) =>
          `landing ${r.arrivals.join('/')}, departing ${r.departures.join('/')}`;
        if (event.type === 'runwayChangePlanned') {
          const minutes = Math.round(
            ((event.atTick - session.engine.tick) * session.engine.config.tickSeconds) / 60,
          );
          setToast(
            `${shortAirport(event.airport)} runway change ${minutes > 0 ? `in ${minutes} min` : 'now'}: ${runways(event.runways)}`,
          );
        } else if (event.type === 'runwayChanged') {
          setToast(`${shortAirport(event.airport)} now ${runways(event.runways)}`);
        } else if (event.type === 'atisChanged') {
          setToast(
            `${shortAirport(event.airport)} information ${letterWords(event.letter)} is current`,
          );
        }
      }),
    [session],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Traffic, RP and map layers share the right-hand side: one open at a time.
  const toggleLayers = () => {
    setLayersOpen((open) => !open);
    setTrafficOpen(false);
    setScoreOpen(false);
  };
  const toggleTraffic = () => {
    setTrafficOpen((open) => !open);
    setLayersOpen(false);
    setScoreOpen(false);
  };
  const toggleScore = () => {
    setScoreOpen((open) => !open);
    setLayersOpen(false);
    setTrafficOpen(false);
  };
  const openSave = () => {
    session.pause();
    setSaveOpen(true);
  };

  // Development only: expose the session for debugging and browser tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __vector?: ScopeSession }).__vector = session;
  }, [session]);

  useGameControls({
    togglePause: () => session.togglePause(),
    simSpeedUp: () => session.changeSpeed(1),
    simSpeedDown: () => session.changeSpeed(-1),
    zoomIn: () => scopeRef.current?.zoomBy(1),
    zoomOut: () => scopeRef.current?.zoomBy(-1),
    centerScope: () => scopeRef.current?.recenter(),
    toggleMapLayers: toggleLayers,
    toggleTraffic,
    toggleScore,
    saveSession: openSave,
    openSettings: () => setSettingsOpen((open) => !open),
    openHelp: () => setHelpOpen((open) => !open),
    toggleCommsLog: () => setCommsOpen((open) => !open),
    toggleDepartureQueue: () => setDeparturesOpen((open) => !open),
    // Closes the topmost panel: the save dialog, then side panels, then the selected aircraft.
    closeMenu: () => {
      if (debrief) closeDebrief();
      else if (helpOpen) setHelpOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (saveOpen) setSaveOpen(false);
      else if (layersOpen || trafficOpen || scoreOpen) {
        setLayersOpen(false);
        setTrafficOpen(false);
        setScoreOpen(false);
      } else select(undefined);
    },
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
        highlightFix={selected ? hoveredFix : undefined}
        onFixCommand={(ident) => {
          if (!selected) return;
          const fix = session.pack.fix(ident);
          if (!fix) return;
          const result = session.issueInstruction(selected.id, [
            { type: 'directTo', fix: fix.ident, position: fix.position },
          ]);
          if (!result.ok) setToast(`${selected.callsign}: ${result.reason}`);
          else if (selection?.draft.directTo || selection?.draft.heading)
            setSelection({
              id: selected.id,
              draft: { ...selection.draft, directTo: undefined, heading: undefined },
            });
        }}
      />
      <div className="scope-vignette" aria-hidden="true" />

      <ScopeTopBar
        facility={airspace.facility}
        name={airspace.name}
        airports={airspace.airports}
        magneticVariationDeg={airspace.magneticVariationDeg}
        status={status}
        onTogglePause={() => session.togglePause()}
        onSetSpeed={(speed) => session.setSpeed(speed)}
        layersOpen={layersOpen}
        onToggleLayers={toggleLayers}
        trafficOpen={trafficOpen}
        onToggleTraffic={toggleTraffic}
        onSave={openSave}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onLeave={() => openDebrief({ kind: 'leaving' })}
        scoreOpen={scoreOpen}
        onToggleScore={toggleScore}
        commsOpen={commsOpen}
        onToggleComms={() => setCommsOpen((open) => !open)}
        departuresOpen={departuresOpen}
        onToggleDepartures={() => setDeparturesOpen((open) => !open)}
      />

      {status.paused && <div className="scope-paused">Paused</div>}
      {toast && (
        <div className="scope-toast" role="status">
          {toast}
        </div>
      )}

      {/* The right side: the open side panel, then the selected aircraft's command panel. */}
      <div className="scope-dock">
        {layersOpen && <MapLayersPanel settings={settings} onClose={() => setLayersOpen(false)} />}

        {scoreOpen && (
          <ScorePanel
            session={session}
            scoreEventCount={status.scoreEventCount}
            onClose={() => setScoreOpen(false)}
          />
        )}

        {trafficOpen && (
          <TrafficPanel
            session={session}
            trafficKey={status.trafficKey}
            onClose={() => setTrafficOpen(false)}
          />
        )}

        {selection && selected && (
          <CommandPanel
            key={selected.id}
            session={session}
            aircraft={selected}
            draft={selection.draft}
            onDraftChange={(draft) => setSelection({ id: selected.id, draft })}
            leaderDirection={leaderDirections.get(selected.id)}
            onLeaderDirectionChange={(direction) =>
              setLeaderDirections((current) => {
                const next = new Map(current);
                if (direction === undefined) next.delete(selected.id);
                else next.set(selected.id, direction);
                return next;
              })
            }
            onFixHover={setHoveredFix}
            onClose={() => select(undefined)}
          />
        )}
      </div>

      <ScoreToasts session={session} />

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      {saveOpen && (
        <SaveSessionDialog
          session={session}
          onClose={() => {
            setSaveOpen(false);
            setLeaveAfterSave(false);
          }}
          onSaved={(name) => {
            setSaveOpen(false);
            setToast(`Saved “${name}”`);
            if (leaveAfterSave) void navigate('/play');
            else openDebrief({ kind: 'saved', name });
          }}
        />
      )}

      {debrief && (
        <DebriefDialog
          session={session}
          reason={debrief}
          onKeepWorking={closeDebrief}
          onSave={() => {
            setDebrief(undefined);
            setLeaveAfterSave(true);
            setSaveOpen(true);
          }}
          onLeave={() => void navigate('/play')}
        />
      )}

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
          conflictsKey={status.conflictsKey}
          violationCount={status.violationCount}
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
          {session.saved ? `${session.saved.name} · ` : ''}
          {session.difficulty === 'custom'
            ? 'Custom'
            : DIFFICULTY_LABELS[session.difficulty]} · {status.aircraftCount} aircraft · click an
          aircraft to instruct it
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
