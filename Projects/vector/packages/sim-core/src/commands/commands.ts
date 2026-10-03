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
  procedureWords,
  runwayWords,
  spellDigits,
  speedWords,
} from '../comms/phraseology';
import type { AircraftPerformance } from '../performance/performance';
import { descendViaBottomFt, isOnSid, isOnStar } from '../aircraft/navigation';

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
  /** Fly the arrival's published altitude restrictions ("descend via the PROUD2 arrival"). */
  z.object({ type: z.literal('descendVia'), procedure: z.string().min(1) }),
  /**
   * Fly the departure's published altitude restrictions ("climb via the GLDMN8
   * departure"), up to the cleared altitude or a new one ("except maintain").
   */
  z.object({
    type: z.literal('climbVia'),
    procedure: z.string().min(1),
    exceptMaintainFt: z.number().int().positive().multipleOf(100).optional(),
  }),
  z.object({ type: z.literal('speed'), iasKts: z.number().int().positive() }),
  z.object({ type: z.literal('resumeNormalSpeed') }),
  z.object({ type: z.literal('directTo'), fix: z.string().min(2), position: latLonSchema }),
  z.object({ type: z.literal('clearedIls'), clearance: ilsClearanceSchema }),
  /**
   * Hold at a fix: as published, or as described (inbound course and turns),
   * expecting further clearance at a time.
   */
  z.object({
    type: z.literal('hold'),
    fix: z.string().min(2),
    position: latLonSchema,
    /** Magnetic inbound course. */
    inboundCourseDeg: z.number().int().min(1).max(360),
    turn: z.enum(['left', 'right']),
    legNm: z.number().positive().optional(),
    maxSpeedKts: z.number().positive().optional(),
    published: z.boolean(),
    /** Expect further clearance: the tick, and the time as said ('1432'). */
    efcTick: z.number().int().min(0),
    efcTimeZ: z.string().regex(/^\d{4}$/),
  }),
  /** Leave the hold and continue on the procedure it was holding on ("resume the CAMRN arrival"). */
  z.object({ type: z.literal('resumeProcedure') }),
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
const LATERAL: ReadonlySet<AtcCommandType> = new Set([
  'heading',
  'directTo',
  'hold',
  'resumeProcedure',
]);
/** Commands that set the altitude; an instruction can hold only one. */
const VERTICAL: ReadonlySet<AtcCommandType> = new Set(['altitude', 'descendVia', 'climbVia']);
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
    return reject('Give one of a heading, a direct-to, a hold or resume, not more');
  if (types.filter((type) => SPEED.has(type)).length > 1)
    return reject('Give one speed instruction');
  if (types.filter((type) => VERTICAL.has(type)).length > 1)
    return reject('Give one altitude instruction');

  const { speeds, ceilingFt } = context.performance;
  const vertical = commands.find((c) => c.type === 'altitude' || c.type === 'climbVia');
  const assignedAltitude =
    vertical?.type === 'altitude'
      ? vertical.altitudeFt
      : vertical?.type === 'climbVia'
        ? vertical.exceptMaintainFt
        : undefined;

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
      case 'descendVia': {
        const navigation = aircraft.navigation;
        if (
          !isOnStar(aircraft) ||
          navigation.mode !== 'procedure' ||
          navigation.name !== command.procedure
        )
          return reject(`${aircraft.callsign} is not on the ${command.procedure} arrival`);
        if (types.includes('heading'))
          return reject('A heading takes it off the arrival: descend via needs the arrival');
        if (descendViaBottomFt(aircraft) === undefined)
          return reject(`No published altitudes left on the ${command.procedure} arrival`);
        break;
      }
      case 'climbVia': {
        const navigation = aircraft.navigation;
        if (
          !isOnSid(aircraft) ||
          navigation.mode !== 'procedure' ||
          navigation.name !== command.procedure
        )
          return reject(`${aircraft.callsign} is not on the ${command.procedure} departure`);
        if (types.includes('heading'))
          return reject('A heading takes it off the departure: climb via needs the departure');
        if (command.exceptMaintainFt !== undefined && command.exceptMaintainFt > ceilingFt)
          return reject(`Above the ${aircraft.aircraftType} ceiling`);
        break;
      }
      case 'hold':
        if (types.includes('clearedIls')) return reject('Clear the approach or hold, not both');
        break;
      case 'resumeProcedure':
        if (aircraft.navigation.mode !== 'hold' || !aircraft.navigation.resume)
          return reject(`${aircraft.callsign} is not holding on a procedure`);
        break;
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
  'descendVia',
  'climbVia',
  'speed',
  'resumeNormalSpeed',
  'hold',
  'resumeProcedure',
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
    case 'descendVia':
      return `descend via the ${procedureWords(command.procedure)} arrival`;
    case 'climbVia':
      return `climb via the ${procedureWords(command.procedure)} departure${
        command.exceptMaintainFt !== undefined
          ? `, except maintain ${altitudeWords(command.exceptMaintainFt)}`
          : ''
      }`;
    case 'directTo':
      return `proceed direct ${command.fix}`;
    case 'clearedIls':
      return `cleared ILS runway ${runwayWords(command.clearance.runway)} approach`;
    case 'hold':
      return command.published
        ? `hold at ${command.fix} as published, expect further clearance ${spellDigits(command.efcTimeZ)}`
        : `hold ${compassWords(command.inboundCourseDeg + 180)} of ${command.fix}, ${headingWords(command.inboundCourseDeg)} inbound, ${command.turn} turns, expect further clearance ${spellDigits(command.efcTimeZ)}`;
    case 'resumeProcedure':
      return resumePhrase(aircraft);
    case 'handoff':
      return `contact ${command.facility} ${frequencyWords(command.frequencyMhz)}`;
  }
}

/** 'northeast' for a direction in degrees (magnetic): where a hold lies from its fix. */
function compassWords(degrees: number): string {
  const names = [
    'north',
    'northeast',
    'east',
    'southeast',
    'south',
    'southwest',
    'west',
    'northwest',
  ];
  return names[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]!;
}

/** "resume the CAMRN five arrival" for the procedure a hold returns to. */
function resumePhrase(aircraft: Readonly<AircraftState>): string {
  const resume = aircraft.navigation.mode === 'hold' ? aircraft.navigation.resume : undefined;
  if (!resume) return 'resume own navigation';
  const kind =
    aircraft.phase === 'arrival' || aircraft.phase === 'approach' ? 'arrival' : 'departure';
  return `resume the ${procedureWords(resume.name)} ${kind}`;
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
    case 'descendVia':
      return `descend via the ${procedureWords(command.procedure)}`;
    case 'climbVia':
      return `climb via the ${procedureWords(command.procedure)}${
        command.exceptMaintainFt !== undefined
          ? `, except ${altitudeWords(command.exceptMaintainFt)}`
          : ''
      }`;
    case 'directTo':
      return `direct ${command.fix}`;
    case 'clearedIls':
      return `cleared ILS ${runwayWords(command.clearance.runway)}`;
    case 'hold':
      return `hold at ${command.fix}, further clearance ${spellDigits(command.efcTimeZ)}`;
    case 'resumeProcedure':
      return resumePhrase(aircraft);
    case 'handoff':
      return frequencyWords(command.frequencyMhz);
  }
}
