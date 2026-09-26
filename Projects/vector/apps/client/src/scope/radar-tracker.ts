import { bearingTrue, groundSpeedKts, type AircraftState, type LatLon } from '@vector/sim-core';

/** What the radar last saw of an aircraft. */
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

interface TrackedTarget extends RadarTarget {
  /** Rotation in which this target was last scanned. */
  scan: number;
}

/** Returns kept per target; trails show as many of these as the display setting allows. */
const MAX_HISTORY = 10;

/**
 * A rotating radar. The beam turns once per interval, clockwise from north,
 * around the antenna. Each aircraft is updated when the beam passes its
 * bearing from the antenna, so targets refresh one by one as the beam sweeps
 * over them, each exactly once per rotation.
 */
export class RadarTracker {
  private readonly targets = new Map<string, TrackedTarget>();
  /** Aircraft not yet painted, with the rotation they were first seen in. */
  private readonly pending = new Map<string, number>();
  private started = false;

  constructor(
    private intervalSec: number,
    private readonly antenna: LatLon,
  ) {}

  setInterval(intervalSec: number): void {
    this.intervalSec = intervalSec;
  }

  /** Beam position as a fraction of a turn from north (0..1). */
  sweepProgress(timeSec: number): number {
    const turns = timeSec / this.intervalSec;
    return turns - Math.floor(turns);
  }

  /** The rotation the beam is on at a position: it increments as the beam passes that bearing. */
  private scanAt(timeSec: number, position: LatLon): number {
    const azimuth = bearingTrue(this.antenna, position) / 360;
    return Math.floor(timeSec / this.intervalSec - azimuth);
  }

  /**
   * Updates targets the beam has passed since the last call. Pass a smooth time
   * (e.g. the engine's display time) so targets refresh right as the beam
   * crosses them. Returns true when anything changed.
   */
  update(timeSec: number, aircraft: readonly Readonly<AircraftState>[]): boolean {
    let changed = false;
    const seen = new Set<string>();

    for (const plane of aircraft) {
      seen.add(plane.id);
      const scan = this.scanAt(timeSec, plane.position);
      const existing = this.targets.get(plane.id);

      if (existing) {
        if (scan !== existing.scan) {
          this.paint(plane, scan, existing);
          changed = true;
        }
      } else if (!this.started) {
        // Paint everything on the first update so the scope doesn't start empty.
        this.paint(plane, scan, undefined);
        changed = true;
      } else {
        // New aircraft appear when the beam first passes them.
        const firstSeen = this.pending.get(plane.id);
        if (firstSeen === undefined) this.pending.set(plane.id, scan);
        else if (scan !== firstSeen) {
          this.pending.delete(plane.id);
          this.paint(plane, scan, undefined);
          changed = true;
        }
      }
    }

    // Aircraft that are gone disappear when the beam passes their last position.
    for (const [id, target] of this.targets) {
      if (!seen.has(id) && this.scanAt(timeSec, target.position) !== target.scan) {
        this.targets.delete(id);
        changed = true;
      }
    }
    for (const id of this.pending.keys()) if (!seen.has(id)) this.pending.delete(id);

    this.started = true;
    return changed;
  }

  private paint(
    plane: Readonly<AircraftState>,
    scan: number,
    previous: TrackedTarget | undefined,
  ): void {
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
      scan,
    });
  }

  list(): RadarTarget[] {
    return [...this.targets.values()];
  }

  get(id: string): RadarTarget | undefined {
    return this.targets.get(id);
  }

  /** Clears all targets; the next update paints everything again (e.g. after loading a session). */
  reset(): void {
    this.targets.clear();
    this.pending.clear();
    this.started = false;
  }
}
