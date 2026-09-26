import { defaultSettings, type SessionSettings } from '@vector/shared';
import { SimEngine, type AirspacePack } from '@vector/sim-core';
import { performanceCatalog } from '../airspaces/registry';
import { RadarTracker } from '../scope/radar-tracker';
import { DemoTraffic } from './demo-traffic';

export interface SessionStatus {
  utcTime: Date;
  paused: boolean;
  speed: number;
  availableSpeeds: number[];
  aircraftCount: number;
}

/**
 * A running simulation for the scope: the engine, traffic and the radar that
 * samples it. Lives outside React; the scope renders from it every frame.
 */
export class ScopeSession {
  readonly engine: SimEngine;
  readonly radar: RadarTracker;
  private readonly demo: DemoTraffic;
  private readonly listeners = new Set<() => void>();
  private status: SessionStatus;

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
    });
    this.radar = new RadarTracker(settings['radar.sweepIntervalSec'], pack.airspace.radar.position);
    this.demo = new DemoTraffic(this.engine, pack);
    this.demo.seed();
    this.radar.update(this.engine.displayTimeSec, this.engine.listAircraft());
    this.status = this.readStatus();
  }

  /** Advances by real elapsed time. Returns true if any radar target changed. */
  frame(realElapsedMs: number): boolean {
    if (this.engine.advance(realElapsedMs) > 0) this.demo.update();
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
      next.aircraftCount !== this.status.aircraftCount;
    if (!changed) return;
    this.status = next;
    for (const listener of this.listeners) listener();
  }
}
