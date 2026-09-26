import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { UserSettings } from '@vector/shared';
import { distanceNm, type LatLon } from '@vector/sim-core';
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
import { drawMapLayer } from './render/map-layer';
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
  const selectionRef = useRef({ selectedId, leaderDirections, preview });
  useEffect(() => {
    callbacksRef.current = { onCameraChange, onCursorChange, onSelect };
    selectionRef.current = { selectedId, leaderDirections, preview };
  });

  const boundaryRadiusNm = () => {
    const [lon, lat] = session.pack.airspace.boundary.ring[0]!;
    return distanceNm(session.pack.airspace.center, { lat, lon });
  };

  const setCamera = (camera: Camera) => {
    cameraRef.current = camera;
    mapDirtyRef.current = true;
  };

  const fittedCamera = (width: number, height: number): Camera => {
    const base: Camera = { center: session.pack.airspace.center, zoom: 9, width, height };
    return { ...base, zoom: zoomToFit(base, boundaryRadiusNm() + FIT_MARGIN_NM) };
  };

  useImperativeHandle(ref, () => ({
    zoomBy(steps) {
      const camera = cameraRef.current;
      if (!camera) return;
      setCamera(
        zoomAround(
          camera,
          { x: camera.width / 2, y: camera.height / 2 },
          camera.zoom + steps * 0.5,
        ),
      );
    },
    recenter() {
      const camera = cameraRef.current;
      if (camera) setCamera(fittedCamera(camera.width, camera.height));
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
    let last = performance.now();
    let frameId = 0;

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);
      // Clamp so a background tab doesn't try to catch up on minutes of sim time.
      session.frame(Math.min(now - last, 250));
      last = now;

      const camera = cameraRef.current;
      if (!camera || camera.width === 0) return;
      const currentSettings = settingsRef.current;
      const palette = scopePalette(currentSettings);

      if (mapDirtyRef.current) {
        mapDirtyRef.current = false;
        drawMapLayer(mapContext, camera, session.pack, currentSettings, palette);
        callbacksRef.current.onCameraChange?.(camera);
      }

      const gesture = gestureRef.current;
      hitsRef.current = drawTrafficLayer(trafficContext, {
        camera,
        settings: currentSettings,
        palette,
        targets: session.radar.list(),
        playerId: PLAYER_ID,
        scopeCenter: session.pack.airspace.radar.position,
        sweepRadiusNm: session.pack.airspace.radar.rangeNm,
        sweepProgress: session.radar.sweepProgress(session.engine.displayTimeSec),
        timeShare: Math.floor(now / TIME_SHARE_MS) % 2 === 0 ? 0 : 1,
        hoveredId: hoveredRef.current,
        ...selectionRef.current,
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
      setCamera(zoomAround(camera, pointFromEvent(event, canvas), clampZoom(camera.zoom + delta)));
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
    if (camera)
      setCamera(zoomAround(camera, pointFromEvent(event, event.currentTarget), camera.zoom + 1));
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
