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
import { normalizeHeading } from '../math/angles';
import type { PerformanceCatalog } from '../performance/performance';
import { SeededRandom } from '../random/seeded-random';
import {
  parseSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
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
}

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
    this.state.tick++;

    for (const aircraft of this.state.aircraft) {
      const performance = this.performance.get(aircraft.aircraftType);
      const result = stepAircraft(
        aircraft,
        performance,
        tickSeconds,
        this.state.world.magneticVariationDeg,
        flightModel,
      );
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
    this.emit({ type: 'aircraftRemoved', aircraftId: id });
  }

  getAircraft(id: string): Readonly<AircraftState> | undefined {
    return this.state.aircraft.find((aircraft) => aircraft.id === id);
  }

  listAircraft(): readonly Readonly<AircraftState>[] {
    return this.state.aircraft;
  }

  /**
   * Sets what an aircraft is flying toward. Headings of 360 are accepted and
   * stored as 0. Validation of whether an
   * instruction is allowed belongs to the command layer (Milestone 6).
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
    this.mutableAircraft(id).owner = controllerIdSchema.parse(owner);
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
