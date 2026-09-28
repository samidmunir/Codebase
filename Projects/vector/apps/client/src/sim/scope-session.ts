import {
  defaultSettings,
  detectDifficulty,
  IN_SESSION_TRAFFIC_KEYS,
  type MetarObservation,
  type SessionDifficulty,
  type SessionSettings,
} from '@vector/shared';
import {
  SimEngine,
  type AirspacePack,
  type AtcCommand,
  type LiveWeatherReport,
  type SimSnapshot,
  type ValidationResult,
  type Wind,
} from '@vector/sim-core';
import { airlines, performanceCatalog } from '../airspaces/registry';
import { radarSensors } from '../scope/radar-coverage';
import { RadarTracker } from '../scope/radar-tracker';

/** Sim time run before the session starts, so traffic is already spread out. */
const WARM_UP_SEC = 300;

export interface SessionStatus {
  utcTime: Date;
  paused: boolean;
  speed: number;
  availableSpeeds: number[];
  aircraftCount: number;
  /** Changes whenever a radio transmission is added. */
  lastMessageId: string | undefined;
  /** Changes whenever an instruction is issued or acted on. */
  pendingCount: number;
  /** Changes whenever the departure queue changes. */
  queueVersion: number;
  /** Changes whenever conflict alerts change. */
  conflictsKey: string;
  violationCount: number;
  /** Changes whenever the in-session traffic settings change. */
  trafficKey: string;
  /** RP earned so far this session. */
  rp: number;
  /** Changes whenever RP is earned or lost. */
  scoreEventCount: number;
  /** One wind for the region, and each airport's. */
  regionalWind: Wind | undefined;
  winds: Readonly<Record<string, Wind>>;
  /** Changes whenever a reported wind changes. */
  windKey: string;
  /** Live wind mode: whether the latest weather check worked, and when reports last arrived. */
  liveWeather: LiveWeatherStatus;
  /** The latest live weather report per airport. */
  liveReports: Readonly<Record<string, Readonly<LiveWeatherReport>>>;
}

export type LiveWeatherStatus =
  | { state: 'off' }
  | { state: 'waiting' }
  | { state: 'ok'; updatedAt: Date }
  | { state: 'failed'; updatedAt: Date | undefined; message: string };

export type TrafficSettings = Pick<SessionSettings, (typeof IN_SESSION_TRAFFIC_KEYS)[number]>;

/** Where a session came from: a new one, or a saved one being resumed. */
export type SessionOrigin =
  | {
      kind: 'new';
      settings: SessionSettings;
      /** Random seed; the setup screen passes the one it previewed. */
      seed?: number;
      runwayConfigs?: Record<string, string>;
      liveWeather?: MetarObservation[];
    }
  | { kind: 'saved'; snapshot: unknown; savedId: string; name: string };

/**
 * A running simulation for the scope: the engine, traffic and the radar that
 * samples it. Lives outside React; the scope renders from it every frame.
 */
export class ScopeSession {
  readonly engine: SimEngine;
  readonly radar: RadarTracker;
  private readonly listeners = new Set<() => void>();
  private status: SessionStatus;
  /** Bumped when the departure queue changes. */
  private queueVersion = 0;

  /** The saved session this one was loaded from or last saved to, if any. */
  saved: Readonly<{ id: string; name: string }> | undefined;

  constructor(
    readonly pack: AirspacePack,
    origin: SessionOrigin = { kind: 'new', settings: defaultSettings('session') },
  ) {
    if (origin.kind === 'saved') {
      // Resume exactly where it was saved, paused so the player can get their bearings.
      this.engine = SimEngine.fromSnapshot(origin.snapshot, performanceCatalog, {
        airspace: pack,
        airlines,
      });
      this.engine.pause();
      this.saved = { id: origin.savedId, name: origin.name };
    } else {
      this.engine = SimEngine.create({
        performance: performanceCatalog,
        world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
        seed: origin.seed ?? Date.now() >>> 0,
        startTimeUtc: new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString(),
        settings: origin.settings,
        airspace: pack,
        airlines,
        ...(origin.runwayConfigs ? { runwayConfigs: origin.runwayConfigs } : {}),
        ...(origin.liveWeather ? { liveWeather: origin.liveWeather } : {}),
      });
      // Start with traffic already under way: arrivals spread along their routes.
      for (let i = 0; i < WARM_UP_SEC / this.engine.config.tickSeconds; i++) this.engine.step();
    }
    this.engine.subscribe((event) => {
      if (event.type.startsWith('departure') || event.type === 'tookOff') this.queueVersion++;
    });
    const { sensors, primary } = radarSensors(pack, this.engine.settings);
    this.radar = new RadarTracker(sensors, primary);
    this.radar.update(this.engine.displayTimeSec, this.engine.listAircraft());
    if (this.usesLiveWeather) {
      // Reports from the setup screen (or a saved session's) count until the first check here.
      const fresh = origin.kind === 'new' && (origin.liveWeather?.length ?? 0) > 0;
      this.liveWeatherStatus = fresh
        ? { state: 'ok', updatedAt: new Date() }
        : { state: 'waiting' };
    }
    this.status = this.readStatus();
  }

  /** Changes arrival, departure and transit rates or the queue cap while the session runs. */
  updateTraffic(patch: Partial<TrafficSettings>): ValidationResult {
    const result = this.engine.updateTrafficSettings(patch);
    this.refreshStatus(true);
    return result;
  }

  get trafficSettings(): TrafficSettings {
    const settings = this.engine.settings;
    return Object.fromEntries(
      IN_SESSION_TRAFFIC_KEYS.map((key) => [key, settings[key]]),
    ) as TrafficSettings;
  }

  /** The preset the traffic settings match, or 'custom'. */
  get difficulty(): SessionDifficulty {
    return detectDifficulty(this.engine.settings);
  }

  /** The full simulation state, for saving. */
  toSnapshot(): SimSnapshot {
    return this.engine.toSnapshot();
  }

  /** Records the saved session this one now belongs to (later saves can overwrite it). */
  markSaved(id: string, name: string): void {
    this.saved = { id, name };
    this.refreshStatus(true);
  }

  pause(): void {
    if (!this.engine.paused) this.togglePause();
  }

  /** Advances by real elapsed time. Returns true if any radar target changed. */
  frame(realElapsedMs: number): boolean {
    this.engine.advance(realElapsedMs);
    const swept = this.radar.update(this.engine.displayTimeSec, this.engine.listAircraft());
    this.refreshStatus();
    return swept;
  }

  togglePause(): void {
    if (this.engine.paused) this.engine.resume();
    else this.engine.pause();
    this.refreshStatus(true);
  }

  /** Steps to the next faster (+1) or slower (-1) available speed. */
  changeSpeed(direction: 1 | -1): void {
    const speeds = [...this.engine.settings['sim.availableSpeeds']].sort((a, b) => a - b);
    const index = speeds.indexOf(this.engine.speed as (typeof speeds)[number]);
    const next =
      speeds[Math.min(speeds.length - 1, Math.max(0, (index === -1 ? 0 : index) + direction))];
    if (next !== undefined) this.setSpeed(next);
  }

  setSpeed(speed: number): void {
    this.engine.setSpeed(speed);
    this.refreshStatus(true);
  }

  /** Validates an instruction without transmitting it. */
  checkInstruction(aircraftId: string, commands: readonly AtcCommand[]): ValidationResult {
    return this.engine.checkInstruction(aircraftId, commands);
  }

  /** Transmits an instruction to an aircraft. */
  issueInstruction(aircraftId: string, commands: readonly AtcCommand[]): ValidationResult {
    const result = this.engine.issueInstruction(aircraftId, commands);
    this.refreshStatus(true);
    return result;
  }

  checkRelease(entryId: string, runway: string): ValidationResult {
    return this.engine.checkRelease(entryId, runway);
  }

  /** Clears a waiting departure for takeoff on a runway. */
  releaseDeparture(entryId: string, runway: string): ValidationResult {
    const result = this.engine.releaseDeparture(entryId, runway);
    this.refreshStatus(true);
    return result;
  }

  /** UTC time of a sim tick (e.g. for timestamps in the radio log). */
  utcAtTick(tick: number): Date {
    return new Date(
      this.engine.utcTime.getTime() -
        (this.engine.tick - tick) * this.engine.config.tickSeconds * 1000,
    );
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private readStatus(): SessionStatus {
    return {
      utcTime: this.engine.utcTime,
      paused: this.engine.paused,
      speed: this.engine.speed,
      availableSpeeds: [...this.engine.settings['sim.availableSpeeds']].sort((a, b) => a - b),
      aircraftCount: this.engine.listAircraft().length,
      lastMessageId: this.engine.comms.at(-1)?.id,
      pendingCount: this.engine
        .listAircraft()
        .reduce((n, a) => n + this.engine.pendingInstructions(a.id).length, 0),
      queueVersion: this.queueVersion,
      conflictsKey: this.engine.conflicts.map((c) => `${c.id}:${c.kind}`).join(','),
      violationCount: this.engine.violations.length,
      trafficKey: IN_SESSION_TRAFFIC_KEYS.map((key) => this.engine.settings[key]).join(','),
      rp: this.engine.score.total,
      scoreEventCount: this.engine.score.nextEventNumber,
      regionalWind: this.engine.regionalWind,
      winds: this.engine.winds,
      windKey: Object.entries(this.engine.winds)
        .map(([icao, w]) => `${icao}:${w.directionDeg}/${w.speedKts}/${w.gustKts ?? ''}`)
        .join(','),
      liveWeather: this.liveWeatherStatus,
      liveReports: this.engine.liveWeather,
    };
  }

  private liveWeatherStatus: LiveWeatherStatus = { state: 'off' };

  /** Whether this session takes its wind from live weather reports. */
  get usesLiveWeather(): boolean {
    return this.engine.settings['weather.windMode'] === 'live';
  }

  /**
   * Checks for new live weather and applies it. Failures keep the last
   * reports (or the fallback wind) and are shown in the top bar.
   */
  async refreshLiveWeather(
    fetchReports: (stations: readonly string[]) => Promise<{ observations: MetarObservation[] }>,
  ): Promise<void> {
    if (!this.usesLiveWeather) return;
    const last =
      this.liveWeatherStatus.state === 'ok' ? this.liveWeatherStatus.updatedAt : undefined;
    try {
      const { observations } = await fetchReports(this.pack.airspace.airports);
      if (observations.length === 0) throw new Error('No reports for these airports right now');
      this.engine.applyLiveWeather(observations);
      this.liveWeatherStatus = { state: 'ok', updatedAt: new Date() };
    } catch (error) {
      this.liveWeatherStatus = {
        state: 'failed',
        updatedAt: last,
        message: error instanceof Error ? error.message : String(error),
      };
    }
    this.refreshStatus(true);
  }

  /** Publishes status when something visible changed (the clock at whole seconds). */
  private refreshStatus(force = false): void {
    const next = this.readStatus();
    const changed =
      force ||
      Math.floor(next.utcTime.getTime() / 1000) !==
        Math.floor(this.status.utcTime.getTime() / 1000) ||
      next.paused !== this.status.paused ||
      next.speed !== this.status.speed ||
      next.aircraftCount !== this.status.aircraftCount ||
      next.lastMessageId !== this.status.lastMessageId ||
      next.pendingCount !== this.status.pendingCount ||
      next.queueVersion !== this.status.queueVersion ||
      next.conflictsKey !== this.status.conflictsKey ||
      next.violationCount !== this.status.violationCount ||
      next.trafficKey !== this.status.trafficKey ||
      next.scoreEventCount !== this.status.scoreEventCount ||
      next.windKey !== this.status.windKey ||
      next.liveWeather !== this.status.liveWeather;
    if (!changed) return;
    this.status = next;
    for (const listener of this.listeners) listener();
  }
}
