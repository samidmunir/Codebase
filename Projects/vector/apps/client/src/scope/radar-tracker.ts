import { groundSpeedKts, type AircraftState, type LatLon } from '@vector/sim-core';

/** What the radar last saw of an aircraft. Updated once per sweep, like a real radar. */
export interface RadarTarget {
  id: string;
  callsign: string;
  aircraftType: string;
  destination: string;
  owner: string;
  position: LatLon;
  altitudeFt: number;
  groundSpeedKts: number;
  verticalSpeedFpm: number;
  headingDeg: number;
  /** Previous returns, newest first. */
  history: LatLon[];
}

/** Returns kept per target; trails show as many of these as the display setting allows. */
const MAX_HISTORY = 10;

export class RadarTracker {
  private readonly targets = new Map<string, RadarTarget>();
  private lastSweepSimTime = -Infinity;

  constructor(private intervalSec: number) {}

  setInterval(intervalSec: number): void {
    this.intervalSec = intervalSec;
  }

  /** Sim seconds since the last sweep, as a fraction of the interval (for sweep animation). */
  sweepProgress(simTimeSec: number): number {
    if (!Number.isFinite(this.lastSweepSimTime)) return 0;
    return Math.min(1, (simTimeSec - this.lastSweepSimTime) / this.intervalSec);
  }

  /** Sweeps if one is due. Returns true when the targets changed. */
  update(simTimeSec: number, aircraft: readonly Readonly<AircraftState>[]): boolean {
    if (simTimeSec - this.lastSweepSimTime < this.intervalSec) return false;
    this.lastSweepSimTime = simTimeSec;

    const seen = new Set<string>();
    for (const plane of aircraft) {
      seen.add(plane.id);
      const previous = this.targets.get(plane.id);
      this.targets.set(plane.id, {
        id: plane.id,
        callsign: plane.callsign,
        aircraftType: plane.aircraftType,
        destination: plane.flightPlan.destination,
        owner: plane.owner,
        position: { ...plane.position },
        altitudeFt: plane.altitudeFt,
        groundSpeedKts: groundSpeedKts(plane),
        verticalSpeedFpm: plane.verticalSpeedFpm,
        headingDeg: plane.headingDeg,
        history: previous ? [previous.position, ...previous.history].slice(0, MAX_HISTORY) : [],
      });
    }
    for (const id of this.targets.keys()) if (!seen.has(id)) this.targets.delete(id);
    return true;
  }

  list(): RadarTarget[] {
    return [...this.targets.values()];
  }

  get(id: string): RadarTarget | undefined {
    return this.targets.get(id);
  }

  /** Forces the next update() to sweep (e.g. after loading a session). */
  reset(): void {
    this.lastSweepSimTime = -Infinity;
    this.targets.clear();
  }
}
