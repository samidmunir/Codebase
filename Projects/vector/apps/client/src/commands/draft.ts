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
  /** Hold at a fix: as published, or as described. */
  hold?: HoldDraft | undefined;
  /** Leave the hold and resume the procedure it was holding on. */
  resume?: boolean | undefined;
}

export interface HoldDraft {
  fix: string;
  /** Use the published hold at the fix (it must have one). */
  published: boolean;
  /** Magnetic inbound course and turns, for a hold that isn't published. */
  inboundCourseDeg: number;
  turn: 'left' | 'right';
  /** Expect further clearance this many minutes from now. */
  efcMinutes: number;
}

/** The sim clock, for times given in instructions (expect further clearance). */
export interface DraftClock {
  tick: number;
  tickSeconds: number;
  utcAtTick: (tick: number) => Date;
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
  clock?: DraftClock,
): AtcCommand[] {
  const commands: AtcCommand[] = [];
  if (draft.heading) commands.push({ type: 'heading', ...draft.heading });
  if (draft.directTo) {
    const fix = pack.fix(draft.directTo);
    if (fix) commands.push({ type: 'directTo', fix: fix.ident, position: fix.position });
  }
  if (draft.hold && clock) {
    const fix = pack.fix(draft.hold.fix);
    const published = draft.hold.published ? pack.holdAt(draft.hold.fix) : undefined;
    if (fix) {
      const efcTick = clock.tick + Math.round((draft.hold.efcMinutes * 60) / clock.tickSeconds);
      commands.push({
        type: 'hold',
        fix: fix.ident,
        position: fix.position,
        inboundCourseDeg:
          Math.round(published?.inboundCourseDeg ?? draft.hold.inboundCourseDeg) % 360 || 360,
        turn: published?.turn ?? draft.hold.turn,
        ...(published?.legNm !== undefined ? { legNm: published.legNm } : {}),
        ...(published?.maxSpeedKts !== undefined ? { maxSpeedKts: published.maxSpeedKts } : {}),
        published: published !== undefined,
        efcTick,
        efcTimeZ: clock.utcAtTick(efcTick).toISOString().slice(11, 16).replace(':', ''),
      });
    }
  }
  if (draft.resume) commands.push({ type: 'resumeProcedure' });
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
  /** The type's wake category: heavies and supers say so after the callsign. */
  wakeCategory?: string,
): string {
  if (commands.length === 0) return '';
  const phrases = inSpokenOrder(commands).map((command) => controllerPhrase(command, aircraft));
  return `${capitalize(spokenCallsign(aircraft.callsign, aircraft.telephony, wakeCategory))}, ${phrases.join(', ')}.`;
}

/** What the scope should draw for the draft. */
export function draftPreview(
  draft: InstructionDraft,
  pack: AirspacePack,
): InstructionPreview | undefined {
  if (draft.heading) return { headingDeg: draft.heading.headingDeg };
  const toFix = draft.directTo ?? draft.hold?.fix;
  if (toFix) {
    const fix = pack.fix(toFix);
    if (fix) return { directTo: fix.position };
  }
  return undefined;
}
