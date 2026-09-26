import { zoomAround, type Camera, type ScreenPoint } from './camera';

// Smooth zoom and recentering: the camera eases toward its target each frame.

export type CameraAnimation =
  { kind: 'zoom'; anchor: ScreenPoint; zoom: number } | { kind: 'fly'; to: Camera };

/** Time constant of the zoom easing: about 95% of the way there in 3× this. */
const ZOOM_EASE_MS = 70;
const FLY_EASE_MS = 110;

/** Advances a camera animation by `elapsedMs` with exponential easing. */
export function stepCameraAnimation(
  camera: Camera,
  animation: CameraAnimation,
  elapsedMs: number,
): { camera: Camera; done: boolean } {
  if (animation.kind === 'zoom') {
    const k = 1 - Math.exp(-elapsedMs / ZOOM_EASE_MS);
    const remaining = animation.zoom - camera.zoom;
    const done = Math.abs(remaining) < 0.002;
    const zoom = done ? animation.zoom : camera.zoom + remaining * k;
    return { camera: zoomAround(camera, animation.anchor, zoom), done };
  }
  const k = 1 - Math.exp(-elapsedMs / FLY_EASE_MS);
  const { to } = animation;
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const done =
    Math.abs(to.zoom - camera.zoom) < 0.002 &&
    Math.abs(to.center.lat - camera.center.lat) < 1e-5 &&
    Math.abs(to.center.lon - camera.center.lon) < 1e-5;
  return {
    camera: done
      ? { ...to, width: camera.width, height: camera.height }
      : {
          ...camera,
          zoom: lerp(camera.zoom, to.zoom),
          center: {
            lat: lerp(camera.center.lat, to.center.lat),
            lon: lerp(camera.center.lon, to.center.lon),
          },
        },
    done,
  };
}
