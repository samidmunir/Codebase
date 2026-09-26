import { z } from 'zod';
import {
  controllerIdSchema,
  ilsClearanceSchema,
  latLonSchema,
  type AircraftState,
} from '../aircraft/aircraft';
import {
  altitudeWords,
  frequencyWords,
  headingWords,
  runwayWords,
  speedWords,
} from '../comms/phraseology';
import type { AircraftPerformance } from '../performance/performance';

// ATC instructions. Each is plain data, so instructions waiting on a pilot's
// response are saved with the session. Every instruction is issued through the
// command UI; none can be issued from the keyboard.

export const atcCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    /** Magnetic heading, 1-360. */
    headingDeg: z.number().int().min(1).max(360),
    /** 'shortest' is "fly heading": the pilot turns the shorter way. */
    turn: z.enum(['left', 'right', 'shortest']),
  }),
  z.object({
    type: z.literal('altitude'),
    altitudeFt: z.number().int().positive().multipleOf(100),
  }),
  z.object({ type: z.literal('speed'), iasKts: z.number().int().positive() }),
  z.object({ type: z.literal('resumeNormalSpeed') }),
  z.object({ type: z.literal('directTo'), fix: z.string().min(2), position: latLonSchema }),
  z.object({ type: z.literal('clearedIls'), clearance: ilsClearanceSchema }),
  z.object({
    type: z.literal('handoff'),
    to: controllerIdSchema,
    /** Radio name of the receiving facility, e.g. 'New York Center'. */
    facility: z.string(),
    frequencyMhz: z.number().positive(),
  }),
]);

export type AtcCommand = z.infer<typeof atcCommandSchema>;
export type AtcCommandType = AtcCommand['type'];

/** Commands that set the lateral path; an instruction can hold only one. */
const LATERAL: ReadonlySet<AtcCommandType> = new Set(['heading', 'directTo']);
/** Commands that set the speed; an instruction can hold only one. */
const SPEED: ReadonlySet<AtcCommandType> = new Set(['speed', 'resumeNormalSpeed']);

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ValidationContext {
  playerId: string;
  performance: AircraftPerformance;
  speedLimitBelowFt: number;
  speedLimitKts: number;
}

/** Checks an instruction (one or more commands) before it is transmitted. */
export function validateInstruction(
  aircraft: Readonly<AircraftState>,
  commands: readonly AtcCommand[],
  context: ValidationContext,
): ValidationResult {
  const reject = (reason: string): ValidationResult => ({ ok: false, reason });
  if (commands.length === 0) return reject('Nothing to transmit');
  if (aircraft.owner !== context.playerId)
    return reject(`${aircraft.callsign} is not on your frequency`);

  const types = commands.map((command) => command.type);
  if (new Set(types).size !== types.length)
    return reject('Each kind of instruction can be given once');
  if (types.filter((type) => LATERAL.has(type)).length > 1)
    return reject('Give either a heading or a direct-to, not both');
  if (types.filter((type) => SPEED.has(type)).length > 1)
    return reject('Give one speed instruction');

  const { speeds, ceilingFt } = context.performance;
  const assignedAltitude = commands.find((c) => c.type === 'altitude')?.altitudeFt;

  for (const command of commands) {
    const parsed = atcCommandSchema.safeParse(command);
    if (!parsed.success) return reject(`Invalid ${command.type} instruction`);

    switch (command.type) {
      case 'altitude':
        if (command.altitudeFt > ceilingFt)
          return reject(`Above the ${aircraft.aircraftType} ceiling`);
        break;
      case 'speed': {
        if (command.iasKts % 10 !== 0) return reject('Assign speeds in 10-knot steps');
        if (command.iasKts < speeds.final)
          return reject(`Below the ${aircraft.aircraftType} final approach speed`);
        if (command.iasKts > speeds.max)
          return reject(`Above the ${aircraft.aircraftType} maximum speed`);
        const staysLow =
          (assignedAltitude ?? aircraft.targets.altitudeFt) < context.speedLimitBelowFt;
        if (staysLow && command.iasKts > context.speedLimitKts) {
          return reject(
            `Limited to ${context.speedLimitKts} knots below ${context.speedLimitBelowFt.toLocaleString('en-US')} ft`,
          );
        }
        break;
      }
      case 'clearedIls':
        if (command.clearance.airport !== aircraft.flightPlan.destination) {
          return reject(`${aircraft.callsign} is not landing at ${command.clearance.airport}`);
        }
        break;
      default:
        break;
    }
  }
  return { ok: true };
}

/** Orders commands the way controllers say them: lateral, then vertical, speed, clearance, handoff. */
const SPOKEN_ORDER: AtcCommandType[] = [
  'heading',
  'directTo',
  'altitude',
  'speed',
  'resumeNormalSpeed',
  'clearedIls',
  'handoff',
];

export function inSpokenOrder(commands: readonly AtcCommand[]): AtcCommand[] {
  return [...commands].sort((a, b) => SPOKEN_ORDER.indexOf(a.type) - SPOKEN_ORDER.indexOf(b.type));
}

/** The controller's phrase for one command, given the aircraft's state when it is transmitted. */
export function controllerPhrase(command: AtcCommand, aircraft: Readonly<AircraftState>): string {
  switch (command.type) {
    case 'heading':
      return command.turn === 'shortest'
        ? `fly heading ${headingWords(command.headingDeg)}`
        : `turn ${command.turn} heading ${headingWords(command.headingDeg)}`;
    case 'altitude': {
      const verb =
        command.altitudeFt > aircraft.altitudeFt + 50
          ? 'climb and maintain'
          : command.altitudeFt < aircraft.altitudeFt - 50
            ? 'descend and maintain'
            : 'maintain';
      return `${verb} ${altitudeWords(command.altitudeFt)}`;
    }
    case 'speed':
      if (command.iasKts > aircraft.iasKts + 2)
        return `increase speed to ${speedWords(command.iasKts)}`;
      if (command.iasKts < aircraft.iasKts - 2)
        return `reduce speed to ${speedWords(command.iasKts)}`;
      return `maintain ${speedWords(command.iasKts)}`;
    case 'resumeNormalSpeed':
      return 'resume normal speed';
    case 'directTo':
      return `proceed direct ${command.fix}`;
    case 'clearedIls':
      return `cleared ILS runway ${runwayWords(command.clearance.runway)} approach`;
    case 'handoff':
      return `contact ${command.facility} ${frequencyWords(command.frequencyMhz)}`;
  }
}

/** The pilot's readback of one command. */
export function pilotReadback(
  command: AtcCommand,
  aircraft: Readonly<AircraftState>,
  detail: 'full' | 'brief',
): string {
  if (detail === 'full') {
    switch (command.type) {
      case 'heading':
        return command.turn === 'shortest'
          ? `heading ${headingWords(command.headingDeg)}`
          : `${command.turn} heading ${headingWords(command.headingDeg)}`;
      case 'clearedIls':
        return `cleared ILS runway ${runwayWords(command.clearance.runway)}`;
      case 'handoff':
        return `${command.facility} ${frequencyWords(command.frequencyMhz)}, good day`;
      default:
        return controllerPhrase(command, aircraft);
    }
  }
  switch (command.type) {
    case 'heading':
      return `${command.turn === 'shortest' ? '' : `${command.turn} `}${headingWords(command.headingDeg)}`;
    case 'altitude':
      return altitudeWords(command.altitudeFt);
    case 'speed':
      return speedWords(command.iasKts);
    case 'resumeNormalSpeed':
      return 'normal speed';
    case 'directTo':
      return `direct ${command.fix}`;
    case 'clearedIls':
      return `cleared ILS ${runwayWords(command.clearance.runway)}`;
    case 'handoff':
      return frequencyWords(command.frequencyMhz);
  }
}
