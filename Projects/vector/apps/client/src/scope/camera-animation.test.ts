import { describe, expect, it } from 'vitest';
import type { Camera } from './camera';
import { stepCameraAnimation } from './camera-animation';

const camera: Camera = { center: { lat: 40.7, lon: -73.9 }, zoom: 8, width: 1000, height: 800 };

describe('camera animation', () => {
  it('eases the zoom toward its target over a few frames instead of jumping', () => {
    const animation = { kind: 'zoom' as const, anchor: { x: 500, y: 400 }, zoom: 9 };
    const first = stepCameraAnimation(camera, animation, 16);
    expect(first.camera.zoom).toBeGreaterThan(8);
    expect(first.camera.zoom).toBeLessThan(8.5);
    expect(first.done).toBe(false);
    let current = first.camera;
    let frames = 1;
    for (; frames < 120; frames++) {
      const next = stepCameraAnimation(current, animation, 16);
      current = next.camera;
      if (next.done) break;
    }
    expect(current.zoom).toBe(9);
    // About a third of a second at 60 fps.
    expect(frames).toBeLessThan(40);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const animation = { kind: 'zoom' as const, anchor: { x: 500, y: 400 }, zoom: 10 };
    const { camera: next } = stepCameraAnimation(camera, animation, 16);
    // The anchor is the screen center here, so the center stays put.
    expect(next.center.lat).toBeCloseTo(camera.center.lat, 6);
    expect(next.center.lon).toBeCloseTo(camera.center.lon, 6);
  });

  it('glides to a new view when recentering', () => {
    const to: Camera = { ...camera, center: { lat: 41, lon: -74 }, zoom: 7 };
    let current = camera;
    let done = false;
    for (let i = 0; i < 200 && !done; i++)
      ({ camera: current, done } = stepCameraAnimation(current, { kind: 'fly', to }, 16));
    expect(done).toBe(true);
    expect(current).toEqual(to);
  });
});
