import {
  bearingTrue,
  distanceNm,
  groundSpeedKts,
  type AircraftState,
  type LatLon,
} from '@vector/sim-core';

/** What the radar last saw of an aircraft. */
export interface RadarTarget {
  id: string;
  callsign: string;
  aircraftType: string;
  origin: string;
  destination: string;
  owner: string;
  position: LatLon;
  altitudeFt: number;
  groundSpeedKts: number;
  /** Indicated airspeed. */
  iasKts: number;
  verticalSpeedFpm: number;
  /** Altitude the aircraft is cleared to (its target). */
  assignedAltitudeFt: number;
  headingDeg: number;
  /** Where the aircraft is navigating when not on a plain heading: a fix, or an ILS ('ILS22L'). */
  navigatingTo: string | undefined;
  /** Cleared for an approach (ILS). */
  approachCleared: boolean;
  /** Previous returns, newest first. */
  history: LatLon[];
  /** Sim time of this return, in seconds. */
  seenAtSec: number;
  /** No radar covers the aircraft now: it is shown where it was last seen. */
  coasting: boolean;
}

interface TrackedTarget extends RadarTarget {
  /** Per covering radar, the rotation it last saw the target in. */
  scans: Map<string, number>;
}

/** The fix or approach an aircraft is flying to, or undefined on a heading. */
export function navigatingTo(aircraft: Readonly<AircraftState>): string | undefined {
  const navigation = aircraft.navigation;
  if (navigation.mode === 'direct') return navigation.fix;
  if (navigation.mode === 'hold') return `HOLD ${navigation.fix}`;
  if (navigation.mode === 'approach') return `ILS${navigation.clearance.runway}`;
  if (navigation.mode === 'procedure') {
    // The next leg that ends at a fix (heading legs in between are flown on the way).
    for (const leg of navigation.legs.slice(navigation.legIndex)) {
      if (leg.pathTerminator.startsWith('F')) return undefined; // flies a course from a fix: on a heading
      if (leg.fix && leg.position) return leg.fix;
    }
  }
  return undefined;
}

/** Returns kept per target; trails show as many of these as the display setting allows. */
const MAX_HISTORY = 20;

/**
 * A radar sensor. Its beam turns once per interval, clockwise from north,
 * around the antenna, and it sees an aircraft only where `covers` says so.
 */
export interface RadarSensor {
  id: string;
  antenna: LatLon;
  intervalSec: number;
  /** Where the beam starts its turn at time 0, as a fraction of a turn (radars aren't in step). */
  phase: number;
  covers: (aircraft: Readonly<AircraftState>) => boolean;
  /** Radius of the sweep drawn on the scope; radars without one (modeled coverage) aren't drawn. */
  sweepRadiusNm?: number | undefined;
}

/** A stable beam phase for a radar id, so each radar turns independently. */
export function phaseFor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 1000) / 1000;
}

/** A radar's beam on the scope: where it is and how far it reaches. */
export interface Sweep {
  id: string;
  antenna: LatLon;
  radiusNm: number;
  /** Beam position as a fraction of a turn from north (0..1). */
  progress: number;
  primary: boolean;
}

/** Radio line-of-sight range in NM between an antenna and a target, heights in feet. */
export function radarHorizonNm(antennaHeightFt: number, targetHeightFt: number): number {
  return 1.23 * (Math.sqrt(Math.max(0, antennaHeightFt)) + Math.sqrt(Math.max(0, targetHeightFt)));
}

/** A terminal radar (ASR): its instrumented range, limited by line of sight to low targets. */
export function terminalRadar(site: {
  id: string;
  position: LatLon;
  antennaElevationFt: number;
  rangeNm: number;
  intervalSec: number;
  antennaHeightFt?: number;
}): RadarSensor {
  const antennaHeightFt = site.antennaHeightFt ?? 50;
  const groundFt = site.antennaElevationFt - antennaHeightFt;
  return {
    id: site.id,
    antenna: site.position,
    intervalSec: site.intervalSec,
    phase: phaseFor(site.id),
    sweepRadiusNm: site.rangeNm,
    covers: (aircraft) =>
      distanceNm(site.position, aircraft.position) <=
      Math.min(site.rangeNm, radarHorizonNm(antennaHeightFt, aircraft.altitudeFt - groundFt)),
  };
}

/** Long-range (en route) radar coverage, modeled over the whole region above a floor. */
export function enrouteRadar(center: LatLon, floorFt: number, intervalSec: number): RadarSensor {
  return {
    id: 'LRR',
    antenna: center,
    intervalSec,
    phase: 0,
    covers: (aircraft) => aircraft.altitudeFt >= floorFt,
  };
}

/** Removed aircraft stay on the scope this long (until the next sweeps pass them). */
const REMOVAL_DELAY_SEC = 5;

/**
 * Radar targets from several sensors. Each aircraft is repainted whenever the
 * beam of a radar that covers it passes its bearing from that antenna. With
 * no radar covering it, the aircraft keeps flying in the sim but the scope
 * shows it coasting at its last position until coverage returns.
 */
export class RadarTracker {
  private readonly targets = new Map<string, TrackedTarget>();
  /** Aircraft not yet painted: per covering radar, the rotation they were first seen in. */
  private readonly pending = new Map<string, Map<string, number>>();
  /** Aircraft that left the sim, and when. */
  private readonly gone = new Map<string, number>();
  private started = false;
  /** Sim time of the update being processed. */
  private updateTimeSec = 0;

  /** `primary` is the radar whose sweep is drawn on the scope. */
  constructor(
    private sensors: readonly RadarSensor[],
    private primary: RadarSensor,
  ) {}

  setSensors(sensors: readonly RadarSensor[], primary: RadarSensor): void {
    this.sensors = sensors;
    this.primary = primary;
  }

  /** The primary radar's beam position as a fraction of a turn from north (0..1). */
  sweepProgress(timeSec: number): number {
    return beamProgress(this.primary, timeSec);
  }

  /** Every drawn radar's beam at a time, for the scope's sweeps. */
  sweeps(timeSec: number): Sweep[] {
    return this.sensors
      .filter((sensor) => sensor.sweepRadiusNm !== undefined)
      .map((sensor) => ({
        id: sensor.id,
        antenna: sensor.antenna,
        radiusNm: sensor.sweepRadiusNm!,
        progress: beamProgress(sensor, timeSec),
        primary: sensor.id === this.primary.id,
      }));
  }

  /** The rotation a radar's beam is on at a position: it increments as the beam passes that bearing. */
  private scanAt(sensor: RadarSensor, timeSec: number, position: LatLon): number {
    const azimuth = bearingTrue(sensor.antenna, position) / 360;
    return Math.floor(timeSec / sensor.intervalSec + sensor.phase - azimuth);
  }

  /**
   * Updates targets the beams have passed since the last call. Pass a smooth time
   * (e.g. the engine's display time) so targets refresh right as a beam crosses
   * them. Returns true when anything changed.
   */
  update(timeSec: number, aircraft: readonly Readonly<AircraftState>[]): boolean {
    this.updateTimeSec = timeSec;
    let changed = false;
    const seen = new Set<string>();

    for (const plane of aircraft) {
      seen.add(plane.id);
      this.gone.delete(plane.id);
      const covering = this.sensors.filter((sensor) => sensor.covers(plane));
      const scans = new Map(covering.map((s) => [s.id, this.scanAt(s, timeSec, plane.position)]));
      const existing = this.targets.get(plane.id);

      if (existing) {
        // Repaint when any covering radar's beam has passed it since that radar last saw it.
        const passed = covering.some((sensor) => {
          const last = existing.scans.get(sensor.id);
          return last !== undefined && last !== scans.get(sensor.id);
        });
        if (passed) {
          this.paint(plane, scans, existing);
          changed = true;
        } else {
          // Radars that just started covering it wait for their beam; ones that no longer cover it forget it.
          for (const id of [...existing.scans.keys()])
            if (!scans.has(id)) existing.scans.delete(id);
          for (const [id, scan] of scans) if (!existing.scans.has(id)) existing.scans.set(id, scan);
          const coasting = covering.length === 0;
          if (coasting !== existing.coasting) {
            existing.coasting = coasting;
            changed = true;
          }
        }
      } else if (covering.length === 0) {
        this.pending.delete(plane.id);
      } else if (!this.started) {
        // Paint everything covered on the first update so the scope doesn't start empty.
        this.paint(plane, scans, undefined);
        changed = true;
      } else {
        // New aircraft appear when a covering radar's beam first passes them.
        const firstSeen = this.pending.get(plane.id) ?? new Map<string, number>();
        const passed = [...scans].some(([id, scan]) => {
          const first = firstSeen.get(id);
          return first !== undefined && first !== scan;
        });
        if (passed) {
          this.pending.delete(plane.id);
          this.paint(plane, scans, undefined);
          changed = true;
        } else {
          for (const [id, scan] of scans) if (!firstSeen.has(id)) firstSeen.set(id, scan);
          this.pending.set(plane.id, firstSeen);
        }
      }
    }

    // Aircraft that are gone disappear shortly after (when the sweeps pass their last position).
    for (const id of this.targets.keys()) {
      if (seen.has(id)) continue;
      const since = this.gone.get(id);
      if (since === undefined) this.gone.set(id, timeSec);
      else if (timeSec - since >= REMOVAL_DELAY_SEC) {
        this.targets.delete(id);
        this.gone.delete(id);
        changed = true;
      }
    }
    for (const id of this.pending.keys()) if (!seen.has(id)) this.pending.delete(id);

    this.started = true;
    return changed;
  }

  private paint(
    plane: Readonly<AircraftState>,
    scans: Map<string, number>,
    previous: TrackedTarget | undefined,
  ): void {
    this.targets.set(plane.id, {
      id: plane.id,
      callsign: plane.callsign,
      aircraftType: plane.aircraftType,
      origin: plane.flightPlan.origin,
      destination: plane.flightPlan.destination,
      owner: plane.owner,
      position: { ...plane.position },
      altitudeFt: plane.altitudeFt,
      groundSpeedKts: groundSpeedKts(plane),
      iasKts: plane.iasKts,
      verticalSpeedFpm: plane.verticalSpeedFpm,
      assignedAltitudeFt: plane.targets.altitudeFt,
      headingDeg: plane.headingDeg,
      navigatingTo: navigatingTo(plane),
      approachCleared: plane.navigation.mode === 'approach',
      history: previous ? [previous.position, ...previous.history].slice(0, MAX_HISTORY) : [],
      seenAtSec: this.updateTimeSec,
      coasting: false,
      scans,
    });
  }

  list(): RadarTarget[] {
    return [...this.targets.values()];
  }

  get(id: string): RadarTarget | undefined {
    return this.targets.get(id);
  }

  /** Clears all targets; the next update paints everything covered again (e.g. after loading a session). */
  reset(): void {
    this.targets.clear();
    this.pending.clear();
    this.gone.clear();
    this.started = false;
  }
}

/** A radar's beam position as a fraction of a turn from north (0..1). */
function beamProgress(sensor: RadarSensor, timeSec: number): number {
  const turns = timeSec / sensor.intervalSec + sensor.phase;
  return turns - Math.floor(turns);
}
