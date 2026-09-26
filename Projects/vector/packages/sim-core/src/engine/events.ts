import type { AtcCommand } from '../commands/commands';
import type { Conflict, Violation } from '../separation/separation';
import type { CommsEntry } from '../snapshot/snapshot';

export type SimEvent =
  | { type: 'aircraftAdded'; aircraftId: string }
  | { type: 'aircraftRemoved'; aircraftId: string }
  | { type: 'altitudeReached'; aircraftId: string; altitudeFt: number }
  | { type: 'headingReached'; aircraftId: string; headingDeg: number }
  | { type: 'speedReached'; aircraftId: string; iasKts: number }
  /** A controller instruction was transmitted (the pilot acts on it after a delay). */
  | { type: 'instructionIssued'; aircraftId: string; commands: AtcCommand[] }
  /** The pilot read back and started following an instruction. */
  | { type: 'instructionExecuted'; aircraftId: string; commands: AtcCommand[] }
  | { type: 'transmission'; entry: CommsEntry }
  | { type: 'fixPassed'; aircraftId: string; fix: string }
  | { type: 'localizerCaptured'; aircraftId: string }
  | { type: 'glideslopeCaptured'; aircraftId: string }
  | { type: 'landed'; aircraftId: string; airport: string; runway: string }
  | { type: 'ownerChanged'; aircraftId: string; from: string; to: string }
  | { type: 'departureQueued'; entryId: string; airport: string }
  | { type: 'departureReleased'; entryId: string; airport: string; runway: string }
  | { type: 'tookOff'; aircraftId: string; airport: string; runway: string; procedure: string }
  | { type: 'procedureCompleted'; aircraftId: string; procedure: string }
  /** An aircraft left the airspace; `handedOff` is false if it left without a handoff. */
  | { type: 'leftAirspace'; aircraftId: string; callsign: string; handedOff: boolean }
  | { type: 'arrivalEntered'; aircraftId: string; airport: string; star: string }
  /** The pilot could not accept an ILS clearance. */
  | { type: 'ilsUnable'; aircraftId: string; reason: string }
  | { type: 'goAround'; aircraftId: string; airport: string; runway: string; reason: string }
  | { type: 'conflictStarted'; conflict: Conflict }
  | { type: 'conflictEnded'; conflict: Conflict }
  /** Two aircraft lost the required separation (logged as a violation). */
  | { type: 'separationLost'; violation: Violation };

export type SimEventListener = (event: SimEvent, tick: number) => void;
