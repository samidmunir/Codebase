import type { UserSettings } from '@vector/shared';
import {
  destinationPoint,
  distanceNm,
  magneticToTrue,
  normalizeHeading,
  type AirspacePack,
} from '@vector/sim-core';
import { pixelsPerNm, project, type Camera } from '../camera';
import { shortAirport } from '../data-block';
import type { ScopePalette } from './palette';

type Point = [number, number];

const FINAL_COURSE_NM = 12;
const MAX_RANGE_RING_NM = 60;
/** Pixels per NM above which fix names are drawn (below, they clutter the scope). */
const WAYPOINT_LABEL_SCALE = 18;
const NAVAID_LABEL_SCALE = 8;

/** Draws the video map: everything that only changes with the view or settings. */
export function drawMapLayer(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  pack: AirspacePack,
  settings: UserSettings,
  palette: ScopePalette,
): void {
  ctx.clearRect(0, 0, camera.width, camera.height);
  const scale = pixelsPerNm(camera);
  const toScreen = ([lon, lat]: Point) => project(camera, { lat, lon });

  const strokePath = (points: readonly Point[], close = false) => {
    ctx.beginPath();
    points.forEach((point, i) => {
      const { x, y } = toScreen(point);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (settings['map.minimumVectoringAltitudes']) {
    ctx.strokeStyle = palette.mva;
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.mva;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const sector of pack.videoMap.minimumVectoringAltitudes) {
      strokePath(sector.exterior, true);
      if (scale > 6) {
        const [lon, lat] = sector.exterior
          .reduce<Point>(([a, b], [x, y]) => [a + x, b + y], [0, 0])
          .map((sum) => sum / sector.exterior.length) as Point;
        const { x, y } = toScreen([lon, lat]);
        ctx.fillText(String(sector.minimumAltitudeFt / 100), x, y);
      }
    }
  }

  if (settings['map.geography']) {
    ctx.strokeStyle = palette.mapLines;
    ctx.lineWidth = 1;
    for (const line of pack.videoMap.shoreline) strokePath(line);
  }

  if (settings['map.classB']) {
    ctx.strokeStyle = palette.classB;
    ctx.lineWidth = 1;
    for (const area of pack.videoMap.classB) strokePath(area.ring, true);
  }

  if (settings['display.rangeRings']) {
    const spacing = settings['display.rangeRingSpacingNm'];
    ctx.strokeStyle = palette.rangeRing;
    ctx.lineWidth = 1;
    const center = project(camera, pack.airspace.center);
    for (let radius = spacing; radius <= MAX_RANGE_RING_NM; radius += spacing) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (settings['map.sectorBoundary']) {
    ctx.strokeStyle = palette.boundary;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    strokePath(pack.airspace.boundary.ring, true);
    ctx.setLineDash([]);
  }

  const variation = pack.airspace.magneticVariationDeg;

  if (settings['map.finalApproachCourses']) {
    ctx.strokeStyle = palette.finalCourse;
    ctx.lineWidth = 1;
    for (const airport of pack.airports) {
      for (const runway of airport.runways) {
        if (!runway.ils) continue;
        const outbound = normalizeHeading(magneticToTrue(runway.ils.courseDeg, variation) + 180);
        const start = project(camera, runway.threshold);
        const end = project(camera, destinationPoint(runway.threshold, outbound, FINAL_COURSE_NM));
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Mile ticks, longer every 5 NM, once zoomed in enough to read them.
        if (scale < 5) continue;
        const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
        for (let nm = 1; nm <= FINAL_COURSE_NM; nm++) {
          const tick = project(camera, destinationPoint(runway.threshold, outbound, nm));
          const half = nm % 5 === 0 ? 5 : 2.5;
          ctx.beginPath();
          ctx.moveTo(tick.x - Math.cos(angle) * half, tick.y - Math.sin(angle) * half);
          ctx.lineTo(tick.x + Math.cos(angle) * half, tick.y + Math.sin(angle) * half);
          ctx.stroke();
        }
      }
    }
  }

  if (settings['map.fixes']) {
    const radius = distanceNm(pack.airspace.center, {
      lon: pack.airspace.boundary.ring[0]![0],
      lat: pack.airspace.boundary.ring[0]![1],
    });
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (const fix of pack.fixes) {
      if (distanceNm(pack.airspace.center, fix.position) > radius + 5) continue;
      const { x, y } = project(camera, fix.position);
      if (x < -20 || y < -20 || x > camera.width + 20 || y > camera.height + 20) continue;
      const color = fix.kind === 'waypoint' ? palette.fix : palette.vor;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (fix.kind === 'waypoint') {
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 3, y + 2);
        ctx.lineTo(x - 3, y + 2);
        ctx.closePath();
      } else {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          if (i === 0) ctx.moveTo(x + 4 * Math.cos(a), y + 4 * Math.sin(a));
          else ctx.lineTo(x + 4 * Math.cos(a), y + 4 * Math.sin(a));
        }
        ctx.closePath();
      }
      ctx.stroke();
      if (scale > WAYPOINT_LABEL_SCALE || (fix.kind !== 'waypoint' && scale > NAVAID_LABEL_SCALE)) {
        ctx.fillText(fix.ident, x + 5, y - 3);
      }
    }
  }

  if (settings['map.runways']) {
    ctx.strokeStyle = palette.runway;
    ctx.lineCap = 'butt';
    for (const airport of pack.airports) {
      for (const runway of airport.runways) {
        if (runway.id > runway.oppositeId) continue; // draw each runway once
        const opposite = airport.runways.find((r) => r.id === runway.oppositeId)!;
        const a = project(camera, runway.threshold);
        const b = project(camera, opposite.threshold);
        ctx.lineWidth = Math.max(2.5, Math.min(6, (runway.widthFt / 6076) * scale));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
  }

  if (settings['map.airportLabels']) {
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = palette.airportLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const airport of pack.airports) {
      const { x, y } = project(camera, airport.position);
      ctx.fillText(shortAirport(airport.icao), x + 14, y - 14);
    }
  }
}
