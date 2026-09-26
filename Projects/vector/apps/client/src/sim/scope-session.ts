import { defaultSettings, type SessionSettings } from '@vector/shared';
import {
  SimEngine,
  type AirspacePack,
  type AtcCommand,
  type ValidationResult,
} from '@vector/sim-core';
import { airlines, performanceCatalog } from '../airspaces/registry';
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
}

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

  constructor(
    readonly pack: AirspacePack,
    settings: SessionSettings = defaultSettings('session'),
  ) {
    this.engine = SimEngine.create({
      performance: performanceCatalog,
      world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
      seed: Date.now() >>> 0,
      startTimeUtc: new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString(),
      settings,
      airspace: pack,
      airlines,
    });
    this.engine.subscribe((event) => {
      if (event.type.startsWith('departure') || event.type === 'tookOff') this.queueVersion++;
    });
    this.radar = new RadarTracker(settings['radar.sweepIntervalSec'], pack.airspace.radar.position);
    // Start with traffic already under way: arrivals spread along their routes.
    for (let i = 0; i < WARM_UP_SEC / this.engine.config.tickSeconds; i++) this.engine.step();
    this.radar.update(this.engine.displayTimeSec, this.engine.listAircraft());
    this.status = this.readStatus();
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
    };
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
      next.queueVersion !== this.status.queueVersion;
    if (!changed) return;
    this.status = next;
    for (const listener of this.listeners) listener();
  }
}
