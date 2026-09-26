import { defaultSettings, type SessionSettings } from '@vector/shared';
import {
  aircraftStateSchema,
  aircraftTargetsSchema,
  controllerIdSchema,
  flightPhaseSchema,
  type AircraftState,
  type ControllerId,
  type FlightPhase,
  type IlsClearance,
  type AircraftTargets,
  type NewAircraft,
} from '../aircraft/aircraft';
import { stepAircraft } from '../aircraft/flight-model';
import { finalApproachGeometry, followGlideslope, updateNavigation } from '../aircraft/navigation';
import {
  distanceForHeightNm,
  ilsEligibility,
  type IlsEligibility,
} from '../commands/ils-eligibility';
import { arrivalRouteFrom } from '../traffic/arrival-route';
import {
  controllerPhrase,
  inSpokenOrder,
  pilotReadback,
  validateInstruction,
  type AtcCommand,
  type ValidationResult,
} from '../commands/commands';
import {
  altitudeWords,
  capitalize,
  frequencyWords,
  procedureWords,
  runwayWords,
  spokenCallsign,
} from '../comms/phraseology';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { Airline } from '../airspace/schema';
import { departureProcedure, resolveLegs } from '../traffic/departure-procedure';
import {
  departureInterval,
  INITIAL_QUEUE,
  initialOperations,
  MAX_GATE_HOLDS,
  newDepartureEntry,
  queuedAt,
  type ActiveRunways,
  type DepartureEntry,
} from '../traffic/operations';
import type { Wind } from '../weather/wind';
import { normalizeHeading } from '../math/angles';
import { bearingTrue, destinationPoint, distanceNm, trueToMagnetic } from '../math/geo';
import type { AircraftPerformance } from '../performance/performance';
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

export type CreateSimEngineOptions = {
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
} & OperationsContext;

/** Static data for airport operations (wind, runways, departures). Not saved in snapshots. */
export interface OperationsContext {
  airspace?: AirspacePack;
  airlines?: readonly Airline[];
}

/** Aircraft beyond the boundary by this much are removed: handed-off aircraft sooner. */
const EXIT_MARGIN_HANDED_OFF_NM = 3;
const EXIT_MARGIN_NM = 10;
/** Stabilized approach: within this distance of the centerline and speed margin at the gate. */
const STABILIZED_CROSS_TRACK_NM = 0.1;
const STABILIZED_SPEED_MARGIN_KTS = 10;
const DEFAULT_MISSED_APPROACH_ALTITUDE_FT = 3_000;
/** Altitudes arrivals are typically handed over at, when the STAR doesn't publish one. */
const ARRIVAL_ENTRY_ALTITUDES_FT = [11_000, 12_000, 13_000];
/** New arrivals wait if another aircraft is this close to the entry point at a similar altitude. */
const ARRIVAL_ENTRY_SPACING_NM = 6;
/** Line-up and takeoff roll after a takeoff clearance. */
const LINE_UP_SEC: [number, number] = [30, 50];
/** Spacing between takeoffs on one runway, by the leading aircraft's wake category. */
const TAKEOFF_SPACING_SEC = { small: 60, large: 60, b757: 90, heavy: 120, super: 180 } as const;

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

  private readonly airspace: AirspacePack | undefined;
  private readonly airlines: ReadonlyMap<string, Airline>;

  private constructor(
    readonly performance: PerformanceCatalog,
    state: SimState,
    context: OperationsContext,
  ) {
    this.state = state;
    this.rng = SeededRandom.fromState(state.rngState);
    this.airspace = context.airspace;
    this.airlines = new Map((context.airlines ?? []).map((airline) => [airline.icao, airline]));
  }

  static create(options: CreateSimEngineOptions): SimEngine {
    const engine = new SimEngine(
      options.performance,
      {
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
      },
      options,
    );
    engine.startOperations();
    return engine;
  }

  /**
   * Restores a saved session. Pass the same airspace and airlines it was
   * created with so airport operations continue.
   */
  static fromSnapshot(
    snapshot: unknown,
    performance: PerformanceCatalog,
    context: OperationsContext = {},
  ): SimEngine {
    const { state } = parseSnapshot(snapshot);
    for (const aircraft of state.aircraft) performance.get(aircraft.aircraftType);
    return new SimEngine(performance, state, context);
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
    this.updateDepartures();
    this.updateArrivals();

    const landed: { aircraft: AircraftState; airport: string; runway: string }[] = [];
    for (const aircraft of this.state.aircraft) {
      const performance = this.performance.get(aircraft.aircraftType);

      const navigation = updateNavigation(
        aircraft,
        performance,
        variation,
        flightModel,
        this.state.settings['approaches.stabilizedGateFt'],
      );
      if (navigation.procedureCompleted) {
        this.emit({
          type: 'procedureCompleted',
          aircraftId: aircraft.id,
          procedure: navigation.procedureCompleted,
        });
      }
      if (navigation.fixPassed) {
        this.emit({ type: 'fixPassed', aircraftId: aircraft.id, fix: navigation.fixPassed });
      }
      if (navigation.localizerCaptured)
        this.emit({ type: 'localizerCaptured', aircraftId: aircraft.id });
      if (navigation.glideslopeCaptured)
        this.emit({ type: 'glideslopeCaptured', aircraftId: aircraft.id });

      const result = stepAircraft(aircraft, performance, tickSeconds, variation, flightModel);
      this.checkRadarContact(aircraft);
      const atThreshold = followGlideslope(aircraft, variation, tickSeconds);
      if (aircraft.navigation.mode === 'approach') {
        const { airport, runway } = aircraft.navigation.clearance;
        const outcome = this.monitorApproach(aircraft, performance, atThreshold);
        if (outcome === 'landed') landed.push({ aircraft, airport, runway });
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
    this.removeExitedAircraft();
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
    facility?: string,
  ): CommsEntry {
    const aircraft = aircraftId ? this.getAircraft(aircraftId) : undefined;
    const entry: CommsEntry = {
      id: `M${this.state.nextMessageNumber++}`,
      tick: this.state.tick,
      speaker,
      text,
      ...(aircraftId ? { aircraftId } : {}),
      ...(aircraft ? { callsign: aircraft.callsign } : {}),
      ...(facility ? { facility } : {}),
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
      const readback: string[] = [];
      const executed: AtcCommand[] = [];
      // Commands are in spoken order, so a heading given with an approach clearance applies first.
      for (const command of pending.commands) {
        if (command.type === 'clearedIls') {
          const eligibility = this.ilsEligibilityFor(aircraft, command.clearance);
          if (!eligibility.ok) {
            readback.push(
              `unable ILS runway ${runwayWords(command.clearance.runway)}, ${eligibility.reason}`,
            );
            this.emit({ type: 'ilsUnable', aircraftId: aircraft.id, reason: eligibility.reason });
            continue;
          }
        }
        readback.push(pilotReadback(command, aircraft, detail));
        this.applyCommand(aircraft, command);
        executed.push(command);
      }
      const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
      this.transmit('pilot', aircraft.id, `${capitalize(readback.join(', '))}, ${callsign}.`);
      this.emit({ type: 'instructionExecuted', aircraftId: aircraft.id, commands: executed });
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
        // A heading ends a direct-to or procedure (radar vectors). Before the localizer is captured
        // it is the intercept heading; after, it breaks off the approach.
        if (
          navigation.mode === 'direct' ||
          navigation.mode === 'procedure' ||
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
          gatePassed: false,
        };
        aircraft.phase = 'approach';
        break;
      case 'handoff':
        this.changeOwner(aircraft, command.to);
        break;
    }
  }

  // ---- Approaches -----------------------------------------------------------------

  /** Whether an aircraft could accept an ILS clearance right now. */
  ilsEligibility(aircraftId: string, clearance: IlsClearance): IlsEligibility {
    const aircraft = this.getAircraft(aircraftId);
    if (!aircraft) return { ok: false, problem: 'position', reason: 'no longer on the scope' };
    return this.ilsEligibilityFor(aircraft, clearance);
  }

  private ilsEligibilityFor(
    aircraft: Readonly<AircraftState>,
    clearance: IlsClearance,
  ): IlsEligibility {
    return ilsEligibility(aircraft, clearance, {
      performance: this.performance.get(aircraft.aircraftType),
      settings: this.state.settings,
      magneticVariationDeg: this.state.world.magneticVariationDeg,
      minimumVectoringAltitudeFt: this.airspace?.minimumVectoringAltitude(aircraft.position),
    });
  }

  /**
   * Watches an aircraft on an approach: hands it to Tower once established,
   * checks the stabilized-approach gate, and sends it around if the approach
   * isn't stable. Returns 'landed' when it touches down.
   */
  private monitorApproach(
    aircraft: AircraftState,
    performance: AircraftPerformance,
    atThreshold: boolean,
  ): 'landed' | 'flying' {
    const navigation = aircraft.navigation;
    if (navigation.mode !== 'approach') return 'flying';
    const { clearance } = navigation;
    const settings = this.state.settings;
    const established = navigation.localizerCaptured && navigation.glideslopeCaptured;

    // Established on the ILS: the player hands the aircraft to Tower.
    if (established && aircraft.owner === this.state.playerId && this.airspace) {
      const runway = this.airspace.runway(clearance.airport, clearance.runway);
      const tower = this.airspace.airport(clearance.airport).towerCallsign;
      const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
      this.transmit(
        'controller',
        aircraft.id,
        `${capitalize(callsign)}, contact ${tower} ${frequencyWords(runway.towerFrequencyMhz)}.`,
      );
      this.transmit(
        'pilot',
        aircraft.id,
        `${capitalize(frequencyWords(runway.towerFrequencyMhz))}, ${callsign}.`,
      );
      this.changeOwner(aircraft, towerId(clearance.airport));
    }

    const geometry = finalApproachGeometry(
      aircraft.position,
      clearance,
      this.state.world.magneticVariationDeg,
    );
    const gateNm = distanceForHeightNm(clearance, settings['approaches.stabilizedGateFt']);

    if (!navigation.gatePassed && geometry.alongTrackNm <= gateNm) {
      navigation.gatePassed = true;
      const stable =
        established &&
        Math.abs(geometry.crossTrackNm) <= STABILIZED_CROSS_TRACK_NM &&
        aircraft.iasKts <= performance.speeds.final + STABILIZED_SPEED_MARGIN_KTS;
      if (!stable && settings['approaches.goArounds']) {
        const reason = !established
          ? 'not established on the ILS'
          : aircraft.iasKts > performance.speeds.final + STABILIZED_SPEED_MARGIN_KTS
            ? 'too fast'
            : 'not aligned with the runway';
        this.goAround(aircraft, reason);
        return 'flying';
      }
    }

    if (atThreshold) return 'landed';
    // Reached the runway without being on the glideslope (e.g. go-arounds turned off): go around anyway.
    if (geometry.alongTrackNm <= 0 && !navigation.glideslopeCaptured) {
      this.goAround(aircraft, 'not established on the ILS');
    }
    return 'flying';
  }

  /** Flies the published missed approach and hands the aircraft back to the player. */
  private goAround(aircraft: AircraftState, reason: string): void {
    const navigation = aircraft.navigation;
    if (navigation.mode !== 'approach') return;
    const { clearance } = navigation;
    const approach = this.airspace?.approaches.find(
      (candidate) =>
        candidate.airport === clearance.airport && candidate.id === clearance.approachId,
    );
    const legs =
      approach && this.airspace
        ? resolveLegs(this.airspace, clearance.airport, approach.missedApproach)
        : [];
    const missedAltitude = Math.max(
      DEFAULT_MISSED_APPROACH_ALTITUDE_FT,
      ...(approach?.missedApproach ?? []).flatMap((leg) =>
        leg.altitude && 'ft' in leg.altitude ? [leg.altitude.ft] : [],
      ),
    );

    aircraft.navigation =
      legs.length > 0
        ? {
            mode: 'procedure',
            name: 'Missed approach',
            legs,
            legIndex: 0,
            legStart: { ...aircraft.position },
          }
        : { mode: 'heading' };
    aircraft.targets.headingDeg = normalizeHeading(Math.round(clearance.courseDeg));
    aircraft.targets.turnDirection = 'shortest';
    aircraft.targets.altitudeFt = missedAltitude;
    aircraft.targets.speedMode = 'normal';
    aircraft.phase = 'goAround';
    this.changeOwner(aircraft, this.state.playerId);

    const facility = this.airspace?.airspace.controllers.approach.approachCallsign ?? 'Approach';
    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    this.transmit(
      'pilot',
      aircraft.id,
      `${facility}, ${callsign}, going around, ${reason}, climbing ${altitudeWords(missedAltitude)}.`,
    );
    this.emit({
      type: 'goAround',
      aircraftId: aircraft.id,
      airport: clearance.airport,
      runway: clearance.runway,
      reason,
    });
  }

  // ---- Arrivals ---------------------------------------------------------------

  private updateArrivals(): void {
    const operations = this.state.operations;
    if (!operations || !this.airspace) return;
    const rate = this.state.settings['traffic.arrivalRatePerHour'];
    if (rate <= 0) return;
    for (const airport of this.airspace.airspace.airports) {
      if (this.state.tick < (operations.nextArrivalTick[airport] ?? Infinity)) continue;
      const spawned = this.spawnArrival(airport);
      // If the entry point is busy, try again shortly instead of stacking aircraft.
      operations.nextArrivalTick[airport] =
        this.state.tick +
        (spawned
          ? departureInterval(this.rng, rate, this.state.config.tickSeconds)
          : Math.ceil(30 / this.state.config.tickSeconds));
    }
  }

  private spawnArrival(airport: string): boolean {
    const pack = this.airspace!;
    const operations = this.state.operations!;
    const runway = operations.runways[airport]?.arrivals[0];
    if (!runway) return false;

    const inUse = new Set([
      ...this.state.aircraft.map((a) => a.callsign),
      ...operations.departureQueue.map((d) => d.callsign),
    ]);
    // An arrival is a departure from somewhere else: same airline, type and city-pair logic.
    const flight = newDepartureEntry(
      {
        pack,
        airlines: this.airlines,
        random: this.rng,
        callsignsInUse: inUse,
        hasPerformance: (type) => this.performance.has(type),
      },
      { ...operations, nextDepartureNumber: 1 },
      airport,
      this.state.tick,
    );
    const gate = pack.fix(flight.gateFix);
    if (!gate) return false;
    const route = arrivalRouteFrom(
      pack,
      airport,
      runway,
      bearingTrue(pack.airspace.center, gate.position),
    );
    if (!route) return false;

    const altitude = Math.min(
      pack.airspace.boundary.ceilingFt - 1_000,
      route.crossingAltitudeFt ?? this.rng.pick(ARRIVAL_ENTRY_ALTITUDES_FT),
    );
    const crowded = this.state.aircraft.some(
      (other) =>
        distanceNm(other.position, route.entry) < ARRIVAL_ENTRY_SPACING_NM &&
        Math.abs(other.altitudeFt - altitude) < 1_000,
    );
    if (crowded) return false;

    const firstFix = route.legs.find((leg) => leg.position)!;
    const heading =
      Math.round(
        trueToMagnetic(
          bearingTrue(route.entry, firstFix.position!),
          this.state.world.magneticVariationDeg,
        ),
      ) % 360;
    const aircraft = this.addAircraft({
      callsign: flight.callsign,
      ...(flight.telephony ? { telephony: flight.telephony } : {}),
      aircraftType: flight.aircraftType,
      squawk: flight.squawk,
      flightPlan: { origin: flight.destination, destination: airport, route: [route.star] },
      phase: 'arrival',
      owner: this.state.playerId,
      position: route.entry,
      altitudeFt: altitude,
      headingDeg: heading,
      iasKts: altitude >= 10_000 ? 280 : 250,
      targets: { speedMode: 'normal' },
    });
    this.mutableAircraft(aircraft.id).navigation = {
      mode: 'procedure',
      name: route.star,
      legs: route.legs,
      legIndex: 0,
      legStart: { ...route.entry },
    };

    const facility = pack.airspace.controllers.approach.approachCallsign;
    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    const star = procedureWords(route.star);
    this.transmit(
      'pilot',
      aircraft.id,
      `${facility}, ${callsign}, ${altitudeWords(altitude)}, ${star} arrival.`,
    );
    this.emit({ type: 'arrivalEntered', aircraftId: aircraft.id, airport, star: route.star });
    return true;
  }

  // ---- Airport operations ------------------------------------------------------

  /** Wind at each airport (magnetic direction). Empty without an airspace. */
  get winds(): Readonly<Record<string, Wind>> {
    return this.state.operations?.winds ?? {};
  }

  /** Arrival and departure runways in use at each airport. */
  get activeRunways(): Readonly<Record<string, ActiveRunways>> {
    return this.state.operations?.runways ?? {};
  }

  /** Departures waiting for a runway or cleared for takeoff, oldest first. */
  get departureQueue(): readonly Readonly<DepartureEntry>[] {
    return this.state.operations?.departureQueue ?? [];
  }

  /** Departures held at the gate because the airport's queue is full. */
  gateHolds(airport: string): number {
    return this.state.operations?.gateHolds[airport] ?? 0;
  }

  /** Validates releasing a departure onto a runway without doing it. */
  checkRelease(entryId: string, runway: string): ValidationResult {
    const entry = this.state.operations?.departureQueue.find(
      (candidate) => candidate.id === entryId,
    );
    if (!entry) return { ok: false, reason: 'Departure is no longer in the queue' };
    if (entry.status !== 'waiting')
      return { ok: false, reason: `${entry.callsign} is already cleared for takeoff` };
    if (!this.activeRunways[entry.airport]?.departures.includes(runway)) {
      return { ok: false, reason: `Runway ${runway} is not in use for departures` };
    }
    return { ok: true };
  }

  /**
   * Clears a waiting departure for takeoff on an active departure runway. The
   * pilot reads back, lines up, and takes off once the runway is free.
   */
  releaseDeparture(entryId: string, runway: string): ValidationResult {
    const check = this.checkRelease(entryId, runway);
    if (!check.ok) return check;
    if (!this.airspace) return { ok: false, reason: 'No airspace loaded' };
    const operations = this.state.operations!;
    const entry = operations.departureQueue.find((candidate) => candidate.id === entryId)!;
    const tower = this.airspace.airport(entry.airport).towerCallsign;
    const callsign = spokenCallsign(entry.callsign, entry.telephony);

    this.transmit(
      'controller',
      undefined,
      `${capitalize(callsign)}, ${tower}, runway ${runwayWords(runway)}, cleared for takeoff.`,
      towerFacility(entry.airport),
    );
    this.state.comms.at(-1)!.callsign = entry.callsign;

    const [minDelay, maxDelay] = this.state.settings['pilots.responseDelaySec'];
    const tickSeconds = this.state.config.tickSeconds;
    const readbackAtTick =
      this.state.tick + Math.max(1, Math.ceil(this.rng.range(minDelay, maxDelay) / tickSeconds));
    const lineUp = Math.ceil(this.rng.range(...LINE_UP_SEC) / tickSeconds);
    const runwayKey = `${entry.airport}:${runway}`;
    const takeoffAtTick = Math.max(
      readbackAtTick + lineUp,
      operations.runwayFreeTick[runwayKey] ?? 0,
    );
    const wake = this.performance.get(entry.aircraftType).wakeCategory;
    operations.runwayFreeTick[runwayKey] =
      takeoffAtTick + Math.ceil(TAKEOFF_SPACING_SEC[wake] / tickSeconds);

    Object.assign(entry, { status: 'cleared', runway, readbackAtTick, takeoffAtTick });
    this.emit({ type: 'departureReleased', entryId, airport: entry.airport, runway });
    return { ok: true };
  }

  private startOperations(): void {
    if (!this.airspace) return;
    const settings = this.state.settings;
    const operations = initialOperations(
      this.airspace,
      this.rng,
      {
        windMode: settings['weather.windMode'],
        manualWind: {
          directionDeg: settings['weather.manualWindDirectionDeg'],
          speedKts: settings['weather.manualWindSpeedKts'],
        },
        maxTailwindKts: settings['weather.maxTailwindKts'],
        maxCrosswindKts: settings['weather.maxCrosswindKts'],
        departureRatePerHour: settings['traffic.departureRatePerHour'],
        maxDepartureQueue: settings['traffic.maxDepartureQueue'],
      },
      this.state.tick,
    );
    this.state.operations = operations;

    const rate = settings['traffic.departureRatePerHour'];
    for (const airport of this.airspace.airspace.airports) {
      if (rate > 0) {
        const initial = Math.min(INITIAL_QUEUE, settings['traffic.maxDepartureQueue']);
        for (let i = 0; i < initial; i++) this.queueDeparture(airport);
      }
      operations.nextDepartureTick[airport] =
        this.state.tick + departureInterval(this.rng, rate, this.state.config.tickSeconds);
    }
  }

  private queueDeparture(airport: string): void {
    const operations = this.state.operations!;
    const inUse = new Set([
      ...this.state.aircraft.map((a) => a.callsign),
      ...operations.departureQueue.map((d) => d.callsign),
    ]);
    const entry = newDepartureEntry(
      {
        pack: this.airspace!,
        airlines: this.airlines,
        random: this.rng,
        callsignsInUse: inUse,
        hasPerformance: (type) => this.performance.has(type),
      },
      operations,
      airport,
      this.state.tick,
    );
    operations.departureQueue.push(entry);
    this.emit({ type: 'departureQueued', entryId: entry.id, airport });
  }

  private updateDepartures(): void {
    const operations = this.state.operations;
    if (!operations || !this.airspace) return;
    const settings = this.state.settings;
    const maxQueue = settings['traffic.maxDepartureQueue'];
    const tick = this.state.tick;

    for (const airport of this.airspace.airspace.airports) {
      // A new departure is ready: join the queue, or wait at the gate if it's full.
      if (tick >= (operations.nextDepartureTick[airport] ?? Infinity)) {
        if (queuedAt(operations, airport) < maxQueue) this.queueDeparture(airport);
        else
          operations.gateHolds[airport] = Math.min(
            MAX_GATE_HOLDS,
            (operations.gateHolds[airport] ?? 0) + 1,
          );
        operations.nextDepartureTick[airport] =
          tick +
          departureInterval(
            this.rng,
            settings['traffic.departureRatePerHour'],
            this.state.config.tickSeconds,
          );
      }
      // Held departures move up as the queue empties.
      if ((operations.gateHolds[airport] ?? 0) > 0 && queuedAt(operations, airport) < maxQueue) {
        operations.gateHolds[airport]!--;
        this.queueDeparture(airport);
      }
    }

    for (const entry of [...operations.departureQueue]) {
      if (entry.status !== 'cleared') continue;
      if (entry.readbackAtTick === tick) {
        const callsign = spokenCallsign(entry.callsign, entry.telephony);
        this.transmit(
          'pilot',
          undefined,
          `Cleared for takeoff runway ${runwayWords(entry.runway!)}, ${callsign}.`,
        );
        this.state.comms.at(-1)!.callsign = entry.callsign;
      }
      if (entry.takeoffAtTick !== undefined && tick >= entry.takeoffAtTick) this.takeOff(entry);
    }
  }

  private takeOff(entry: DepartureEntry): void {
    const pack = this.airspace!;
    const operations = this.state.operations!;
    operations.departureQueue = operations.departureQueue.filter(
      (candidate) => candidate.id !== entry.id,
    );

    const runway = pack.runway(entry.airport, entry.runway!);
    const performance = this.performance.get(entry.aircraftType);
    const procedure = departureProcedure(pack, entry.airport, runway.id, entry.gateFix);
    // Lifting off about halfway down the runway.
    const liftoff = destinationPoint(
      runway.threshold,
      runway.trueHeadingDeg,
      (runway.lengthFt / 6076.12) * 0.55,
    );

    const aircraft = this.addAircraft({
      callsign: entry.callsign,
      ...(entry.telephony ? { telephony: entry.telephony } : {}),
      aircraftType: entry.aircraftType,
      squawk: entry.squawk,
      flightPlan: {
        origin: entry.airport,
        destination: entry.destination,
        route: [...(procedure.sid ? [procedure.sid] : []), entry.gateFix],
      },
      phase: 'departure',
      owner: towerId(entry.airport),
      position: liftoff,
      altitudeFt: runway.thresholdElevationFt + 100,
      headingDeg: Math.round(runway.magneticHeadingDeg) % 360,
      iasKts: performance.speeds.initialClimb,
      targets: {
        altitudeFt: pack.traffic.airports[entry.airport]!.initialAltitudeFt,
        speedMode: 'normal',
      },
    });
    this.mutableAircraft(aircraft.id).navigation = {
      mode: 'procedure',
      name: procedure.name,
      legs: procedure.legs,
      legIndex: 0,
      legStart: { ...liftoff },
    };
    this.emit({
      type: 'tookOff',
      aircraftId: aircraft.id,
      airport: entry.airport,
      runway: runway.id,
      procedure: procedure.name,
    });
  }

  /** Tower hands departures to the player once they climb through the radar contact altitude. */
  private checkRadarContact(aircraft: AircraftState): void {
    if (!this.airspace || aircraft.phase !== 'departure') return;
    if (aircraft.owner !== towerId(aircraft.flightPlan.origin)) return;
    if (aircraft.altitudeFt < this.state.settings['departures.radarContactAltitudeFt']) return;

    this.changeOwner(aircraft, this.state.playerId);
    aircraft.phase = 'enroute';
    const altitude = altitudeWords(Math.round(aircraft.altitudeFt / 100) * 100);
    const climbing = altitudeWords(aircraft.targets.altitudeFt);
    const navigation = aircraft.navigation;
    const procedure =
      navigation.mode === 'procedure' && navigation.name !== 'Runway heading'
        ? `, ${procedureWords(navigation.name)} departure`
        : '';
    const facility = this.airspace.airspace.controllers.approach.departureCallsign;
    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    this.transmit(
      'pilot',
      aircraft.id,
      `${facility}, ${callsign}, ${altitude} climbing ${climbing}${procedure}.`,
    );
  }

  private removeExitedAircraft(): void {
    if (!this.airspace) return;
    const { center } = this.airspace.airspace;
    const radius = this.airspace.boundaryRadiusNm;
    const centerId = this.airspace.airspace.controllers.center.id;
    for (const aircraft of [...this.state.aircraft]) {
      const handedOff = aircraft.owner === centerId;
      const margin = handedOff ? EXIT_MARGIN_HANDED_OFF_NM : EXIT_MARGIN_NM;
      if (distanceNm(center, aircraft.position) > radius + margin) {
        this.emit({
          type: 'leftAirspace',
          aircraftId: aircraft.id,
          callsign: aircraft.callsign,
          handedOff,
        });
        this.removeAircraft(aircraft.id);
      }
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

/** Controller id of an airport's tower, e.g. 'KJFK_TWR'. */
export function towerId(airport: string): string {
  return `${airport}_TWR`;
}

/** Radio log label for an airport's tower, e.g. 'JFK TWR'. */
function towerFacility(airport: string): string {
  return `${airport.length === 4 && airport.startsWith('K') ? airport.slice(1) : airport} TWR`;
}
