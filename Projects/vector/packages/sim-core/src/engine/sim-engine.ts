import {
  defaultSettings,
  IN_SESSION_TRAFFIC_KEYS,
  parseSettingsPatch,
  type SessionSettings,
} from '@vector/shared';
import {
  aircraftStateSchema,
  aircraftTargetsSchema,
  controllerIdSchema,
  flightPhaseSchema,
  groundSpeedKts,
  type AircraftState,
  type ControllerId,
  type FlightPhase,
  type IlsClearance,
  type AircraftTargets,
  type NewAircraft,
} from '../aircraft/aircraft';
import { stepAircraft } from '../aircraft/flight-model';
import {
  descendViaBottomFt,
  finalApproachGeometry,
  isOnSid,
  isOnStar,
  followGlideslope,
  routeAhead,
  updateNavigation,
} from '../aircraft/navigation';
import {
  distanceForHeightNm,
  ilsEligibility,
  type IlsEligibility,
} from '../commands/ils-eligibility';
import { TRACK_SAMPLE_SEC, trackPoint, type TrackPoint } from '../aircraft/track';
import {
  emptyScoreState,
  recordScore,
  separationPenalty,
  type ScoreKind,
  type ScoreState,
} from '../scoring/score';
import {
  arrivalFlightTimeSec,
  climbingFlightTimeSec,
  emptyTimingStats,
  formatDuration,
  levelFlightTimeSec,
  timingRp,
  type FlightKind,
  type FlightTimer,
  type TimingStats,
} from '../scoring/timing';
import { assessHandoff, boundaryCrossing, routeExitFix } from '../atc/handoff';
import {
  centerRouteTarget,
  predictedConflict,
  resolveConflict,
  type CenterSeparation,
} from '../atc/center';
import { machToIas } from '../atmosphere/isa';
import {
  arrivalRouteFrom,
  entryAltitudeLimitFt,
  type ArrivalRoute,
} from '../traffic/arrival-route';
import { isHemisphericLevel, requestedCruiseAltitude } from '../traffic/cruise-levels';
import {
  emptySeparationState,
  updateSeparation,
  WAKE_CATEGORY_LABELS,
  type WakeCategory,
  type Conflict,
  type Violation,
} from '../separation/separation';
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
  letterWords,
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
  weightedPick,
  airlineMix,
  tripBetween,
  type ActiveRunways,
  liveWinds,
  type DepartureEntry,
} from '../traffic/operations';
import {
  regionalWind,
  variedWind,
  withGust,
  liveWeatherReportSchema,
  type LiveWeatherReport,
  configWithinLimits,
  selectRunwayConfig,
  windComponents,
  WIND_VARIATIONS,
  type Wind,
} from '../weather/wind';
import { atisOutdated, atisText, nextAtisLetter, type Atis } from '../weather/atis';
import { headingDifference, normalizeHeading } from '../math/angles';
import {
  bearingTrue,
  destinationPoint,
  distanceNm,
  magneticToTrue,
  trueToMagnetic,
} from '../math/geo';
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
  /**
   * Runway configuration to use at an airport (by config id) instead of the
   * one the wind favors. Unknown airports or ids are ignored.
   */
  runwayConfigs?: Readonly<Record<string, string>>;
  /** Live wind mode: the current weather reports, so the session starts with the real wind. */
  liveWeather?: readonly LiveWeatherReport[];
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
/** Arrival descent profile: about 300 ft per NM, leveling off this far from the airport. */
const ARRIVAL_PROFILE_FT_PER_NM = 300;
const ARRIVAL_PROFILE_LEVEL_NM = 25;
/** Departures waiting for vectors at the end of their procedure resume the route above this. */
const ROUTE_RESUME_MIN_HEIGHT_FT = 3_000;
/** A departure's gate or an overflight's exit fix counts as passed within this distance. */
const ROUTE_FIX_PASSED_NM = 2;
/** A handoff within this of the requested level earns the requested level bonus. */
const REQUESTED_LEVEL_TOLERANCE_FT = 300;
/** Vertical distance under which a very close pass is a near midair collision. */
const NEAR_MID_AIR_VERTICAL_FT = 500;

const shortIcao = (icao: string) =>
  icao.length === 4 && icao.startsWith('K') ? icao.slice(1) : icao;
const flightLevelLabel = (altitudeFt: number, transitionAltitudeFt: number) =>
  altitudeFt >= transitionAltitudeFt
    ? `FL${Math.round(altitudeFt / 100)}`
    : `${altitudeFt.toLocaleString('en-US')} ft`;

/** Center re-plans its traffic this often. */
const CENTER_UPDATE_SEC = 5;
/** Arrivals' target times plan on joining the final this far from the runway. */
const ARRIVAL_FINAL_JOIN_NM = 12;
/** How often the reported wind is updated when it varies. */
const WIND_UPDATE_SEC = 60;
/** An airport keeps its runways at least this long after a change, so it doesn't swap back and forth. */
const MIN_RUNWAY_CHANGE_INTERVAL_SEC = 30 * 60;
/** Runways within limits still change when their tailwind passes this and another configuration gains at least the next value in headwind. */
const RUNWAY_CHANGE_TAILWIND_KTS = 2;
const RUNWAY_CHANGE_GAIN_KTS = 5;
/** Center lifts a resolution once aircraft are this many minima apart and diverging. */
const CENTER_CLEAR_FACTOR = 1.5;
/** Center never resolves a conflict below this. */
const CENTER_MIN_RESOLUTION_FT = 6_000;
/** Arrivals never enter lower than this. */
const ARRIVAL_MIN_ENTRY_ALTITUDE_FT = 6_000;
/** Transits enter and leave at least this far apart around the airspace (degrees). */
const MIN_TRANSIT_TURN_DEG = 110;
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
        separation: emptySeparationState(),
        tracks: {},
        centerResolutions: {},
        score: emptyScoreState(),
        routeFixPassed: {},
      },
      options,
    );
    engine.startOperations(options.runwayConfigs, options.liveWeather);
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
    if (this.state.tick % Math.max(1, Math.round(WIND_UPDATE_SEC / tickSeconds)) === 0) {
      this.updateWinds();
      this.reviewRunways();
      this.updateAtis();
    }
    this.applyDueRunwayChanges();
    this.updateDepartures();
    this.updateArrivals();
    this.updateTransits();

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
      this.continueRoute(aircraft, navigation);
      if (navigation.localizerCaptured)
        this.emit({ type: 'localizerCaptured', aircraftId: aircraft.id });
      if (navigation.glideslopeCaptured)
        this.emit({ type: 'glideslopeCaptured', aircraftId: aircraft.id });

      this.checkHoldClearance(aircraft);
      const result = stepAircraft(aircraft, performance, tickSeconds, variation, flightModel);
      this.checkRadarContact(aircraft);
      const atThreshold = followGlideslope(aircraft, variation, tickSeconds);
      if (aircraft.navigation.mode === 'approach') {
        const { airport, runway } = aircraft.navigation.clearance;
        const outcome = this.monitorApproach(aircraft, performance, atThreshold);
        if (outcome === 'landed') landed.push({ aircraft, airport, runway });
      }

      // Only assigned headings: on a direct or a procedure the target moves every tick.
      if (result.reachedHeading && aircraft.navigation.mode === 'heading') {
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
    this.recordTracks();
    if (this.state.tick % Math.max(1, Math.round(CENTER_UPDATE_SEC / tickSeconds)) === 0)
      this.updateCenterTraffic();
    this.removeExitedAircraft();
    this.checkSeparation();
  }

  // ---- Departure and overflight routes -------------------------------------------------

  /**
   * Departures and overflights fly their route: a finished departure procedure
   * continues to the departure gate fix, and once past its gate (or an
   * overflight past its exit fix) the aircraft heads on toward its destination.
   * Passing the fix, however the aircraft got there, is recorded for scoring.
   */
  private continueRoute(
    aircraft: AircraftState,
    events: { fixPassed?: string; procedureCompleted?: string },
  ): void {
    const pack = this.airspace;
    if (!pack || pack.airspace.airports.includes(aircraft.flightPlan.destination)) return;
    const exitFix = routeExitFix(pack, aircraft);
    if (!exitFix) return;
    if (
      !this.state.routeFixPassed[aircraft.id] &&
      (events.fixPassed === exitFix.ident ||
        distanceNm(aircraft.position, exitFix.position) <= ROUTE_FIX_PASSED_NM)
    ) {
      this.state.routeFixPassed[aircraft.id] = true;
    }
    const destination = pack.traffic.cityPositions[aircraft.flightPlan.destination];
    // A procedure that ends "fly heading, expect vectors" (VM/FM legs) with no vectors
    // given: the pilot proceeds on the filed route to the gate.
    const navigation = aircraft.navigation;
    const awaitingVectors =
      navigation.mode === 'procedure' &&
      ['VM', 'FM'].includes(navigation.legs[navigation.legIndex]?.pathTerminator ?? '') &&
      aircraft.altitudeFt >= ROUTE_RESUME_MIN_HEIGHT_FT;
    if ((events.procedureCompleted || awaitingVectors) && !this.state.routeFixPassed[aircraft.id]) {
      this.applyCommand(aircraft, {
        type: 'directTo',
        fix: exitFix.ident,
        position: exitFix.position,
      });
    } else if (events.fixPassed === exitFix.ident && destination) {
      this.applyCommand(aircraft, {
        type: 'directTo',
        fix: aircraft.flightPlan.destination,
        position: destination,
      });
    }
  }

  /** Whether a departure or overflight has passed its gate or exit fix. */
  routeFlown(aircraftId: string): boolean {
    return this.state.routeFixPassed[aircraftId] === true;
  }

  // ---- Center (computer controller) ---------------------------------------------

  /**
   * Flies the traffic the player has handed to Center: to its requested
   * level (or a resolution level while in conflict), along its route toward
   * its destination, at normal speed; and keeps Center's aircraft apart.
   */
  private updateCenterTraffic(): void {
    const pack = this.airspace;
    const settings = this.state.settings;
    if (!pack || !settings['center.automation']) return;
    const centerTraffic = this.state.aircraft.filter(
      (aircraft) =>
        pack.isCenter(aircraft.owner) &&
        aircraft.phase !== 'arrival' &&
        aircraft.phase !== 'approach',
    );
    const separation = {
      lateralNm: Math.max(
        settings['separation.lateralNm'],
        settings['separation.enrouteLateralNm'],
      ),
      verticalFt: settings['separation.verticalFt'],
      lookaheadSec: settings['center.conflictLookaheadSec'],
      magneticVariationDeg: this.state.world.magneticVariationDeg,
    };
    for (const aircraft of centerTraffic) {
      const performance = this.performance.get(aircraft.aircraftType);
      if (aircraft.targets.speedMode === 'assigned')
        this.applyCommand(aircraft, { type: 'resumeNormalSpeed' });

      // On a heading, or at the end of a departure procedure waiting for vectors (VM/FM legs).
      const navigation = aircraft.navigation;
      const awaitingVectors =
        navigation.mode === 'procedure' &&
        ['VM', 'FM'].includes(navigation.legs[navigation.legIndex]?.pathTerminator ?? '');
      if (navigation.mode === 'heading' || awaitingVectors) {
        const target = centerRouteTarget(pack, aircraft);
        if (target) this.applyCommand(aircraft, { type: 'directTo', ...target });
      }

      this.assignCenterAltitude(aircraft, performance.ceilingFt);
    }
    // Then look for conflicts with those clearances, and change levels to resolve them.
    if (settings['center.resolveConflicts']) {
      this.resolveCenterConflicts(centerTraffic, separation);
      for (const aircraft of centerTraffic)
        this.assignCenterAltitude(aircraft, this.performance.get(aircraft.aircraftType).ceilingFt);
    }
  }

  /** The level Center wants: a conflict resolution while one is in force, else the requested level. */
  private assignCenterAltitude(aircraft: AircraftState, ceilingFt: number): void {
    const resolution = this.state.centerResolutions[aircraft.id];
    const wanted =
      resolution?.altitudeFt ??
      aircraft.flightPlan.requestedAltitudeFt ??
      aircraft.targets.altitudeFt;
    const altitude = Math.min(wanted, ceilingFt);
    if (aircraft.targets.altitudeFt !== altitude)
      this.applyCommand(aircraft, { type: 'altitude', altitudeFt: altitude });
  }

  private resolveCenterConflicts(
    traffic: readonly AircraftState[],
    separation: CenterSeparation,
  ): void {
    const resolutions = this.state.centerResolutions;
    const byId = new Map(traffic.map((aircraft) => [aircraft.id, aircraft]));

    // Lift resolutions once the two aircraft are clear of each other and diverging.
    for (const [id, resolution] of Object.entries(resolutions)) {
      const aircraft = byId.get(id);
      const other = byId.get(resolution.otherId);
      if (!aircraft || !other) {
        delete resolutions[id];
        continue;
      }
      const now = distanceNm(aircraft.position, other.position);
      const soon = distanceNm(
        destinationPoint(
          aircraft.position,
          magneticToTrue(aircraft.headingDeg, separation.magneticVariationDeg),
          groundSpeedKts(aircraft) / 360,
        ),
        destinationPoint(
          other.position,
          magneticToTrue(other.headingDeg, separation.magneticVariationDeg),
          groundSpeedKts(other) / 360,
        ),
      );
      if (now > separation.lateralNm * CENTER_CLEAR_FACTOR && soon > now) delete resolutions[id];
    }

    // New conflicts: one aircraft of each pair changes level.
    for (let i = 0; i < traffic.length; i++) {
      for (let j = i + 1; j < traffic.length; j++) {
        const a = traffic[i]!;
        const b = traffic[j]!;
        const resolved = (x: AircraftState, y: AircraftState) =>
          resolutions[x.id]?.otherId === y.id;
        if (resolved(a, b) || resolved(b, a)) continue;
        if (!predictedConflict(a, b, separation)) continue;
        const minimum = Math.max(
          CENTER_MIN_RESOLUTION_FT,
          this.airspace!.minimumVectoringAltitude(a.position) ?? 0,
          this.airspace!.minimumVectoringAltitude(b.position) ?? 0,
        );
        const { movingId, otherId, resolutionAltitudeFt } = resolveConflict(
          a,
          b,
          separation,
          minimum,
        );
        resolutions[movingId] = {
          altitudeFt: resolutionAltitudeFt,
          otherId,
          sinceTick: this.state.tick,
        };
      }
    }
  }

  /** Center level changes in force, by the aircraft moved (for display and tests). */
  get centerResolutions(): Readonly<
    Record<string, Readonly<{ altitudeFt: number; otherId: string }>>
  > {
    return this.state.centerResolutions;
  }

  // ---- Tracks ---------------------------------------------------------------------

  /**
   * The path an aircraft has flown since it first became the player's
   * traffic (entering the airspace, or radar contact for a departure),
   * oldest first. Empty before then.
   */
  track(aircraftId: string): readonly Readonly<TrackPoint>[] {
    return this.state.tracks[aircraftId] ?? [];
  }

  private recordTracks(): void {
    const sampleTicks = Math.max(1, Math.round(TRACK_SAMPLE_SEC / this.state.config.tickSeconds));
    for (const aircraft of this.state.aircraft) {
      const track = this.state.tracks[aircraft.id];
      if (!track) {
        if (aircraft.owner === this.state.playerId)
          this.state.tracks[aircraft.id] = [trackPoint(this.state.tick, aircraft)];
      } else if (this.state.tick - track.at(-1)![0] >= sampleTicks) {
        track.push(trackPoint(this.state.tick, aircraft));
      }
    }
  }

  // ---- Separation ------------------------------------------------------------------

  /** Pairs currently in conflict (predicted or actual losses of separation). */
  get conflicts(): readonly Readonly<Conflict>[] {
    return this.state.separation.conflicts;
  }

  /** Every loss of separation this session, oldest first. */
  get violations(): readonly Readonly<Violation>[] {
    return this.state.separation.violations;
  }

  private checkSeparation(): void {
    const settings = this.state.settings;
    const elevations = new Map(
      this.airspace?.airports.map((airport) => [airport.icao, airport.elevationFt]) ?? [],
    );
    const { started, ended, violationsStarted } = updateSeparation(
      this.state.separation,
      this.state.aircraft,
      {
        lateralNm: settings['separation.lateralNm'],
        enrouteLateralNm: settings['separation.enrouteLateralNm'],
        // Without an airspace there is no radar site: everything counts as the terminal area.
        terminalRangeNm: this.airspace ? settings['separation.terminalRangeNm'] : Infinity,
        radarPosition: this.airspace?.airspace.radar.position ?? { lat: 0, lon: 0 },
        verticalFt: settings['separation.verticalFt'],
        lookaheadSec: settings['separation.conflictAlertLookaheadSec'],
        playerId: this.state.playerId,
        magneticVariationDeg: this.state.world.magneticVariationDeg,
        ...(settings['separation.wakeTurbulence']
          ? {
              wakeCategory: (type: string) =>
                this.performance.has(type) ? this.performance.get(type).wakeCategory : undefined,
            }
          : {}),
      },
      this.state.tick,
      // Height above the nearer of the aircraft's airports.
      (aircraft) =>
        Math.max(
          elevations.get(aircraft.flightPlan.origin) ?? 0,
          elevations.get(aircraft.flightPlan.destination) ?? 0,
        ),
    );
    for (const conflict of started) this.emit({ type: 'conflictStarted', conflict });
    for (const conflict of ended) this.emit({ type: 'conflictEnded', conflict });
    for (const violation of violationsStarted) this.emit({ type: 'separationLost', violation });
    this.scoreSeparation();
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
    const result = validateInstruction(aircraft, commands, {
      playerId: this.state.playerId,
      performance: this.performance.get(aircraft.aircraftType),
      speedLimitBelowFt,
      speedLimitKts,
    });
    if (!result.ok || !this.airspace || !commands.some((c) => c.type === 'handoff')) return result;
    // Center has to accept the handoff: close to the boundary, high enough, and leaving.
    const handoff = assessHandoff(this.airspace, aircraft, this.state.settings);
    return handoff.ok ? result : { ok: false, reason: handoff.reason! };
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
    // The pilot judges an approach clearance as it was given, with the rest of the
    // instruction (an intercept heading, say) applied: what the controller saw is what they get.
    const ils = ordered.find((c) => c.type === 'clearedIls');
    const verdict = ils ? this.ilsEligibilityWith(aircraft, ils.clearance, ordered) : undefined;
    this.state.pendingInstructions.push({
      id: `I${this.state.nextMessageNumber}`,
      aircraftId,
      commands: cloneJson(ordered),
      executeAtTick: this.state.tick + delayTicks,
      ...(verdict
        ? { ilsVerdict: verdict.ok ? { ok: true } : { ok: false, reason: verdict.reason } }
        : {}),
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
          const eligibility = pending.ilsVerdict
            ? pending.ilsVerdict.ok
              ? ({ ok: true } as const)
              : { ok: false as const, reason: pending.ilsVerdict.reason ?? 'unable' }
            : this.ilsEligibilityFor(aircraft, command.clearance);
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
        // A heading ends a direct-to, procedure or hold (radar vectors). Before the localizer is captured
        // it is the intercept heading; after, it breaks off the approach.
        if (
          navigation.mode === 'direct' ||
          navigation.mode === 'procedure' ||
          navigation.mode === 'hold' ||
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
        // An assigned altitude cancels the procedure's altitude restrictions (not its speeds).
        if (navigation.mode === 'procedure') {
          delete navigation.descendVia;
          delete navigation.climbVia;
          delete navigation.vnavAltitudeFt;
        }
        aircraft.targets.altitudeFt = command.altitudeFt;
        break;
      case 'climbVia':
        if (navigation.mode === 'procedure' && isOnSid(aircraft)) {
          navigation.climbVia = true;
          if (command.exceptMaintainFt !== undefined)
            aircraft.targets.altitudeFt = command.exceptMaintainFt;
        }
        break;
      case 'descendVia':
        if (navigation.mode === 'procedure' && isOnStar(aircraft)) {
          navigation.descendVia = true;
          aircraft.targets.altitudeFt = descendViaBottomFt(aircraft) ?? aircraft.targets.altitudeFt;
        }
        break;
      case 'speed':
        aircraft.targets.speedMode = 'assigned';
        aircraft.targets.iasKts = command.iasKts;
        break;
      case 'resumeNormalSpeed':
        aircraft.targets.speedMode = 'normal';
        break;
      case 'directTo': {
        // Direct to a fix further along the procedure: skip ahead on it (keeping its restrictions).
        if (navigation.mode === 'procedure') {
          const index = navigation.legs.findIndex(
            (leg, i) =>
              i >= navigation.legIndex &&
              leg.fix === command.fix &&
              leg.position !== undefined &&
              !leg.pathTerminator.startsWith('F'),
          );
          if (index !== -1) {
            navigation.legIndex = index;
            navigation.legStart = { ...aircraft.position };
            delete navigation.inbound;
            delete navigation.extending;
            aircraft.targets.turnDirection = 'shortest';
            break;
          }
        }
        cancelApproach();
        aircraft.navigation = {
          mode: 'direct',
          fix: command.fix,
          position: { ...command.position },
        };
        break;
      }
      case 'hold': {
        // Held at a fix further along its procedure: it can resume the procedure from there.
        let resume: Extract<AircraftState['navigation'], { mode: 'procedure' }> | undefined;
        if (navigation.mode === 'procedure' && (isOnStar(aircraft) || isOnSid(aircraft))) {
          const index = navigation.legs.findIndex(
            (leg, i) =>
              i >= navigation.legIndex &&
              leg.fix === command.fix &&
              !leg.pathTerminator.startsWith('F'),
          );
          if (index !== -1 && index + 1 < navigation.legs.length) {
            resume = {
              ...cloneJson(navigation),
              legIndex: index + 1,
              legStart: { ...command.position },
            };
            delete resume.inbound;
            delete resume.extending;
            delete resume.vnavAltitudeFt;
          }
          // Holding stops a descent or climb via the procedure where it is.
          if (navigation.descendVia || navigation.climbVia)
            aircraft.targets.altitudeFt =
              Math.round((navigation.vnavAltitudeFt ?? aircraft.altitudeFt) / 100) * 100;
        }
        cancelApproach();
        aircraft.navigation = {
          mode: 'hold',
          fix: command.fix,
          position: { ...command.position },
          inboundCourseDeg: command.inboundCourseDeg,
          turn: command.turn,
          ...(command.legNm !== undefined ? { legNm: command.legNm } : {}),
          ...(command.maxSpeedKts !== undefined ? { maxSpeedKts: command.maxSpeedKts } : {}),
          published: command.published,
          phase: 'toFix',
          efcTick: command.efcTick,
          laps: 0,
          ...(resume ? { resume } : {}),
        };
        break;
      }
      case 'resumeProcedure':
        if (navigation.mode === 'hold' && navigation.resume) {
          aircraft.navigation = cloneJson(navigation.resume);
          aircraft.targets.turnDirection = 'shortest';
          if (aircraft.navigation.mode === 'procedure' && aircraft.navigation.descendVia)
            aircraft.targets.altitudeFt =
              descendViaBottomFt(aircraft) ?? aircraft.targets.altitudeFt;
        }
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
  ilsEligibility(
    aircraftId: string,
    clearance: IlsClearance,
    /** The rest of the instruction it would be given with (e.g. an intercept heading). */
    withCommands: readonly AtcCommand[] = [],
  ): IlsEligibility {
    const aircraft = this.getAircraft(aircraftId);
    if (!aircraft) return { ok: false, problem: 'position', reason: 'no longer on the scope' };
    return this.ilsEligibilityWith(aircraft, clearance, withCommands);
  }

  /** Eligibility with the instruction's other lateral, vertical and speed commands applied first. */
  private ilsEligibilityWith(
    aircraft: Readonly<AircraftState>,
    clearance: IlsClearance,
    commands: readonly AtcCommand[],
  ): IlsEligibility {
    const others = commands.filter((c) =>
      ['heading', 'directTo', 'altitude', 'speed', 'resumeNormalSpeed'].includes(c.type),
    );
    if (others.length === 0) return this.ilsEligibilityFor(aircraft, clearance);
    const preview = cloneJson(aircraft) as AircraftState;
    for (const command of others) this.applyCommand(preview, command);
    return this.ilsEligibilityFor(preview, clearance);
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

  // ---- In-session traffic tuning ---------------------------------------------------

  /**
   * Changes traffic rates or the departure queue cap while the session runs.
   * Only the in-session traffic settings can change; new rates take effect at
   * once (the next spawns are rescheduled).
   */
  updateTrafficSettings(
    patch: Partial<Pick<SessionSettings, InSessionTrafficKey>>,
  ): ValidationResult {
    const keys = Object.keys(patch);
    const unsupported = keys.filter(
      (key) => !(IN_SESSION_TRAFFIC_KEYS as readonly string[]).includes(key),
    );
    if (unsupported.length > 0)
      return { ok: false, reason: `Can't change ${unsupported.join(', ')} during a session` };
    try {
      parseSettingsPatch('session', patch);
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Invalid settings' };
    }
    const before = { ...this.state.settings };
    Object.assign(this.state.settings, patch);

    const operations = this.state.operations;
    if (operations && this.airspace) {
      const tick = this.state.tick;
      const interval = (rate: number) =>
        departureInterval(this.rng, rate, this.state.config.tickSeconds);
      for (const airport of this.airspace.airspace.airports) {
        if (
          patch['traffic.arrivalRatePerHour'] !== undefined &&
          patch['traffic.arrivalRatePerHour'] !== before['traffic.arrivalRatePerHour']
        ) {
          operations.nextArrivalTick[airport] =
            tick + interval(patch['traffic.arrivalRatePerHour']);
        }
        if (
          patch['traffic.departureRatePerHour'] !== undefined &&
          patch['traffic.departureRatePerHour'] !== before['traffic.departureRatePerHour']
        ) {
          operations.nextDepartureTick[airport] =
            tick + interval(patch['traffic.departureRatePerHour']);
        }
      }
      if (
        patch['traffic.transitRatePerHour'] !== undefined &&
        patch['traffic.transitRatePerHour'] !== before['traffic.transitRatePerHour']
      ) {
        operations.nextTransitTick = tick + interval(patch['traffic.transitRatePerHour']);
      }
    }
    this.emit({ type: 'settingsChanged', keys });
    return { ok: true };
  }

  // ---- Transits ---------------------------------------------------------------

  private updateTransits(): void {
    const operations = this.state.operations;
    if (!operations || !this.airspace) return;
    const rate = this.state.settings['traffic.transitRatePerHour'];
    if (rate <= 0 || this.state.tick < operations.nextTransitTick) return;
    const spawned = this.spawnTransit();
    operations.nextTransitTick =
      this.state.tick +
      (spawned
        ? departureInterval(this.rng, rate, this.state.config.tickSeconds)
        : Math.ceil(30 / this.state.config.tickSeconds));
  }

  /** An overflight crossing the airspace: in from one departure gate's direction, out toward another's. */
  private spawnTransit(): boolean {
    const pack = this.airspace!;
    const { center } = pack.airspace;
    const random = this.rng;
    const gates = Object.entries(pack.traffic.departureGates).flatMap(([name, idents]) => {
      const fixes = idents.map((ident) => pack.fix(ident)).filter((fix) => fix !== undefined);
      return fixes.length > 0 ? [{ name, fixes }] : [];
    });
    if (gates.length < 2) return false;

    const entryGate = random.pick(gates);
    const entryFix = random.pick(entryGate.fixes);
    const entryBearing = bearingTrue(center, entryFix.position);
    const exits = gates.filter(
      (gate) =>
        Math.abs(headingDifference(entryBearing, bearingTrue(center, gate.fixes[0]!.position))) >=
        MIN_TRANSIT_TURN_DEG,
    );
    if (exits.length === 0) return false;
    const exitGate = random.pick(exits);
    const exitFix = random.pick(exitGate.fixes);

    // City pair: somewhere in the entry direction to somewhere in the exit direction.
    const allTraffic = Object.values(pack.traffic.airports);
    const citiesToward = (gate: string) =>
      allTraffic.flatMap((t) => t.destinations).filter((d) => d.gate === gate);
    const fromCities = citiesToward(entryGate.name);
    const toCities = citiesToward(exitGate.name);
    if (fromCities.length === 0 || toCities.length === 0) return false;
    const origin = weightedPick(random, fromCities).icao;
    const destination = weightedPick(random, toCities).icao;

    // An airline with a type that can fly the whole trip, and that type.
    const fromCity = pack.traffic.cityPositions[origin];
    const toCity = pack.traffic.cityPositions[destination];
    const tripNm = fromCity && toCity ? distanceNm(fromCity, toCity) : 600;
    const capable = (types: readonly string[]) =>
      types.filter(
        (type) => this.performance.has(type) && this.performance.get(type).rangeNm >= tripNm,
      );
    const airlines = airlineMix(
      allTraffic.flatMap((t) => t.airlines).filter((a) => capable(a.types).length > 0),
      this.state.settings['traffic.fleetMix'],
    );
    if (airlines.length === 0) return false;
    const airline = weightedPick(random, airlines);
    const types = capable(airline.types);
    if (types.length === 0) return false;
    const info = this.airlines.get(airline.icao);
    const [low, high] = info?.flightNumbers ?? [100, 2999];
    const inUse = new Set([
      ...this.state.aircraft.map((a) => a.callsign),
      ...(this.state.operations?.departureQueue ?? []).map((d) => d.callsign),
    ]);
    let callsign = '';
    for (let attempt = 0; attempt < 50 && (!callsign || inUse.has(callsign)); attempt++) {
      callsign = `${airline.icao}${random.int(low, high)}`;
    }

    const entry = destinationPoint(center, entryBearing, pack.boundaryRadiusNm - 1);
    const aircraftType = random.pick(types);
    const performance = this.performance.get(aircraftType);
    const variation = this.state.world.magneticVariationDeg;
    // Cruising at the level filed for the whole trip, which suits the direction it crosses in.
    const from = pack.traffic.cityPositions[origin];
    const to = pack.traffic.cityPositions[destination];
    const crossingCourse = trueToMagnetic(bearingTrue(entry, exitFix.position), variation);
    let altitude = requestedCruiseAltitude(
      random,
      from && to ? distanceNm(from, to) : 600,
      crossingCourse,
      performance.ceilingFt,
    );
    if (!isHemisphericLevel(altitude, crossingCourse)) altitude -= 1_000;
    altitude = Math.min(altitude, pack.airspace.boundary.ceilingFt - 1_000);
    const crowded = this.state.aircraft.some(
      (other) =>
        distanceNm(other.position, entry) < ARRIVAL_ENTRY_SPACING_NM &&
        Math.abs(other.altitudeFt - altitude) < 1_000,
    );
    if (crowded) return false;

    const aircraft = this.addAircraft({
      callsign,
      ...(info ? { telephony: info.telephony } : {}),
      aircraftType,
      squawk: `${random.int(1, 6)}${random.int(0, 7)}${random.int(0, 7)}${random.int(0, 7)}`,
      flightPlan: { origin, destination, route: [exitFix.ident], requestedAltitudeFt: altitude },
      phase: 'enroute',
      owner: this.state.playerId,
      position: entry,
      altitudeFt: altitude,
      headingDeg: Math.round(crossingCourse) % 360,
      iasKts: Math.min(
        performance.speeds.climb,
        Math.round(machToIas(performance.cruiseMach, altitude)),
      ),
      targets: { speedMode: 'normal' },
    });
    this.mutableAircraft(aircraft.id).navigation = {
      mode: 'direct',
      fix: exitFix.ident,
      position: { ...exitFix.position },
    };

    const spoken = spokenCallsign(aircraft.callsign, aircraft.telephony);
    this.transmit(
      'pilot',
      aircraft.id,
      `${this.checkInFacility(altitude)}, ${spoken}, ${altitudeWords(altitude)}.`,
    );
    this.emit({ type: 'transitEntered', aircraftId: aircraft.id, exitFix: exitFix.ident });
    return true;
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
    const arrivalRunways = operations.runways[airport]?.arrivals ?? [];
    if (arrivalRunways.length === 0) return false;

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
        ceilingFt: (type) => this.performance.get(type).ceilingFt,
        rangeNm: (type) => this.performance.get(type).rangeNm,
        fleetMix: this.state.settings['traffic.fleetMix'],
      },
      { ...operations, nextDepartureNumber: 1 },
      airport,
      this.state.tick,
    );
    const gate = pack.fix(flight.gateFix);
    if (!gate) return false;
    // With more than one arrival runway in use, arrivals are spread across them: start
    // from a random one, and take the first with an arrival route from this direction.
    const first = this.rng.int(0, arrivalRunways.length - 1);
    const fromBearing = bearingTrue(pack.airspace.center, gate.position);
    let route: ArrivalRoute | undefined;
    for (let k = 0; k < arrivalRunways.length && !route; k++) {
      const runway = arrivalRunways[(first + k) % arrivalRunways.length]!;
      route = arrivalRouteFrom(pack, airport, runway, fromBearing);
    }
    if (!route) return false;

    const altitude = this.arrivalEntryAltitude(
      route,
      airport,
      flight.destination,
      flight.aircraftType,
    );
    const crowded = this.state.aircraft.some(
      (other) =>
        distanceNm(other.position, route.entry) < ARRIVAL_ENTRY_SPACING_NM &&
        Math.abs(other.altitudeFt - altitude) < 1_000,
    );
    if (crowded) return false;

    const performance = this.performance.get(flight.aircraftType);
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
      iasKts:
        altitude >= 10_000
          ? Math.min(
              performance.speeds.descent,
              Math.round(machToIas(performance.cruiseMach, altitude)),
            )
          : 250,
      targets: { speedMode: 'normal' },
    });
    const arriving = this.mutableAircraft(aircraft.id);
    arriving.navigation = {
      mode: 'procedure',
      name: route.star,
      legs: route.legs,
      legIndex: 0,
      legStart: { ...route.entry },
    };
    // Center clears arrivals to descend via a STAR that publishes altitudes.
    const bottom = descendViaBottomFt(arriving);
    if (bottom !== undefined && arriving.navigation.mode === 'procedure') {
      arriving.navigation.descendVia = true;
      arriving.targets.altitudeFt = Math.min(bottom, altitude);
    }

    // Arrivals have the destination's ATIS and say which one.
    const atis = this.state.operations?.atis?.[airport];
    const information = atis ? `, information ${letterWords(atis.letter)}` : '';
    const facility = this.checkInFacility(altitude);
    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    const star = procedureWords(route.star);
    this.transmit(
      'pilot',
      aircraft.id,
      bottom !== undefined
        ? `${facility}, ${callsign}, ${altitudeWords(altitude)}, descending via the ${star} arrival${information}.`
        : `${facility}, ${callsign}, ${altitudeWords(altitude)}, ${star} arrival${information}.`,
    );
    this.emit({ type: 'arrivalEntered', aircraftId: aircraft.id, airport, star: route.star });
    return true;
  }

  /**
   * Who pilots call when they check in: Center at the flight levels, Approach
   * below (the player works both in this airspace).
   */
  private checkInFacility(altitudeFt: number): string {
    const { controllers, transitionAltitudeFt } = this.airspace!.airspace;
    return altitudeFt >= transitionAltitudeFt
      ? controllers.center.callsign
      : controllers.approach.approachCallsign;
  }

  /**
   * Where an arrival enters: at its cruise level, unless that is above a
   * normal descent profile for the track still to fly (then on the profile).
   * Descending it is the player's job.
   */
  private arrivalEntryAltitude(
    route: ArrivalRoute,
    airport: string,
    originCity: string,
    aircraftType: string,
  ): number {
    const pack = this.airspace!;
    const field = pack.airport(airport);
    const lastFix = [...route.legs].reverse().find((leg) => leg.position)?.position;
    const trackNm = route.routeDistanceNm + (lastFix ? distanceNm(lastFix, field.position) : 0);
    const trip = tripBetween(pack, field.position, originCity);
    const cruise = requestedCruiseAltitude(
      this.rng,
      trip.distanceNm,
      // Flying in from the city: the reverse course.
      trueToMagnetic(trip.courseDeg + 180, this.state.world.magneticVariationDeg),
      this.performance.get(aircraftType).ceilingFt,
    );
    const profile =
      field.elevationFt +
      Math.max(0, trackNm - ARRIVAL_PROFILE_LEVEL_NM) * ARRIVAL_PROFILE_FT_PER_NM;
    // And low enough to meet the STAR's published restrictions (Center has started it down).
    const restrictions = entryAltitudeLimitFt(route) ?? Infinity;
    const altitude = Math.floor(Math.min(cruise, profile, restrictions) / 1_000) * 1_000;
    return Math.max(
      ARRIVAL_MIN_ENTRY_ALTITUDE_FT,
      Math.min(altitude, pack.airspace.boundary.ceilingFt - 1_000),
    );
  }

  // ---- Airport operations ------------------------------------------------------

  /** Wind at each airport (magnetic direction). Empty without an airspace. */
  get winds(): Readonly<Record<string, Wind>> {
    return this.state.operations?.winds ?? {};
  }

  /** Runway changes announced and not yet made, by airport. */
  get pendingRunwayChanges(): Readonly<
    Record<string, Readonly<ActiveRunways & { atTick: number }>>
  > {
    return this.state.operations?.pendingRunwayChanges ?? {};
  }

  /**
   * Announces a runway change at airports whose runways the wind no longer
   * suits (over the tailwind or crosswind limit, or a tailwind while the wind
   * clearly favors other runways), when a better configuration exists. Runways the player chose, and airports that changed recently, are
   * left alone.
   */
  private reviewRunways(): void {
    const operations = this.state.operations;
    const pack = this.airspace;
    const settings = this.state.settings;
    if (!operations || !pack || !settings['weather.runwayChanges']) return;
    const { tickSeconds } = this.state.config;
    const limits = {
      maxTailwindKts: settings['weather.maxTailwindKts'],
      maxCrosswindKts: settings['weather.maxCrosswindKts'],
    };
    const minInterval = Math.round(MIN_RUNWAY_CHANGE_INTERVAL_SEC / tickSeconds);
    for (const [airport, current] of Object.entries(operations.runways)) {
      if (current.chosenByPlayer || operations.pendingRunwayChanges[airport]) continue;
      const last = operations.lastRunwayChangeTick[airport];
      if (last !== undefined && this.state.tick - last < minInterval) continue;
      const wind = operations.winds[airport];
      const configs = pack.traffic.airports[airport]?.runwayConfigs ?? [];
      const config = configs.find((c) => c.id === current.configId);
      if (!wind || !config) continue;
      const heading = (runway: string) => pack.runway(airport, runway).magneticHeadingDeg;
      const better = selectRunwayConfig(configs, heading, wind, limits);
      if (better.id === config.id || !configWithinLimits(better, heading, wind, limits)) continue;
      // Change when the runways in use go over a limit, or when they have a tailwind and
      // the wind now clearly favors others (not for small gains: a change is costly).
      const primaryHeadwind = (c: typeof config) =>
        Math.min(
          ...[c.arrivals[0]!, c.departures[0]!].map(
            (runway) => windComponents(wind, heading(runway)).headwindKts,
          ),
        );
      const overLimit = !configWithinLimits(config, heading, wind, limits);
      const windFavorsOthers =
        primaryHeadwind(config) < -RUNWAY_CHANGE_TAILWIND_KTS &&
        primaryHeadwind(better) > primaryHeadwind(config) + RUNWAY_CHANGE_GAIN_KTS;
      if (!overLimit && !windFavorsOthers) continue;
      const change = {
        configId: better.id,
        arrivals: [...better.arrivals],
        departures: [...better.departures],
        atTick:
          this.state.tick +
          Math.round((settings['weather.runwayChangeNoticeMin'] * 60) / tickSeconds),
      };
      operations.pendingRunwayChanges[airport] = change;
      const { atTick, ...runways } = cloneJson(change);
      this.emit({ type: 'runwayChangePlanned', airport, runways, atTick });
    }
  }

  /** Makes announced runway changes that are due. */
  private applyDueRunwayChanges(): void {
    const operations = this.state.operations;
    if (!operations) return;
    let changed = false;
    for (const [airport, change] of Object.entries(operations.pendingRunwayChanges)) {
      if (this.state.tick < change.atTick) continue;
      const runways: ActiveRunways = {
        configId: change.configId,
        arrivals: change.arrivals,
        departures: change.departures,
      };
      operations.runways[airport] = runways;
      operations.lastRunwayChangeTick[airport] = this.state.tick;
      delete operations.pendingRunwayChanges[airport];
      this.emit({ type: 'runwayChanged', airport, runways: cloneJson(runways) });
      changed = true;
    }
    if (changed) this.updateAtis();
  }

  /** One wind for the whole region (the average of the airports'), if there is an airspace. */
  get regionalWind(): Wind | undefined {
    return regionalWind(this.winds);
  }

  /** Latest live weather report per airport (live wind mode), if any has arrived. */
  get liveWeather(): Readonly<Record<string, Readonly<LiveWeatherReport>>> {
    return this.state.operations?.liveWeather ?? {};
  }

  /**
   * Applies new live weather reports (live wind mode): airports with a report
   * take its wind, and runways are reviewed at once. Reports are external
   * input, saved with the session like the rest of its state.
   */
  applyLiveWeather(reports: readonly LiveWeatherReport[]): ValidationResult {
    const operations = this.state.operations;
    const pack = this.airspace;
    if (!operations || !pack) return { ok: false, reason: 'No airspace' };
    if (this.state.settings['weather.windMode'] !== 'live')
      return { ok: false, reason: 'This session does not use live weather' };
    const parsed = reports.map((report) => liveWeatherReportSchema.parse(report));
    // The session's first reports (it started on a fallback wind): runways follow at once.
    const first = Object.keys(operations.liveWeather ?? {}).length === 0;
    const winds = liveWinds(parsed, pack.airspace.airports, this.state.world.magneticVariationDeg);
    operations.liveWeather = {
      ...operations.liveWeather,
      ...Object.fromEntries(
        parsed.filter((r) => pack.airspace.airports.includes(r.icao)).map((r) => [r.icao, r]),
      ),
    };
    const changed = Object.entries(winds).some(
      ([icao, wind]) => JSON.stringify(operations.winds[icao]) !== JSON.stringify(wind),
    );
    operations.winds = { ...operations.winds, ...winds };
    operations.baseWinds = cloneJson(operations.winds);
    if (changed) this.emit({ type: 'windChanged' });
    if (first) this.selectRunwaysForWind();
    this.reviewRunways();
    this.updateAtis();
    return { ok: true };
  }

  // ---- ATIS ---------------------------------------------------------------------

  /** Each airport's current ATIS broadcast. */
  get atis(): Readonly<Record<string, Readonly<Atis>>> {
    return this.state.operations?.atis ?? {};
  }

  /**
   * Issues a new ATIS (the next letter) at airports whose broadcast no longer
   * matches: a new weather report, new runways, a large wind change, or an
   * hour since the last one.
   */
  private updateAtis(): void {
    const operations = this.state.operations;
    const pack = this.airspace;
    if (!operations || !pack) return;
    const { tickSeconds } = this.state.config;
    const atis = (operations.atis ??= {});
    pack.airspace.airports.forEach((icao, index) => {
      const wind = operations.winds[icao];
      const runways = operations.runways[icao];
      if (!wind || !runways) return;
      const report = operations.liveWeather?.[icao];
      const current = atis[icao];
      if (
        !atisOutdated(
          current,
          { wind, configId: runways.configId, report },
          this.state.tick,
          tickSeconds,
        )
      )
        return;
      // The first letter of the session comes from its seed, so airports don't all start at Alfa.
      const letter = current
        ? nextAtisLetter(current.letter)
        : String.fromCharCode(65 + (((operations.windSeed ?? 0) >>> (index * 5)) % 26));
      const issuedAt = report ? new Date(report.observedAt) : this.utcTime;
      const field = pack.airport(icao);
      atis[icao] = {
        letter,
        issuedTick: this.state.tick,
        wind: { ...wind },
        configId: runways.configId,
        ...(report ? { reportObservedAt: report.observedAt } : {}),
        text: atisText({
          airport: shortIcao(icao),
          letter,
          timeZ: issuedAt.toISOString().slice(11, 16).replace(':', ''),
          wind,
          report,
          arrivals: runways.arrivals,
          departures: runways.departures,
          ilsRunways: runways.arrivals.filter(
            (id) => field.runways.find((r) => r.id === id)?.ils !== undefined,
          ),
        }),
      };
      if (current) this.emit({ type: 'atisChanged', airport: icao, letter });
    });
  }

  /** Puts airports whose runways follow the wind on the configuration it favors, without notice. */
  private selectRunwaysForWind(): void {
    const operations = this.state.operations;
    const pack = this.airspace;
    if (!operations || !pack) return;
    const settings = this.state.settings;
    const limits = {
      maxTailwindKts: settings['weather.maxTailwindKts'],
      maxCrosswindKts: settings['weather.maxCrosswindKts'],
    };
    for (const [airport, current] of Object.entries(operations.runways)) {
      const wind = operations.winds[airport];
      const configs = pack.traffic.airports[airport]?.runwayConfigs ?? [];
      if (current.chosenByPlayer || !wind || configs.length === 0) continue;
      const heading = (runway: string) => pack.runway(airport, runway).magneticHeadingDeg;
      const best = selectRunwayConfig(configs, heading, wind, limits);
      if (best.id === current.configId) continue;
      const runways = {
        configId: best.id,
        arrivals: [...best.arrivals],
        departures: [...best.departures],
      };
      operations.runways[airport] = runways;
      delete operations.pendingRunwayChanges[airport];
      this.emit({ type: 'runwayChanged', airport, runways: cloneJson(runways) });
    }
  }

  /** Lets the wind drift around its starting value, as set by the wind variation settings. */
  private updateWinds(): void {
    const operations = this.state.operations;
    // Live weather comes from the reports, not the variation model.
    if (this.state.settings['weather.windMode'] === 'live') return;
    if (!operations?.baseWinds || operations.windSeed === undefined) return;
    const settings = this.state.settings;
    const amount = WIND_VARIATIONS[settings['weather.windVariation']];
    const variation = {
      ...amount,
      periodSec: settings['weather.windVariationPeriodMin'] * 60,
    };
    const timeSec = this.state.tick * this.state.config.tickSeconds;
    const winds: Record<string, Wind> = {};
    let changed = false;
    for (const [airport, base] of Object.entries(operations.baseWinds)) {
      const wind = variedWind(base, airport, operations.windSeed, timeSec, variation);
      const before = operations.winds[airport];
      if (before?.directionDeg !== wind.directionDeg || before.speedKts !== wind.speedKts)
        changed = true;
      winds[airport] = wind;
    }
    if (!changed) return;
    operations.winds = winds;
    this.emit({ type: 'windChanged' });
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

  private startOperations(
    runwayConfigs?: Readonly<Record<string, string>>,
    liveWeather?: readonly LiveWeatherReport[],
  ): void {
    if (!this.airspace) return;
    const settings = this.state.settings;
    const operations = initialOperations(
      this.airspace,
      this.rng,
      {
        windMode: settings['weather.windMode'],
        manualWind: withGust(
          {
            directionDeg: settings['weather.manualWindDirectionDeg'],
            speedKts: settings['weather.manualWindSpeedKts'],
          },
          settings['weather.manualWindGustKts'] || undefined,
        ),
        maxTailwindKts: settings['weather.maxTailwindKts'],
        maxCrosswindKts: settings['weather.maxCrosswindKts'],
        departureRatePerHour: settings['traffic.departureRatePerHour'],
        maxDepartureQueue: settings['traffic.maxDepartureQueue'],
        ...(runwayConfigs ? { runwayConfigs } : {}),
        ...(liveWeather ? { liveWeather } : {}),
        magneticVariationDeg: this.state.world.magneticVariationDeg,
      },
      this.state.tick,
    );
    this.state.operations = operations;
    this.updateAtis();

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
        ceilingFt: (type) => this.performance.get(type).ceilingFt,
        rangeNm: (type) => this.performance.get(type).rangeNm,
        fleetMix: this.state.settings['traffic.fleetMix'],
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
        ...(entry.requestedAltitudeFt ? { requestedAltitudeFt: entry.requestedAltitudeFt } : {}),
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
      // Departures on a SID are cleared to climb via it, to the airport's initial altitude.
      ...(procedure.sid ? { climbVia: true } : {}),
    };
    this.emit({
      type: 'tookOff',
      aircraftId: aircraft.id,
      airport: entry.airport,
      runway: runway.id,
      procedure: procedure.name,
    });
  }

  /** A holding pilot asks for further clearance once the expected time comes. */
  private checkHoldClearance(aircraft: AircraftState): void {
    const hold = aircraft.navigation;
    if (hold.mode !== 'hold' || hold.efcCalled || hold.efcTick === undefined) return;
    if (this.state.tick < hold.efcTick || aircraft.owner !== this.state.playerId) return;
    hold.efcCalled = true;
    const callsign = spokenCallsign(aircraft.callsign, aircraft.telephony);
    this.transmit(
      'pilot',
      aircraft.id,
      `${capitalize(callsign)}, holding at ${hold.fix}, we're at our expect further clearance time, request further clearance.`,
    );
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
    const climbingVia = navigation.mode === 'procedure' && navigation.climbVia && isOnSid(aircraft);
    this.transmit(
      'pilot',
      aircraft.id,
      climbingVia
        ? `${facility}, ${callsign}, ${altitude}, climbing via the ${procedureWords(navigation.name)} departure.`
        : `${facility}, ${callsign}, ${altitude} climbing ${climbing}${procedure}.`,
    );
  }

  private removeExitedAircraft(): void {
    if (!this.airspace) return;
    const { center } = this.airspace.airspace;
    const radius = this.airspace.boundaryRadiusNm;
    for (const aircraft of [...this.state.aircraft]) {
      const handedOff = this.airspace.isCenter(aircraft.owner);
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
    delete this.state.tracks[id];
    delete this.state.centerResolutions[id];
    delete this.state.routeFixPassed[id];
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
    if (event.type !== 'scored') this.scoreFor(event);
  }

  // ---- Scoring (RP) -----------------------------------------------------------------

  /** RP earned and lost so far this session. */
  get score(): Readonly<ScoreState> {
    return this.state.score;
  }

  private award(kind: ScoreKind, rp: number, callsigns: string[], detail: string): void {
    if (rp === 0) return;
    const event = recordScore(
      this.state.score,
      { tick: this.state.tick, kind, rp: Math.round(rp), callsigns, detail },
      (callsign) => this.flightKindOf(callsign),
    );
    this.emit({ type: 'scored', event });
  }

  // ---- Target times ---------------------------------------------------------------

  /** The target time of a flight the player is working, if it has one. */
  flightTimer(aircraftId: string): Readonly<FlightTimer> | undefined {
    return this.state.score.timers[aircraftId];
  }

  /** Handling times of finished flights, by kind. */
  get timingStats(): Readonly<Partial<Record<FlightKind, Readonly<TimingStats>>>> {
    return this.state.score.timing;
  }

  /** Gives a flight the player now works its target time. */
  private startTimer(aircraft: Readonly<AircraftState>, kind: FlightKind): void {
    const settings = this.state.settings;
    if (!settings['scoring.timing'] || !this.airspace) return;
    const estimateSec = this.unimpededTimeSec(aircraft, kind);
    if (estimateSec === undefined) return;
    const allowanceMin =
      kind === 'arrival'
        ? settings['scoring.arrivalAllowanceMin']
        : kind === 'departure'
          ? settings['scoring.departureAllowanceMin']
          : settings['scoring.transitAllowanceMin'];
    const targetSec =
      estimateSec * (1 + settings['scoring.timingAllowancePct'] / 100) + allowanceMin * 60;
    const { tickSeconds } = this.state.config;
    this.state.score.timers[aircraft.id] = {
      kind,
      startTick: this.state.tick,
      targetTick: this.state.tick + Math.round(targetSec / tickSeconds),
    };
  }

  /**
   * How long a flight would take, unimpeded, from now to landing (arrivals)
   * or to the handoff (departures, overflights), along its route.
   */
  private unimpededTimeSec(
    aircraft: Readonly<AircraftState>,
    kind: FlightKind,
  ): number | undefined {
    const pack = this.airspace!;
    const performance = this.performance.get(aircraft.aircraftType);
    const route = routeAhead(aircraft);
    if (kind === 'arrival') {
      // Along the STAR, then to join the final of a runway in use (the nearest join point), then down the final.
      const field = pack.airport(aircraft.flightPlan.destination);
      const variation = this.state.world.magneticVariationDeg;
      const runways = this.activeRunways[field.icao]?.arrivals ?? [];
      const joins = runways
        .map((id) => field.runways.find((r) => r.id === id))
        .filter((runway) => runway?.ils)
        .map((runway) =>
          destinationPoint(
            runway!.threshold,
            magneticToTrue(runway!.ils!.courseDeg, variation) + 180,
            ARRIVAL_FINAL_JOIN_NM,
          ),
        );
      const toFinal =
        joins.length > 0
          ? Math.min(...joins.map((join) => distanceNm(route.end, join))) + ARRIVAL_FINAL_JOIN_NM
          : distanceNm(route.end, field.position);
      return arrivalFlightTimeSec(
        route.distanceNm + toFinal,
        aircraft.altitudeFt,
        field.elevationFt,
        performance,
      );
    }
    const window = this.state.settings['center.handoffWindowNm'];
    if (kind === 'transit') {
      const toBoundary = boundaryCrossing(pack, aircraft)?.distanceNm ?? 0;
      return levelFlightTimeSec(
        Math.max(0, toBoundary - window),
        aircraft.altitudeFt,
        aircraft.iasKts,
      );
    }
    // Departures: along the SID to the gate fix, then on toward the destination to the handoff.
    const gate = [...aircraft.flightPlan.route]
      .reverse()
      .map((id) => pack.fix(id))
      .find(Boolean);
    const city = pack.traffic.cityPositions[aircraft.flightPlan.destination];
    const toGate = route.distanceNm + (gate ? distanceNm(route.end, gate.position) : 0);
    const cruiseFt = aircraft.flightPlan.requestedAltitudeFt ?? aircraft.targets.altitudeFt;
    let beyondGate = 0;
    let mustReachFt = 0;
    if (gate && city) {
      const onward = {
        ...aircraft,
        position: gate.position,
        altitudeFt: cruiseFt,
        headingDeg: trueToMagnetic(
          bearingTrue(gate.position, city),
          this.state.world.magneticVariationDeg,
        ),
      };
      beyondGate = Math.max(0, (boundaryCrossing(pack, onward)?.distanceNm ?? 0) - window);
      mustReachFt = Math.min(
        cruiseFt,
        assessHandoff(pack, onward, this.state.settings).minimumAltitudeFt,
      );
    }
    return climbingFlightTimeSec(
      toGate + beyondGate,
      aircraft.altitudeFt,
      cruiseFt,
      mustReachFt,
      performance,
    );
  }

  /** Scores a flight's time when it lands or is handed off. */
  private finishTimer(aircraft: Readonly<AircraftState>, finished: string): void {
    const timer = this.state.score.timers[aircraft.id];
    if (!timer) return;
    delete this.state.score.timers[aircraft.id];
    const settings = this.state.settings;
    const { tickSeconds } = this.state.config;
    const elapsedSec = (this.state.tick - timer.startTick) * tickSeconds;
    const targetSec = (timer.targetTick - timer.startTick) * tickSeconds;
    const result = timingRp(elapsedSec, targetSec, {
      onTimeRp: settings['scoring.onTimeRp'],
      lateRpPerMin: settings['scoring.lateRpPerMin'],
      lateMaxRp: settings['scoring.lateMaxRp'],
    });
    const stats = (this.state.score.timing[timer.kind] ??= emptyTimingStats());
    stats.count++;
    if (result.onTime) stats.onTime++;
    stats.totalSec += elapsedSec;
    stats.totalTargetSec += targetSec;
    this.award(
      result.onTime ? 'onTime' : 'late',
      result.rp,
      [aircraft.callsign],
      result.onTime
        ? `${finished} in ${formatDuration(elapsedSec)}, ${formatDuration(targetSec - elapsedSec)} ahead of target`
        : `${finished} ${formatDuration(result.lateSec)} late (${formatDuration(elapsedSec)}, target ${formatDuration(targetSec)})`,
    );
  }

  /** Whether a flight on the scope is an arrival, a departure or an overflight. */
  private flightKindOf(callsign: string): FlightKind | undefined {
    const aircraft = this.state.aircraft.find((a) => a.callsign === callsign);
    const airports = this.airspace?.airspace.airports;
    if (!aircraft || !airports) return undefined;
    if (airports.includes(aircraft.flightPlan.destination)) return 'arrival';
    return airports.includes(aircraft.flightPlan.origin) ? 'departure' : 'transit';
  }

  /** Scores the events that earn or cost RP. */
  private scoreFor(event: SimEvent): void {
    const pack = this.airspace;
    if (!pack) return;
    const settings = this.state.settings;
    const aircraftOf = (id: string) => this.getAircraft(id);
    switch (event.type) {
      case 'arrivalEntered':
      case 'transitEntered': {
        const aircraft = aircraftOf(event.aircraftId);
        if (aircraft)
          this.startTimer(aircraft, event.type === 'arrivalEntered' ? 'arrival' : 'transit');
        return;
      }
      case 'aircraftRemoved':
        delete this.state.score.timers[event.aircraftId];
        return;
      case 'landed': {
        const aircraft = aircraftOf(event.aircraftId);
        if (!aircraft) return;
        this.award(
          'landing',
          settings['scoring.landingRp'],
          [aircraft.callsign],
          `landed ${shortIcao(event.airport)} ${event.runway}`,
        );
        this.finishTimer(aircraft, `landed ${shortIcao(event.airport)}`);
        return;
      }
      case 'ownerChanged': {
        const aircraft = aircraftOf(event.aircraftId);
        // Radar contact: the departure is the player's from here to the handoff.
        if (
          aircraft &&
          event.to === this.state.playerId &&
          event.from === towerId(aircraft.flightPlan.origin)
        ) {
          this.startTimer(aircraft, 'departure');
          return;
        }
        if (!aircraft || event.from !== this.state.playerId || !pack.isCenter(event.to)) return;
        const airports = pack.airspace.airports;
        if (airports.includes(aircraft.flightPlan.destination)) return; // arrivals aren't handed to Center
        const departure = airports.includes(aircraft.flightPlan.origin);
        const requested = aircraft.flightPlan.requestedAltitudeFt;
        const atRequested =
          requested !== undefined &&
          (aircraft.targets.altitudeFt === requested ||
            Math.abs(aircraft.altitudeFt - requested) < REQUESTED_LEVEL_TOLERANCE_FT);
        const center = pack.centers.find((c) => c.id === event.to)!;
        const routeFlown = this.routeFlown(aircraft.id);
        const rp =
          (departure
            ? settings['scoring.departureHandoffRp']
            : settings['scoring.transitHandoffRp']) +
          (routeFlown ? settings['scoring.routeFlownBonusRp'] : 0) +
          (atRequested ? settings['scoring.requestedLevelBonusRp'] : 0);
        const fix = routeExitFix(pack, aircraft)?.ident;
        const notes = [
          routeFlown && fix ? `via ${fix}` : undefined,
          atRequested
            ? `cleared to requested ${flightLevelLabel(requested!, pack.airspace.transitionAltitudeFt)}`
            : undefined,
        ].filter(Boolean);
        this.award(
          departure ? 'departureHandoff' : 'transitHandoff',
          rp,
          [aircraft.callsign],
          `handed to ${center.callsign}${notes.length ? `, ${notes.join(', ')}` : ''}`,
        );
        this.finishTimer(aircraft, 'handed off');
        return;
      }
      case 'goAround': {
        const aircraft = aircraftOf(event.aircraftId);
        if (!aircraft) return;
        this.award(
          'goAround',
          -settings['scoring.goAroundRp'],
          [aircraft.callsign],
          `went around, ${shortIcao(event.airport)} ${event.runway}`,
        );
        return;
      }
      case 'leftAirspace': {
        const aircraft = aircraftOf(event.aircraftId);
        if (event.handedOff || aircraft?.owner !== this.state.playerId) return;
        this.award(
          'leftWithoutHandoff',
          -settings['scoring.leftWithoutHandoffRp'],
          [event.callsign],
          'left your airspace without a handoff',
        );
        return;
      }
      default:
        return;
    }
  }

  /**
   * Separation scoring, after each separation update: a near midair collision
   * as soon as it happens; any other loss of separation when it ends, by how
   * close the aircraft came (nothing at or beyond the penalty distance).
   */
  private scoreSeparation(): void {
    const settings = this.state.settings;
    const score = this.state.score;
    const openViolation = (ids: readonly [string, string]) =>
      this.state.separation.violations.find(
        (v) =>
          v.endTick === undefined && v.aircraftIds[0] === ids[0] && v.aircraftIds[1] === ids[1],
      );
    for (const conflict of this.state.separation.conflicts) {
      if (
        conflict.kind !== 'loss' ||
        conflict.lateralNm >= settings['scoring.nearMidAirNm'] ||
        conflict.verticalFt >= NEAR_MID_AIR_VERTICAL_FT
      )
        continue;
      const violation = openViolation(conflict.aircraftIds);
      if (!violation || score.nearMidAirViolations.includes(violation.id)) continue;
      score.nearMidAirViolations.push(violation.id);
      this.award(
        'nearMidAir',
        -settings['scoring.nearMidAirRp'],
        [...violation.callsigns],
        `near midair collision, ${conflict.lateralNm.toFixed(1)} NM, ${Math.round(conflict.verticalFt / 100) * 100} ft`,
      );
    }
    for (const violation of this.state.separation.violations) {
      if (violation.endTick !== this.state.tick) continue;
      const nearMidAir = score.nearMidAirViolations.indexOf(violation.id);
      if (nearMidAir !== -1) {
        score.nearMidAirViolations.splice(nearMidAir, 1);
        continue;
      }
      if (violation.wake) {
        const [leader] = violation.wakeCategories ?? ['heavier'];
        const shortfall = 1 - violation.closestLateralNm / violation.requiredLateralNm;
        this.award(
          'wakeLoss',
          -Math.round(settings['scoring.wakeLossRp'] * (1 + Math.max(0, shortfall))),
          [...violation.callsigns],
          `wake spacing behind a ${WAKE_CATEGORY_LABELS[leader as WakeCategory] ?? leader}, ${violation.closestLateralNm.toFixed(1)} of ${violation.requiredLateralNm} NM`,
        );
        continue;
      }
      const penalty = separationPenalty(
        violation.closestLateralNm,
        settings['scoring.separationLossRp'],
        settings['scoring.penaltyMaxLateralNm'],
      );
      this.award(
        'separationLoss',
        -penalty,
        [...violation.callsigns],
        `loss of separation, ${violation.closestLateralNm.toFixed(1)} NM, ${Math.round(violation.closestVerticalFt / 100) * 100} ft`,
      );
    }
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

type InSessionTrafficKey = (typeof IN_SESSION_TRAFFIC_KEYS)[number];
