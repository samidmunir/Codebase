import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Camera } from './camera';

// Optional real-world map under the radar display. MapLibre is loaded only when
// the layer is turned on, and follows the scope camera (both use Web Mercator
// with 512 px tiles, so the same center and zoom line up exactly).

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/** Required credit whenever the real-world map is visible. */
export const BASEMAP_ATTRIBUTION = 'OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors';

export interface BasemapHandle {
  sync(camera: Camera): void;
}

interface BasemapProps {
  enabled: boolean;
  opacity: number;
  ref?: Ref<BasemapHandle>;
}

export function Basemap({ enabled, opacity, ref }: BasemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const apply = () => {
    const map = mapRef.current;
    const camera = cameraRef.current;
    if (map && camera)
      map.jumpTo({ center: [camera.center.lon, camera.center.lat], zoom: camera.zoom });
  };

  useImperativeHandle(ref, () => ({
    sync(camera) {
      cameraRef.current = camera;
      apply();
    },
  }));

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let map: MapLibreMap | undefined;

    void (async () => {
      const [maplibre, { default: workerUrl }] = await Promise.all([
        import('maplibre-gl'),
        // Let Vite bundle the worker (and the chunk it imports) instead of relying
        // on MapLibre's relative worker path, which dependency pre-bundling breaks.
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ]);
      maplibre.setWorkerUrl(workerUrl);
      if (cancelled || !containerRef.current) return;
      map = new maplibre.Map({
        container: containerRef.current,
        style: STYLE_URL,
        interactive: false,
        // Attribution is shown in the scope footer (see BASEMAP_ATTRIBUTION).
        attributionControl: false,
        fadeDuration: 0,
      });
      mapRef.current = map;
      apply();
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={containerRef} className="basemap" style={{ opacity: opacity / 100 }} />;
}
