// Web Mercator camera, using the same conventions as MapLibre (512 px tiles),
// so the optional real-world map lines up exactly with the radar display.

export const TILE_SIZE = 512;
export const MIN_ZOOM = 6.5;
export const MAX_ZOOM = 13.5;

const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * 6_378_137;
const METERS_PER_NM = 1852;
const MAX_LATITUDE = 85.051129;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Camera {
  center: LatLon;
  zoom: number;
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
}

const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

function mercatorX(lon: number, size: number): number {
  return ((lon + 180) / 360) * size;
}

function mercatorY(lat: number, size: number): number {
  const phi = (Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size;
}

/** Projects a geographic position to viewport pixels. */
export function project(camera: Camera, point: LatLon): ScreenPoint {
  const size = worldSize(camera.zoom);
  return {
    x: mercatorX(point.lon, size) - mercatorX(camera.center.lon, size) + camera.width / 2,
    y: mercatorY(point.lat, size) - mercatorY(camera.center.lat, size) + camera.height / 2,
  };
}

/** Converts viewport pixels back to a geographic position. */
export function unproject(camera: Camera, point: ScreenPoint): LatLon {
  const size = worldSize(camera.zoom);
  const x = mercatorX(camera.center.lon, size) + point.x - camera.width / 2;
  const y = mercatorY(camera.center.lat, size) + point.y - camera.height / 2;
  const lon = (x / size) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI;
  return { lat, lon };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Moves the view by a pixel offset (e.g. a drag). */
export function pan(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    center: unproject(camera, { x: camera.width / 2 - dx, y: camera.height / 2 - dy }),
  };
}

/** Zooms while keeping the geographic point under `anchor` fixed on screen. */
export function zoomAround(camera: Camera, anchor: ScreenPoint, zoom: number): Camera {
  const target = unproject(camera, anchor);
  const zoomed = { ...camera, zoom: clampZoom(zoom) };
  const moved = project(zoomed, target);
  return pan(zoomed, anchor.x - moved.x, anchor.y - moved.y);
}

/** Pixels per nautical mile at the camera's center latitude. */
export function pixelsPerNm(camera: Camera): number {
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_M * Math.cos((camera.center.lat * Math.PI) / 180)) /
    worldSize(camera.zoom);
  return METERS_PER_NM / metersPerPixel;
}

/** The zoom at which `radiusNm` fits in the smaller viewport dimension. */
export function zoomToFit(camera: Camera, radiusNm: number): number {
  const current = pixelsPerNm(camera);
  const wanted = Math.min(camera.width, camera.height) / 2 / radiusNm;
  return clampZoom(camera.zoom + Math.log2(wanted / current));
}
