import { defaultSettings, type SessionSettings } from '@vector/shared';
import {
  aircraftStateSchema,
  aircraftTargetsSchema,
  controllerIdSchema,
  flightPhaseSchema,
  type AircraftState,
  type ControllerId,
  type FlightPhase,
  type AircraftTargets,
  type NewAircraft,
} from '../aircraft/aircraft';
import { stepAircraft } from '../aircraft/flight-model';
import { followGlideslope, updateNavigation } from '../aircraft/navigation';
import {
  controllerPhrase,
  inSpokenOrder,
  pilotReadback,
  validateInstruction,
  type AtcCommand,
  type ValidationResult,
} from '../commands/commands';
import { capitalize, spokenCallsign } from '../comms/phraseology';
import { normalizeHeading } from '../math/angles';
import type { PerformanceCatalog } from '../performance/performance';
import { SeededRandom } from '../random/seeded-random';
import {
  parseSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
  type CommsEntry,
  type SimSnapshot,
  type SimState,
} from '../snapshot/snapshot';
import { cloneJson } from '../snapshot/clone';
import { DEFAULT_SIM_CONFIG, type SimConfig, type World } from './config';
import type { SimEvent, SimEventListener } from './events';

export interface CreateSimEngineOptions {
  performance: PerformanceCatalog;
  world: World;
  seed: number;
  /** UTC wall-clock time at tick 0, as an ISO string. */
  startTimeUtc: string;
  config?: SimConfig;
  /** Gameplay and realism settings for this session. Defaults if omitted. */
  settings?: SessionSettings;
  /** Controller the player works as. Defaults to 'N90'. */
  playerId?: string;
}

/** Radio transmissions kept in the log (and in saved sessions). */
const MAX_COMMS_ENTRIES = 300;

/**
 * The simulation engine.
 *
 * Time advances in fixed ticks (`config.tickSeconds` of sim time each),
 * independent of frame rate. The UI calls `advance()` with real elapsed time
 * every frame; sim speed and pause are applied there. Everything needed to
 * reproduce the simulation lives in `SimState`, which `toSnapshot()` saves and
 * `fromSnapshot()` restores exactly.
 */
export class SimEngine {
  private readonly state: SimState;
  private readonly rng: SeededRandom;
  private readonly listeners = new Set<SimEventListener>();
  /** Sim seconds owed but not yet ticked. Not saved: saves happen between ticks. */
  private accumulatorSec = 0;

  private constructor(
    readonly performance: PerformanceCatalog,
    state: SimState,
  ) {
    this.state = state;
    this.rng = SeededRandom.fromState(state.rngState);
  }

  static create(options: CreateSimEngineOptions): SimEngine {
    return new SimEngine(options.performance, {
      tick: 0,
      startTimeUtc: new Date(options.startTimeUtc).toISOString(),
      speed: 1,
      paused: false,
      rngState: new SeededRandom(options.seed).getState(),
      nextAircraftNumber: 1,
      world: cloneJson(options.world),
      config: cloneJson(options.config ?? DEFAULT_SIM_CONFIG),
      settings: cloneJson(options.settings ?? defaultSettings('session')),
      aircraft: [],
      playerId: options.playerId ?? 'N90',
      pendingInstructions: [],
      comms: [],
      nextMessageNumber: 1,
    });
  }

  static fromSnapshot(snapshot: unknown, performance: PerformanceCatalog): SimEngine {
    const { state } = parseSnapshot(snapshot);
    for (const aircraft of state.aircraft) performance.get(aircraft.aircraftType);
    return new SimEngine(performance, state);
  }

  toSnapshot(): SimSnapshot {
    this.state.rngState = this.rng.getState();
    return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, state: cloneJson(this.state) };
  }

  // ---- Clock ---------------------------------------------------------------

  get tick(): number {
    return this.state.tick;
  }

  get simTimeSec(): number {
    return this.state.tick * this.state.config.tickSeconds;
  }

  /**
   * Sim time including the fraction of the next tick already elapsed. Use it
   * for smooth animation only; the simulation itself moves in whole ticks.
   */
  get displayTimeSec(): number {
    return this.simTimeSec + Math.min(this.accumulatorSec, this.state.config.tickSeconds);
  }

  get utcTime(): Date {
    return new Date(Date.parse(this.state.startTimeUtc) + this.simTimeSec * 1000);
  }

  get speed(): number {
    return this.state.speed;
  }

  get paused(): boolean {
    return this.state.paused;
  }

  get config(): Readonly<SimConfig> {
    return this.state.config;
  }

  get settings(): Readonly<SessionSettings> {
    return this.state.settings;
  }

  get world(): Readonly<World> {
    return this.state.world;
  }

  /** The engine's random generator. All sim randomness must come from here. */
  get random(): SeededRandom {
    return this.rng;
  }

  pause(): void {
    this.state.paused = true;
    this.accumulatorSec = 0;
  }

  resume(): void {
    this.state.paused = false;
  }

  setSpeed(multiplier: number): void {
    if (!(multiplier > 0)) throw new Error(`Sim speed must be positive, got ${multiplier}`);
    this.state.speed = multiplier;
  }

  /**
   * Advances by real elapsed time, running as many whole ticks as are due.
   * Returns the number of ticks run.
   */
  advance(realElapsedMs: number): number {
    if (this.state.paused || realElapsedMs <= 0) return 0;

    const { tickSeconds, maxTicksPerAdvance } = this.state.config;
    this.accumulatorSec += (realElapsedMs / 1000) * this.state.speed;

    let ticks = 0;
    while (this.accumulatorSec >= tickSeconds && ticks < maxTicksPerAdvance) {
      this.step();
      this.accumulatorSec -= tickSeconds;
      ticks++;
    }
    // After a long stall (e.g. a background tab), drop the backlog instead of fast-forwarding.
    if (ticks === maxTicksPerAdvance)
      this.accumulatorSec = Math.min(this.accumulatorSec, tickSeconds);
    return ticks;
  }

  /** Runs exactly one tick, regardless of pause state. */
  step(): void {
    const { tickSeconds, flightModel } = this.state.config;
    const variation = this.state.world.magneticVariationDeg;
    this.state.tick++;
    this.executeDueInstructions();

    const landed: { aircraft: AircraftState; airport: string; runway: string }[] = [];
    for (const aircraft of this.state.aircraft) {
      const performance = this.performance.get(aircraft.aircraftType);

      const navigation = updateNavigation(aircraft, performance, variation, flightModel);
      if (navigation.fixPassed) {
        this.emit({ type: 'fixPassed', aircraftId: aircraft.id, fix: navigation.fixPassed });
      }
      if (navigation.localizerCaptured)
        this.emit({ type: 'localizerCaptured', aircraftId: aircraft.id });
      if (navigation.glideslopeCaptured)
        this.emit({ type: 'glideslopeCaptured', aircraftId: aircraft.id });

      const result = stepAircraft(aircraft, performance, tickSeconds, variation, flightModel);
      if (
        followGlideslope(aircraft, variation, tickSeconds) &&
        aircraft.navigation.mode === 'approach'
      ) {
        const { airport, runway } = aircraft.navigation.clearance;
        landed.push({ aircraft, airport, runway });
      }

      if (result.reachedHeading) {
        this.emit({
          type: 'headingReached',
          aircraftId: aircraft.id,
          headingDeg: aircraft.headingDeg,
        });
      }
      if (result.reachedSpeed) {
        this.emit({ type: 'speedReached', aircraftId: aircraft.id, iasKts: aircraft.iasKts });
      }
      if (result.reachedAltitude) {
        this.emit({
          type: 'altitudeReached',
          aircraftId: aircraft.id,
          altitudeFt: aircraft.altitudeFt,
        });
      }
    }

    for (const { aircraft, airport, runway } of landed) {
      this.emit({ type: 'landed', aircraftId: aircraft.id, airport, runway });
      this.removeAircraft(aircraft.id);
    }
  }

  // ---- Instructions and radio ------------------------------------------------

  get playerId(): string {
    return this.state.playerId;
  }

  /** Radio transmissions, oldest first. */
  get comms(): readonly Readonly<CommsEntry>[] {
    return this.state.comms;
  }

  /** Instructions an aircraft's pilot has not acted on yet. */
  pendingInstructions(aircraftId: string): readonly AtcCommand[][] {
    return this.state.pendingInstructions
      .filter((pending) => pending.aircraftId === aircraftId)
      .map((pending) => pending.commands);
  }

  /** Checks an instruction without transmitting it (e.g. to enable or disable UI). */
  checkInstruction(aircraftId: string, commands: readonly AtcCommand[]): ValidationResult {
    const aircraft = this.getAircraft(aircraftId);
    if (!aircraft) return { ok: false, reason: 'Aircraft is no longer on the scope' };
    const { speedLimitBelowFt, speedLimitKts } = this.state.config.flightModel;
    return validateInstruction(aircraft, commands, {
      playerId: this.state.playerId,
      performance: this.performance.get(aircraft.aircraftType),
      speedLimitBelowFt,
      speedLimitKts,
    });
  }

  /**
   * Transmits an instruction to an aircraft. The pilot reads it back and starts
   * following it after a response delay (from the session settings).
   */
  issueInstruction(aircraftId: string, commands: readonly AtcCommand[]): ValidationResult {
    const check = this.checkInstruction(aircraftId, commands);
    if (!check.ok) return check;
    const aircraft = this.getAircraft(aircraftId)!;
    const ordered = inSpokenOrder(commands);

    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    const phrases = ordered.map((command) => controllerPhrase(command, aircraft));
    this.transmit('controller', aircraftId, `${callsign}, ${phrases.join(', ')}.`);

    const [minDelay, maxDelay] = this.state.settings['pilots.responseDelaySec'];
    const delayTicks = Math.max(
      1,
      Math.ceil(this.rng.range(minDelay, maxDelay) / this.state.config.tickSeconds),
    );
    this.state.pendingInstructions.push({
      id: `I${this.state.nextMessageNumber}`,
      aircraftId,
      commands: cloneJson(ordered),
      executeAtTick: this.state.tick + delayTicks,
    });
    this.emit({ type: 'instructionIssued', aircraftId, commands: cloneJson(ordered) });
    return { ok: true };
  }

  /** Adds a radio transmission to the log (e.g. a pilot checking in). */
  transmit(
    speaker: CommsEntry['speaker'],
    aircraftId: string | undefined,
    text: string,
  ): CommsEntry {
    const aircraft = aircraftId ? this.getAircraft(aircraftId) : undefined;
    const entry: CommsEntry = {
      id: `M${this.state.nextMessageNumber++}`,
      tick: this.state.tick,
      speaker,
      text,
      ...(aircraftId ? { aircraftId } : {}),
      ...(aircraft ? { callsign: aircraft.callsign } : {}),
    };
    this.state.comms.push(entry);
    if (this.state.comms.length > MAX_COMMS_ENTRIES) this.state.comms.shift();
    this.emit({ type: 'transmission', entry });
    return entry;
  }

  private executeDueInstructions(): void {
    const due = this.state.pendingInstructions.filter(
      (pending) => pending.executeAtTick <= this.state.tick,
    );
    if (due.length === 0) return;
    this.state.pendingInstructions = this.state.pendingInstructions.filter(
      (pending) => !due.includes(pending),
    );

    for (const pending of due) {
      const aircraft = this.state.aircraft.find((candidate) => candidate.id === pending.aircraftId);
      if (!aircraft) continue;

      const detail = this.state.settings['pilots.readbackDetail'];
      const readback = pending.commands.map((command) => pilotReadback(command, aircraft, detail));
      const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
      this.transmit('pilot', aircraft.id, `${capitalize(readback.join(', '))}, ${callsign}.`);

      for (const command of pending.commands) this.applyCommand(aircraft, command);
      this.emit({
        type: 'instructionExecuted',
        aircraftId: aircraft.id,
        commands: pending.commands,
      });
    }
  }

  private applyCommand(aircraft: AircraftState, command: AtcCommand): void {
    const navigation = aircraft.navigation;
    const cancelApproach = () => {
      if (navigation.mode === 'approach') {
        aircraft.navigation = { mode: 'heading' };
        if (aircraft.phase === 'approach') aircraft.phase = 'arrival';
      }
    };

    switch (command.type) {
      case 'heading':
        // A heading before the localizer is captured is the intercept heading; after, it breaks off the approach.
        if (
          navigation.mode === 'direct' ||
          (navigation.mode === 'approach' && navigation.localizerCaptured)
        ) {
          cancelApproach();
          aircraft.navigation = { mode: 'heading' };
        }
        aircraft.targets.headingDeg = normalizeHeading(command.headingDeg);
        aircraft.targets.turnDirection = command.turn;
        break;
      case 'altitude':
        if (navigation.mode === 'approach' && navigation.glideslopeCaptured) cancelApproach();
        aircraft.targets.altitudeFt = command.altitudeFt;
        break;
      case 'speed':
        aircraft.targets.speedMode = 'assigned';
        aircraft.targets.iasKts = command.iasKts;
        break;
      case 'resumeNormalSpeed':
        aircraft.targets.speedMode = 'normal';
        break;
      case 'directTo':
        cancelApproach();
        aircraft.navigation = {
          mode: 'direct',
          fix: command.fix,
          position: { ...command.position },
        };
        break;
      case 'clearedIls':
        aircraft.navigation = {
          mode: 'approach',
          clearance: cloneJson(command.clearance),
          localizerCaptured: false,
          glideslopeCaptured: false,
        };
        aircraft.phase = 'approach';
        break;
      case 'handoff':
        this.changeOwner(aircraft, command.to);
        break;
    }
  }

  private changeOwner(aircraft: AircraftState, owner: ControllerId): void {
    const from = aircraft.owner;
    if (from === owner) return;
    aircraft.owner = owner;
    this.emit({ type: 'ownerChanged', aircraftId: aircraft.id, from, to: owner });
  }

  // ---- Aircraft ------------------------------------------------------------

  addAircraft(input: NewAircraft): AircraftState {
    this.performance.get(input.aircraftType);

    const targets = {
      altitudeFt: input.altitudeFt,
      headingDeg: input.headingDeg,
      turnDirection: 'shortest',
      iasKts: input.iasKts,
      ...input.targets,
    };
    const aircraft = aircraftStateSchema.parse({
      ...input,
      id: `AC${this.state.nextAircraftNumber}`,
      headingDeg: normalizeHeading(input.headingDeg),
      verticalSpeedFpm: 0,
      targets: { ...targets, headingDeg: normalizeHeading(targets.headingDeg) },
    });
    this.state.nextAircraftNumber++;
    this.state.aircraft.push(aircraft);
    this.emit({ type: 'aircraftAdded', aircraftId: aircraft.id });
    return aircraft;
  }

  removeAircraft(id: string): void {
    const index = this.state.aircraft.findIndex((aircraft) => aircraft.id === id);
    if (index === -1) throw new Error(`Unknown aircraft "${id}"`);
    this.state.aircraft.splice(index, 1);
    this.state.pendingInstructions = this.state.pendingInstructions.filter(
      (p) => p.aircraftId !== id,
    );
    this.emit({ type: 'aircraftRemoved', aircraftId: id });
  }

  getAircraft(id: string): Readonly<AircraftState> | undefined {
    return this.state.aircraft.find((aircraft) => aircraft.id === id);
  }

  listAircraft(): readonly Readonly<AircraftState>[] {
    return this.state.aircraft;
  }

  /**
   * Sets what an aircraft is flying toward, bypassing the radio (for traffic
   * generation and tests). Headings of 360 are stored as 0. Player
   * instructions go through issueInstruction().
   */
  setTargets(id: string, targets: Partial<AircraftTargets>): void {
    const aircraft = this.mutableAircraft(id);
    const merged = { ...aircraft.targets, ...targets };
    aircraft.targets = aircraftTargetsSchema.parse({
      ...merged,
      headingDeg: normalizeHeading(merged.headingDeg),
    });
  }

  /** Transfers control of an aircraft to another controller (e.g. a handoff). */
  setOwner(id: string, owner: ControllerId): void {
    this.changeOwner(this.mutableAircraft(id), controllerIdSchema.parse(owner));
  }

  setPhase(id: string, phase: FlightPhase): void {
    this.mutableAircraft(id).phase = flightPhaseSchema.parse(phase);
  }

  private mutableAircraft(id: string): AircraftState {
    const aircraft = this.state.aircraft.find((candidate) => candidate.id === id);
    if (!aircraft) throw new Error(`Unknown aircraft "${id}"`);
    return aircraft;
  }

  // ---- Events --------------------------------------------------------------

  subscribe(listener: SimEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SimEvent): void {
    for (const listener of this.listeners) listener(event, this.state.tick);
  }
}
