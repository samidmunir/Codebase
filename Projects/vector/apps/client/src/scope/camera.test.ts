import { describe, expect, it } from 'vitest';
import { pan, pixelsPerNm, project, unproject, zoomAround, zoomToFit, type Camera } from './camera';

const camera: Camera = { center: { lat: 40.72, lon: -73.95 }, zoom: 9, width: 1200, height: 800 };

describe('camera', () => {
  it('puts the center in the middle of the viewport', () => {
    expect(project(camera, camera.center)).toEqual({ x: 600, y: 400 });
  });

  it('round-trips project and unproject', () => {
    const jfk = { lat: 40.6398, lon: -73.7789 };
    const back = unproject(camera, project(camera, jfk));
    expect(back.lat).toBeCloseTo(jfk.lat, 9);
    expect(back.lon).toBeCloseTo(jfk.lon, 9);
  });

  it('puts north up and east right', () => {
    const north = project(camera, { lat: 41, lon: -73.95 });
    const east = project(camera, { lat: 40.72, lon: -73 });
    expect(north.y).toBeLessThan(400);
    expect(east.x).toBeGreaterThan(600);
  });

  it('matches MapLibre scale: 512 px per world at zoom 0', () => {
    const world: Camera = { center: { lat: 0, lon: 0 }, zoom: 0, width: 512, height: 512 };
    expect(project(world, { lat: 0, lon: 180 }).x).toBeCloseTo(512, 9);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const anchor = { x: 900, y: 250 };
    const before = unproject(camera, anchor);
    const zoomed = zoomAround(camera, anchor, 11);
    const after = project(zoomed, before);
    expect(after.x).toBeCloseTo(900, 6);
    expect(after.y).toBeCloseTo(250, 6);
  });

  it('pans with the drag direction', () => {
    const moved = pan(camera, 100, 0);
    // Dragging right moves the map right, so the center moves west.
    expect(moved.center.lon).toBeLessThan(camera.center.lon);
  });

  it('fits a radius into the viewport', () => {
    const fitted = { ...camera, zoom: zoomToFit(camera, 50) };
    expect(pixelsPerNm(fitted) * 50).toBeCloseTo(400, 3);
  });
});
