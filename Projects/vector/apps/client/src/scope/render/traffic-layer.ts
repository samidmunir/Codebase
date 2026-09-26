import type { UserSettings } from '@vector/shared';
import {
  bearingTrue,
  destinationPoint,
  distanceNm,
  magneticToTrue,
  toRadians,
  trueToMagnetic,
  type LatLon,
} from '@vector/sim-core';
import { pixelsPerNm, project, type Camera, type ScreenPoint } from '../camera';
import { dataBlockLines } from '../data-block';
import type { RadarTarget } from '../radar-tracker';
import type { RoutePreview } from '../route-preview';
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
  selectedId: string | undefined;
  /** Data block position per aircraft (0 = north, clockwise in 45° steps). Default northeast. */
  leaderDirections: ReadonlyMap<string, LeaderDirection>;
  /** Preview of the instruction being composed for the selected aircraft. */
  preview: InstructionPreview | undefined;
  /** The route the selected aircraft is flying. */
  route: RoutePreview | undefined;
  /** Conflict Alert state per aircraft, and the conflicting pairs. */
  conflicts: readonly {
    aircraftIds: readonly [string, string];
    kind: 'predicted' | 'loss';
    lateralNm: number;
    verticalFt: number;
  }[];
  /** Real time in ms, for flashing alerts. */
  nowMs: number;
  measure: { from: LatLon; to: LatLon } | undefined;
  magneticVariationDeg: number;
}

export type LeaderDirection = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const DEFAULT_LEADER_DIRECTION: LeaderDirection = 1;

export interface InstructionPreview {
  /** Magnetic heading being assigned. */
  headingDeg?: number;
  /** Fix being assigned direct. */
  directTo?: LatLon;
}

/** Length of the heading vector beyond the target symbol. */
const HEADING_VECTOR_PX = 16;
/** Heading preview line length. */
const PREVIEW_NM = 10;

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
  if (frame.route) drawRoute(ctx, frame, frame.route);

  // Conflict Alert state per aircraft: an actual loss outranks a prediction.
  const alertOf = new Map<string, 'predicted' | 'loss'>();
  for (const conflict of frame.conflicts) {
    for (const id of conflict.aircraftIds) {
      if (alertOf.get(id) !== 'loss') alertOf.set(id, conflict.kind);
    }
  }
  const flashOn = Math.floor(frame.nowMs / 400) % 2 === 0;
  drawConflictLines(ctx, frame);

  const fontSize = settings['display.dataBlockFontSize'];
  const lineHeight = Math.round(fontSize * 1.25);
  const leaderLength = settings['display.leaderLineLength'] * LEADER_STEP_PX;
  const trailLength = settings['display.historyTrailLength'];
  ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const hits: TargetHitArea[] = [];
  // Other controllers' traffic first, then the player's, then the selected aircraft on top.
  const rank = (target: RadarTarget) =>
    target.id === frame.selectedId ? 2 : target.owner === frame.playerId ? 1 : 0;
  const ordered = [...frame.targets].sort((a, b) => rank(a) - rank(b));

  for (const target of ordered) {
    const owned = target.owner === frame.playerId;
    const hovered = target.id === frame.hoveredId;
    const selected = target.id === frame.selectedId;
    const alert = alertOf.get(target.id);
    const color = alert === 'loss' ? palette.alert : owned ? palette.targets : palette.unowned;
    const position = project(camera, target.position);

    // History trail, fading with age.
    for (let i = 0; i < Math.min(trailLength, target.history.length); i++) {
      const point = project(camera, target.history[i]!);
      ctx.fillStyle = withAlpha(color, 0.55 * (1 - i / (trailLength + 1)));
      ctx.beginPath();
      ctx.arc(point.x, point.y, owned ? 2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heading vector: a short line in the direction the aircraft is pointing (true, north-up scope).
    if (settings['display.headingVector']) {
      const heading = toRadians(magneticToTrue(target.headingDeg, frame.magneticVariationDeg));
      const [dx, dy] = [Math.sin(heading), -Math.cos(heading)];
      ctx.strokeStyle = withAlpha(color, owned ? 0.9 : 0.55);
      ctx.lineWidth = owned ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(position.x + dx * 6, position.y + dy * 6);
      ctx.lineTo(
        position.x + dx * (6 + HEADING_VECTOR_PX),
        position.y + dy * (6 + HEADING_VECTOR_PX),
      );
      ctx.stroke();
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

    if (hovered || selected) {
      ctx.strokeStyle = selected ? palette.hover : withAlpha(palette.hover, 0.6);
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(position.x, position.y, selected ? 11 : 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Leader line, then the data block on the chosen side.
    const direction = frame.leaderDirections.get(target.id) ?? DEFAULT_LEADER_DIRECTION;
    const angle = -Math.PI / 2 + (direction * Math.PI) / 4;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    const lineEnd = {
      x: position.x + cos * (leaderLength + 6),
      y: position.y + sin * (leaderLength + 6),
    };
    if (leaderLength > 0) {
      ctx.strokeStyle = withAlpha(color, owned ? 0.8 : 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x + cos * 6, position.y + sin * 6);
      ctx.lineTo(lineEnd.x, lineEnd.y);
      ctx.stroke();
    }

    const lines = dataBlockLines(target, frame.timeShare, settings['display.dataBlockStyle']);
    const width = Math.max(...lines.map((text) => ctx.measureText(text).width));
    const height = lineHeight * lines.length;
    const blockX =
      cos > 0.3 ? lineEnd.x + 3 : cos < -0.3 ? lineEnd.x - 3 - width : lineEnd.x - width / 2;
    const blockY = sin < -0.3 ? lineEnd.y - height : sin > 0.3 ? lineEnd.y : lineEnd.y - height / 2;

    if (selected) {
      ctx.fillStyle = 'rgba(6, 12, 16, 0.78)';
      ctx.strokeStyle = withAlpha(palette.hover, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(blockX - 5, blockY - 3, width + 10, height + 4, 4);
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.fillStyle = owned
      ? hovered || selected
        ? palette.hover
        : palette.dataBlocks
      : palette.unownedText;
    if (owned) {
      ctx.shadowColor = withAlpha(palette.dataBlocks, 0.5);
      ctx.shadowBlur = 6;
    }
    lines.forEach((text, i) => {
      // Type and destination (the expanded style's third line) are secondary: dim them.
      ctx.globalAlpha = i === 2 ? 0.65 : 1;
      ctx.fillText(text, blockX, blockY + i * lineHeight);
    });
    ctx.restore();

    // Conflict Alert: 'CA' above the data block, flashing for an actual loss of separation.
    if (alert && (alert === 'predicted' || flashOn)) {
      ctx.save();
      ctx.fillStyle = alert === 'loss' ? palette.alert : palette.caution;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.fillText('CA', blockX, blockY - lineHeight);
      ctx.restore();
    }

    hits.push({ id: target.id, center: position, block: { x: blockX, y: blockY, width, height } });
    if (selected && frame.preview) drawPreview(ctx, frame, target.position, frame.preview);
  }

  if (frame.measure) drawMeasure(ctx, frame);
  return hits;
}

function drawRoute(ctx: CanvasRenderingContext2D, frame: TrafficFrame, route: RoutePreview): void {
  const { camera, palette } = frame;
  const polyline = (points: readonly LatLon[]) => {
    ctx.beginPath();
    points.forEach((point, i) => {
      const { x, y } = project(camera, point);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = palette.route;
  ctx.shadowBlur = 6;

  if (route.onward.length >= 2) {
    ctx.strokeStyle = withAlpha(palette.route, 0.35);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 6]);
    polyline(route.onward);
  }
  if (route.headingTail) {
    ctx.strokeStyle = withAlpha(palette.route, 0.55);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([8, 6]);
    polyline([route.headingTail.from, route.headingTail.to]);
  }
  if (route.path.length >= 2) {
    ctx.strokeStyle = withAlpha(palette.route, 0.8);
    ctx.lineWidth = 1.75;
    ctx.setLineDash([]);
    polyline(route.path);
  }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  for (const fix of route.fixes) {
    const { x, y } = project(camera, fix.position);
    ctx.fillStyle = palette.route;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y + 3);
    ctx.lineTo(x - 5, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillText(fix.ident, x + 7, y - 3);
    if (fix.note) {
      ctx.fillStyle = withAlpha(palette.route, 0.7);
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillText(fix.note, x + 7, y + 9);
      ctx.font = '600 11px "JetBrains Mono", monospace';
    }
  }
  ctx.restore();
}

function drawConflictLines(ctx: CanvasRenderingContext2D, frame: TrafficFrame): void {
  const { camera, palette } = frame;
  const positions = new Map(frame.targets.map((target) => [target.id, target.position]));
  for (const conflict of frame.conflicts) {
    const a = positions.get(conflict.aircraftIds[0]);
    const b = positions.get(conflict.aircraftIds[1]);
    if (!a || !b) continue;
    const pa = project(camera, a);
    const pb = project(camera, b);
    const color = conflict.kind === 'loss' ? palette.alert : palette.caution;
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.75);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `${conflict.lateralNm.toFixed(1)} NM ${String(Math.round(conflict.verticalFt / 100)).padStart(2, '0')}`;
    ctx.fillText(label, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 10);
    ctx.restore();
  }
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  frame: TrafficFrame,
  from: LatLon,
  preview: InstructionPreview,
): void {
  const { camera, palette } = frame;
  const start = project(camera, from);
  const end =
    preview.directTo ??
    (preview.headingDeg !== undefined
      ? destinationPoint(
          from,
          magneticToTrue(preview.headingDeg, frame.magneticVariationDeg),
          PREVIEW_NM,
        )
      : undefined);
  if (!end) return;
  const target = project(camera, end);

  ctx.save();
  ctx.strokeStyle = palette.measure;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 5]);
  ctx.shadowColor = palette.measure;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (preview.directTo) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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
