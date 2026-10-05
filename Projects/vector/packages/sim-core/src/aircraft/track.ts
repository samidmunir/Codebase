import { z } from 'zod';
import { groundSpeedKts, type AircraftState } from './aircraft';

// The path an aircraft has flown since it became the player's traffic, for
// the scope's heat trail. Saved with the session, so trails survive a resume.

/** [tick, lat, lon, altitude ft, ground speed kts] — compact, as sessions can hold thousands. */
export const trackPointSchema = z.tuple([
  z.number().int().min(0),
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
  z.number(),
  z.number().min(0),
]);

export type TrackPoint = z.infer<typeof trackPointSchema>;

/** A track point is recorded this often. */
export const TRACK_SAMPLE_SEC = 10;

export function trackPoint(tick: number, aircraft: Readonly<AircraftState>): TrackPoint {
  return [
    tick,
    Math.round(aircraft.position.lat * 1e5) / 1e5,
    Math.round(aircraft.position.lon * 1e5) / 1e5,
    Math.round(aircraft.altitudeFt),
    Math.round(groundSpeedKts(aircraft)),
  ];
}
