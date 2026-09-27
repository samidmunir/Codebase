import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { UserSettings } from '@vector/shared';
import type { LatLon } from '@vector/sim-core';
import type { ScopeSession } from '../sim/scope-session';
import {
  clampZoom,
  pan,
  unproject,
  zoomAround,
  zoomToFit,
  type Camera,
  type ScreenPoint,
} from './camera';
import { stepCameraAnimation, type CameraAnimation } from './camera-animation';
import { drawMapLayer } from './render/map-layer';
import { routePreview } from './route-preview';
import { scopePalette } from './render/palette';
import {
  drawTrafficLayer,
  hitTest,
  type InstructionPreview,
  type LeaderDirection,
  type TargetHitArea,
} from './render/traffic-layer';

export interface RadarScopeHandle {
  zoomBy(steps: number): void;
  recenter(): void;
}

interface RadarScopeProps {
  session: ScopeSession;
  settings: UserSettings;
  onCameraChange?: (camera: Camera) => void;
  onCursorChange?: (position: LatLon | undefined) => void;
  selectedId: string | undefined;
  onSelect: (aircraftId: string | undefined) => void;
  leaderDirections: ReadonlyMap<string, LeaderDirection>;
  preview: InstructionPreview | undefined;
  /** A fix to highlight on the map, e.g. while hovering it in the direct-to list. */
  highlightFix?: string | undefined;
  ref?: Ref<RadarScopeHandle>;
}

const PLAYER_ID = 'N90';
const FIT_MARGIN_NM = 3;
/** Real milliseconds per data block time-share phase. */
const TIME_SHARE_MS = 2_000;
/** Pixels of movement before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 3;

function pointFromEvent(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
): ScreenPoint {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

type Gesture =
  | { kind: 'pan'; start: ScreenPoint; camera: Camera; moved: boolean }
  | { kind: 'measure'; from: LatLon; to: LatLon };

export function RadarScope({
  session,
  settings,
  onCameraChange,
  onCursorChange,
  selectedId,
  onSelect,
  leaderDirections,
  preview,
  highlightFix,
  ref,
}: RadarScopeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const trafficCanvasRef = useRef<HTMLCanvasElement>(null);

  const cameraRef = useRef<Camera | null>(null);
  const settingsRef = useRef(settings);
  const mapDirtyRef = useRef(true);
  const hitsRef = useRef<TargetHitArea[]>([]);
  const hoveredRef = useRef<string | undefined>(undefined);
  const gestureRef = useRef<Gesture | undefined>(undefined);
  const callbacksRef = useRef({ onCameraChange, onCursorChange, onSelect });
  const selectionRef = useRef({ selectedId, leaderDirections, preview, highlightFix });
  // Automatic data block positions persist between frames so blocks stay put.
  const autoLeaderDirectionsRef = useRef(new Map<string, LeaderDirection>());
  useEffect(() => {
    callbacksRef.current = { onCameraChange, onCursorChange, onSelect };
    selectionRef.current = { selectedId, leaderDirections, preview, highlightFix };
  });

  /** Radius shown when the scope opens or is recentered. */
  const viewRadiusNm = () =>
    Math.min(settingsRef.current['display.scopeRangeNm'], session.pack.boundaryRadiusNm);

  const setCamera = (camera: Camera) => {
    cameraRef.current = camera;
    mapDirtyRef.current = true;
  };

  // Smooth zoom: the camera eases toward a target zoom (keeping the anchor point under the
  // cursor), or glides to a whole new view when recentering.
  const animationRef = useRef<CameraAnimation | undefined>(undefined);
  const instantMotion = () => settingsRef.current['display.uiAnimations'] !== 'full';
  const zoomSmoothly = (anchor: ScreenPoint, zoomChange: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const animation = animationRef.current;
    const fromZoom = animation?.kind === 'zoom' ? animation.zoom : camera.zoom;
    const zoom = clampZoom(fromZoom + zoomChange);
    if (instantMotion()) setCamera(zoomAround(camera, anchor, zoom));
    else animationRef.current = { kind: 'zoom', anchor, zoom };
  };

  // The wheel listener is attached once; it zooms through this ref.
  const zoomSmoothlyRef = useRef(zoomSmoothly);
  useEffect(() => {
    zoomSmoothlyRef.current = zoomSmoothly;
  });

  const fittedCamera = (width: number, height: number): Camera => {
    const base: Camera = { center: session.pack.airspace.center, zoom: 9, width, height };
    return { ...base, zoom: zoomToFit(base, viewRadiusNm() + FIT_MARGIN_NM) };
  };

  useImperativeHandle(ref, () => ({
    zoomBy(steps) {
      const camera = cameraRef.current;
      if (!camera) return;
      zoomSmoothly({ x: camera.width / 2, y: camera.height / 2 }, steps * 0.5);
    },
    recenter() {
      const camera = cameraRef.current;
      if (!camera) return;
      const fitted = fittedCamera(camera.width, camera.height);
      if (instantMotion()) setCamera(fitted);
      else animationRef.current = { kind: 'fly', to: fitted };
    },
  }));

  useEffect(() => {
    settingsRef.current = settings;
    mapDirtyRef.current = true;
  }, [settings]);

  // Canvas sizing (device pixel ratio aware) and the first camera fit.
  useEffect(() => {
    const container = containerRef.current!;
    const canvases = [mapCanvasRef.current!, trafficCanvasRef.current!];
    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      for (const canvas of canvases) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const camera = cameraRef.current;
      setCamera(camera ? { ...camera, width, height } : fittedCamera(width, height));
    });
    observer.observe(container);
    void document.fonts.ready.then(() => (mapDirtyRef.current = true));
    return () => observer.disconnect();
    // The session (and its airspace) is fixed for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop: advance the sim, then draw.
  useEffect(() => {
    const mapContext = mapCanvasRef.current!.getContext('2d')!;
    const trafficContext = trafficCanvasRef.current!.getContext('2d')!;
    const controlledAirports = new Set(session.pack.airspace.airports);
    let last = performance.now();
    let frameId = 0;

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);
      // Clamp so a background tab doesn't try to catch up on minutes of sim time.
      const elapsedMs = Math.min(now - last, 250);
      session.frame(elapsedMs);
      last = now;

      if (cameraRef.current && animationRef.current) {
        const next = stepCameraAnimation(cameraRef.current, animationRef.current, elapsedMs);
        cameraRef.current = next.camera;
        mapDirtyRef.current = true;
        if (next.done) animationRef.current = undefined;
      }

      const camera = cameraRef.current;
      if (!camera || camera.width === 0) return;
      const currentSettings = settingsRef.current;
      const palette = scopePalette(currentSettings);

      if (mapDirtyRef.current) {
        mapDirtyRef.current = false;
        const activeArrivals = new Set(
          Object.entries(session.engine.activeRunways).flatMap(([icao, runways]) =>
            runways.arrivals.map((runway) => `${icao}:${runway}`),
          ),
        );
        drawMapLayer(mapContext, camera, session.pack, currentSettings, palette, activeArrivals);
        callbacksRef.current.onCameraChange?.(camera);
      }

      const gesture = gestureRef.current;
      hitsRef.current = drawTrafficLayer(trafficContext, {
        camera,
        settings: currentSettings,
        palette,
        targets: session.radar.list(),
        playerId: PLAYER_ID,
        airports: controlledAirports,
        trackOf: (id: string) => session.engine.track(id),
        tickSeconds: session.engine.config.tickSeconds,
        simTimeSec: session.engine.displayTimeSec,
        scopeCenter: session.pack.airspace.radar.position,
        // Drawn out to the boundary: the scope shows the whole region's radar picture.
        sweepRadiusNm: Math.max(session.pack.airspace.radar.rangeNm, session.pack.boundaryRadiusNm),
        sweepProgress: session.radar.sweepProgress(session.engine.displayTimeSec),
        timeShare: Math.floor(now / TIME_SHARE_MS) % 2 === 0 ? 0 : 1,
        hoveredId: hoveredRef.current,
        ...selectionRef.current,
        autoLeaderDirections: autoLeaderDirectionsRef.current,
        highlightFix: selectionRef.current.highlightFix
          ? session.pack.fix(selectionRef.current.highlightFix)
          : undefined,
        route: (() => {
          const id = selectionRef.current.selectedId;
          const aircraft = id ? session.engine.getAircraft(id) : undefined;
          return aircraft ? routePreview(aircraft, session.pack) : undefined;
        })(),
        conflicts: session.engine.conflicts,
        nowMs: now,
        measure: gesture?.kind === 'measure' ? gesture : undefined,
        magneticVariationDeg: session.pack.airspace.magneticVariationDeg,
      });
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [session]);

  // Wheel zoom needs a non-passive listener to prevent page scrolling.
  useEffect(() => {
    const canvas = trafficCanvasRef.current!;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const camera = cameraRef.current;
      if (!camera) return;
      const sensitivity = settingsRef.current['controls.zoomSensitivity'];
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const delta = -event.deltaY * (event.ctrlKey ? 0.01 : 0.0022) * sensitivity;
      zoomSmoothlyRef.current(pointFromEvent(event, canvas), delta);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const point = pointFromEvent(event, event.currentTarget);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 2) {
      const at = unproject(camera, point);
      gestureRef.current = { kind: 'measure', from: at, to: at };
    } else if (event.button === 0) {
      // Grabbing the scope stops any zoom in progress where it is.
      animationRef.current = undefined;
      gestureRef.current = { kind: 'pan', start: point, camera, moved: false };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const point = pointFromEvent(event, event.currentTarget);
    const gesture = gestureRef.current;
    callbacksRef.current.onCursorChange?.(unproject(camera, point));

    if (gesture?.kind === 'pan') {
      const dx = point.x - gesture.start.x;
      const dy = point.y - gesture.start.y;
      if (gesture.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        gesture.moved = true;
        setCamera({ ...pan(gesture.camera, dx, dy), width: camera.width, height: camera.height });
      }
    } else if (gesture?.kind === 'measure') {
      gesture.to = unproject(camera, point);
    } else {
      hoveredRef.current = hitTest(hitsRef.current, point);
      event.currentTarget.style.cursor = hoveredRef.current ? 'pointer' : 'crosshair';
    }
  };

  const endGesture = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    gestureRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // A press that didn't become a drag is a click: select the aircraft under it, or clear the selection.
    if (event.type === 'pointerup' && gesture?.kind === 'pan' && !gesture.moved) {
      callbacksRef.current.onSelect(
        hitTest(hitsRef.current, pointFromEvent(event, event.currentTarget)),
      );
    }
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    if (camera) zoomSmoothly(pointFromEvent(event, event.currentTarget), 1);
  };

  return (
    <div ref={containerRef} className="radar-scope">
      <canvas ref={mapCanvasRef} className="radar-scope__layer" />
      <canvas
        ref={trafficCanvasRef}
        className="radar-scope__layer radar-scope__layer--interactive"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onPointerLeave={() => {
          callbacksRef.current.onCursorChange?.(undefined);
          hoveredRef.current = undefined;
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  );
}
