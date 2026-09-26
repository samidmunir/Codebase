import type { UserSettings } from '@vector/shared';
import { bearingTrue, distanceNm, trueToMagnetic, type LatLon } from '@vector/sim-core';
import { pixelsPerNm, project, type Camera, type ScreenPoint } from '../camera';
import { dataBlockLines } from '../data-block';
import type { RadarTarget } from '../radar-tracker';
import { withAlpha, type ScopePalette } from './palette';

/** Pixels per leader line length step (STARS uses discrete lengths). */
const LEADER_STEP_PX = 12;
const SWEEP_WEDGE_RAD = (55 * Math.PI) / 180;

export interface TrafficFrame {
  camera: Camera;
  settings: UserSettings;
  palette: ScopePalette;
  targets: readonly RadarTarget[];
  /** Controller the player works as; their aircraft are drawn bright. */
  playerId: string;
  /** Radar antenna the sweep rotates around, and its range. */
  scopeCenter: LatLon;
  sweepRadiusNm: number;
  /** 0..1 progress of the current radar sweep. */
  sweepProgress: number;
  /** Alternates data block line 2. */
  timeShare: 0 | 1;
  hoveredId: string | undefined;
  measure: { from: LatLon; to: LatLon } | undefined;
  magneticVariationDeg: number;
}

export interface TargetHitArea {
  id: string;
  center: ScreenPoint;
  /** Data block rectangle. */
  block: { x: number; y: number; width: number; height: number };
}

/** Draws everything that changes every frame. Returns hit areas for pointer interaction. */
export function drawTrafficLayer(
  ctx: CanvasRenderingContext2D,
  frame: TrafficFrame,
): TargetHitArea[] {
  const { camera, settings, palette } = frame;
  ctx.clearRect(0, 0, camera.width, camera.height);

  if (settings['display.sweepEffect']) drawSweep(ctx, frame);

  const fontSize = settings['display.dataBlockFontSize'];
  const lineHeight = Math.round(fontSize * 1.25);
  const leaderLength = settings['display.leaderLineLength'] * LEADER_STEP_PX;
  const trailLength = settings['display.historyTrailLength'];
  ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const hits: TargetHitArea[] = [];
  // Other controllers' traffic first, so the player's aircraft draw on top.
  const ordered = [...frame.targets].sort(
    (a, b) => Number(a.owner === frame.playerId) - Number(b.owner === frame.playerId),
  );

  for (const target of ordered) {
    const owned = target.owner === frame.playerId;
    const hovered = target.id === frame.hoveredId;
    const color = owned ? palette.targets : palette.unowned;
    const position = project(camera, target.position);

    // History trail, fading with age.
    for (let i = 0; i < Math.min(trailLength, target.history.length); i++) {
      const point = project(camera, target.history[i]!);
      ctx.fillStyle = withAlpha(color, 0.55 * (1 - i / (trailLength + 1)));
      ctx.beginPath();
      ctx.arc(point.x, point.y, owned ? 2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Position symbol.
    ctx.save();
    if (owned) {
      ctx.shadowColor = color;
      ctx.shadowBlur = hovered ? 18 : 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(position.x, position.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(position.x, position.y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    if (hovered) {
      ctx.strokeStyle = withAlpha(palette.hover, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Leader line to the northeast, then the data block.
    const direction = -Math.PI / 4;
    const lineEnd = {
      x: position.x + Math.cos(direction) * (leaderLength + 6),
      y: position.y + Math.sin(direction) * (leaderLength + 6),
    };
    if (leaderLength > 0) {
      ctx.strokeStyle = withAlpha(color, owned ? 0.8 : 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x + Math.cos(direction) * 6, position.y + Math.sin(direction) * 6);
      ctx.lineTo(lineEnd.x, lineEnd.y);
      ctx.stroke();
    }

    const lines = dataBlockLines(target, frame.timeShare);
    const blockX = lineEnd.x + 3;
    const blockY = lineEnd.y - lineHeight * 1.5;
    ctx.save();
    ctx.fillStyle = owned ? (hovered ? palette.hover : palette.dataBlocks) : palette.unownedText;
    if (owned) {
      ctx.shadowColor = withAlpha(palette.dataBlocks, 0.5);
      ctx.shadowBlur = 6;
    }
    lines.forEach((text, i) => ctx.fillText(text, blockX, blockY + i * lineHeight));
    ctx.restore();

    const width = Math.max(...lines.map((text) => ctx.measureText(text).width));
    hits.push({
      id: target.id,
      center: position,
      block: { x: blockX, y: blockY, width, height: lineHeight * lines.length },
    });
  }

  if (frame.measure) drawMeasure(ctx, frame);
  return hits;
}

function drawSweep(ctx: CanvasRenderingContext2D, frame: TrafficFrame): void {
  const { camera, palette } = frame;
  const center = project(camera, frame.scopeCenter);
  const radius = frame.sweepRadiusNm * pixelsPerNm(camera);
  const angle = -Math.PI / 2 + frame.sweepProgress * Math.PI * 2;

  const gradient = ctx.createConicGradient(angle - SWEEP_WEDGE_RAD, center.x, center.y);
  const wedge = SWEEP_WEDGE_RAD / (Math.PI * 2);
  gradient.addColorStop(0, `rgba(${palette.sweep}, 0)`);
  gradient.addColorStop(wedge * 0.999, `rgba(${palette.sweep}, 0.10)`);
  gradient.addColorStop(wedge, `rgba(${palette.sweep}, 0)`);
  gradient.addColorStop(1, `rgba(${palette.sweep}, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(${palette.sweep}, 0.28)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
  ctx.stroke();
}

function drawMeasure(ctx: CanvasRenderingContext2D, frame: TrafficFrame): void {
  const { camera, palette, measure } = frame;
  if (!measure) return;
  const a = project(camera, measure.from);
  const b = project(camera, measure.to);
  const bearing =
    Math.round(trueToMagnetic(bearingTrue(measure.from, measure.to), frame.magneticVariationDeg)) %
    360;
  const label = `${String(bearing || 360).padStart(3, '0')}° ${distanceNm(measure.from, measure.to).toFixed(1)} NM`;

  ctx.strokeStyle = palette.measure;
  ctx.fillStyle = palette.measure;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '600 12px "JetBrains Mono", monospace';
  const width = ctx.measureText(label).width + 14;
  const x = b.x + 12;
  const y = b.y - 26;
  ctx.fillStyle = 'rgba(10, 16, 22, 0.88)';
  ctx.strokeStyle = withAlpha(palette.measure, 0.6);
  ctx.beginPath();
  ctx.roundRect(x, y, width, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.measure;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 7, y + 11);
}

/** The target under a screen point, checking symbols first, then data blocks. */
export function hitTest(hits: readonly TargetHitArea[], point: ScreenPoint): string | undefined {
  let best: { id: string; distance: number } | undefined;
  for (const hit of hits) {
    const distance = Math.hypot(hit.center.x - point.x, hit.center.y - point.y);
    if (distance <= 12 && (!best || distance < best.distance)) best = { id: hit.id, distance };
  }
  if (best) return best.id;
  for (let i = hits.length - 1; i >= 0; i--) {
    const { block, id } = hits[i]!;
    if (
      point.x >= block.x &&
      point.x <= block.x + block.width &&
      point.y >= block.y &&
      point.y <= block.y + block.height
    ) {
      return id;
    }
  }
  return undefined;
}
