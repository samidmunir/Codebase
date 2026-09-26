import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router';
import type { AirspacePack, LatLon } from '@vector/sim-core';
import { findAirspace } from '../airspaces/registry';
import { useGameControls } from '../controls/use-game-controls';
import { Basemap, BASEMAP_ATTRIBUTION, type BasemapHandle } from '../scope/Basemap';
import type { Camera } from '../scope/camera';
import { RadarScope, type RadarScopeHandle } from '../scope/RadarScope';
import { useUserSettings } from '../settings/user-settings-store';
import { ScopeSession } from '../sim/scope-session';
import { MapLayersPanel } from './scope/MapLayersPanel';
import { ScopeTopBar } from './scope/ScopeTopBar';
import { formatPosition } from './scope/format';
import './scope-screen.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: ScopeSession };

export function ScopeScreen() {
  const { airspaceId = '' } = useParams();
  const entry = findAirspace(airspaceId);
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | undefined>(undefined);

  useEffect(() => {
    if (!entry?.load) return;
    let cancelled = false;
    const finish = (state: LoadState) => !cancelled && setLoaded({ id: entry.id, state });
    entry
      .load()
      .then((pack: AirspacePack) => finish({ kind: 'ready', session: new ScopeSession(pack) }))
      .catch((error: unknown) =>
        finish({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const state: LoadState = !entry?.load
    ? { kind: 'error', message: `Airspace "${airspaceId}" is not available.` }
    : loaded?.id === entry.id
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
  return <Scope session={state.session} />;
}

function Scope({ session }: { session: ScopeSession }) {
  const settings = useUserSettings();
  const status = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getStatus(),
  );
  const scopeRef = useRef<RadarScopeHandle>(null);
  const basemapRef = useRef<BasemapHandle>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [cursor, setCursor] = useState<LatLon | undefined>(undefined);

  const onCameraChange = useCallback((camera: Camera) => basemapRef.current?.sync(camera), []);

  useGameControls({
    togglePause: () => session.togglePause(),
    simSpeedUp: () => session.changeSpeed(1),
    simSpeedDown: () => session.changeSpeed(-1),
    zoomIn: () => scopeRef.current?.zoomBy(1),
    zoomOut: () => scopeRef.current?.zoomBy(-1),
    centerScope: () => scopeRef.current?.recenter(),
    toggleMapLayers: () => setLayersOpen((open) => !open),
    closeMenu: () => setLayersOpen(false),
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
      />

      {status.paused && <div className="scope-paused">Paused</div>}

      {layersOpen && <MapLayersPanel settings={settings} onClose={() => setLayersOpen(false)} />}

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
          Preview traffic · {status.aircraftCount} aircraft · controlling aircraft comes next
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
