import {
  controllerPhrase,
  inSpokenOrder,
  spokenCallsign,
  capitalize,
  type AircraftState,
  type AirspacePack,
  type AtcCommand,
} from '@vector/sim-core';
import type { InstructionPreview } from '../scope/render/traffic-layer';
import { centerHandoff, ilsClearance } from './command-options';

/** An instruction being composed in the command panel. */
export interface InstructionDraft {
  heading?: { headingDeg: number; turn: 'left' | 'right' | 'shortest' } | undefined;
  directTo?: string | undefined;
  altitudeFt?: number | undefined;
  /** "Descend via" the arrival being flown (instead of an altitude). */
  descendVia?: boolean | undefined;
  /** "Climb via" the departure being flown; with an altitude, "except maintain" it. */
  climbVia?: boolean | undefined;
  speed?: number | 'normal' | undefined;
  ilsRunway?: string | undefined;
  handoff?: boolean | undefined;
}

export const EMPTY_DRAFT: InstructionDraft = {};

export function isEmptyDraft(draft: InstructionDraft): boolean {
  return Object.values(draft).every((value) => value === undefined || value === false);
}

/** Turns a draft into engine commands, resolving fixes, approaches and frequencies from the airspace. */
export function draftCommands(
  draft: InstructionDraft,
  pack: AirspacePack,
  aircraft: Readonly<AircraftState>,
): AtcCommand[] {
  const commands: AtcCommand[] = [];
  if (draft.heading) commands.push({ type: 'heading', ...draft.heading });
  if (draft.directTo) {
    const fix = pack.fix(draft.directTo);
    if (fix) commands.push({ type: 'directTo', fix: fix.ident, position: fix.position });
  }
  if (draft.climbVia && aircraft.navigation.mode === 'procedure')
    commands.push({
      type: 'climbVia',
      procedure: aircraft.navigation.name,
      ...(draft.altitudeFt !== undefined ? { exceptMaintainFt: draft.altitudeFt } : {}),
    });
  else if (draft.altitudeFt !== undefined)
    commands.push({ type: 'altitude', altitudeFt: draft.altitudeFt });
  else if (draft.descendVia && aircraft.navigation.mode === 'procedure')
    commands.push({ type: 'descendVia', procedure: aircraft.navigation.name });
  if (draft.speed === 'normal') commands.push({ type: 'resumeNormalSpeed' });
  else if (draft.speed !== undefined) commands.push({ type: 'speed', iasKts: draft.speed });
  if (draft.ilsRunway) {
    const clearance = ilsClearance(pack, aircraft.flightPlan.destination, draft.ilsRunway);
    if (clearance) commands.push({ type: 'clearedIls', clearance });
  }
  if (draft.handoff) {
    const handoff = centerHandoff(pack, aircraft);
    if (handoff) commands.push(handoff);
  }
  return commands;
}

/** Exactly what the controller will say. */
export function transmissionText(
  commands: readonly AtcCommand[],
  aircraft: Readonly<AircraftState>,
): string {
  if (commands.length === 0) return '';
  const phrases = inSpokenOrder(commands).map((command) => controllerPhrase(command, aircraft));
  return `${capitalize(spokenCallsign(aircraft.callsign, aircraft.telephony))}, ${phrases.join(', ')}.`;
}

/** What the scope should draw for the draft. */
export function draftPreview(
  draft: InstructionDraft,
  pack: AirspacePack,
): InstructionPreview | undefined {
  if (draft.heading) return { headingDeg: draft.heading.headingDeg };
  if (draft.directTo) {
    const fix = pack.fix(draft.directTo);
    if (fix) return { directTo: fix.position };
  }
  return undefined;
}
