import { z } from 'zod';
import { headingDifference } from '../math/angles';
import { windSchema, type LiveWeatherReport, type Wind } from './wind';

// The ATIS: each airport's recorded broadcast of its weather and runways in
// use, identified by a letter that moves on (Alfa, Bravo, ...) each time it
// is reissued. Arrivals report the current letter when they check in.

export const atisSchema = z.object({
  letter: z.string().regex(/^[A-Z]$/),
  issuedTick: z.number().int().min(0),
  /** What the broadcast says, so a new one is issued only when that has changed. */
  wind: windSchema,
  configId: z.string(),
  reportObservedAt: z.string().optional(),
  /** The broadcast, in the style of a digital ATIS. */
  text: z.string(),
});

export type Atis = z.infer<typeof atisSchema>;

/** A new ATIS is issued when the wind has changed this much from the broadcast one... */
const WIND_DIRECTION_CHANGE_DEG = 30;
const WIND_SPEED_CHANGE_KTS = 5;
/** ...and at least this often (the hourly observation). */
export const ATIS_MAX_AGE_SEC = 3_600;

export interface AtisInputs {
  wind: Wind;
  configId: string;
  report?: Readonly<LiveWeatherReport> | undefined;
}

/** Whether the broadcast no longer matches the weather and runways, so a new letter is due. */
export function atisOutdated(
  current: Readonly<Atis> | undefined,
  inputs: AtisInputs,
  tick: number,
  tickSeconds: number,
): boolean {
  if (!current) return true;
  if (current.configId !== inputs.configId) return true;
  if (inputs.report && inputs.report.observedAt !== current.reportObservedAt) return true;
  if ((tick - current.issuedTick) * tickSeconds >= ATIS_MAX_AGE_SEC) return true;
  const was = current.wind;
  const now = inputs.wind;
  // Calm to a real wind (or back) is a change; so is a large shift in direction or speed.
  if ((was.directionDeg === 0) !== (now.directionDeg === 0))
    return now.speedKts > 3 || was.speedKts > 3;
  if (
    was.directionDeg !== 0 &&
    Math.abs(headingDifference(was.directionDeg, now.directionDeg)) >= WIND_DIRECTION_CHANGE_DEG
  )
    return true;
  return (
    Math.abs(was.speedKts - now.speedKts) >= WIND_SPEED_CHANGE_KTS ||
    Math.abs((was.gustKts ?? 0) - (now.gustKts ?? 0)) >= WIND_SPEED_CHANGE_KTS
  );
}

/** The letter after `letter` (Zulu goes back to Alfa). */
export function nextAtisLetter(letter: string): string {
  return String.fromCharCode(((letter.charCodeAt(0) - 65 + 1) % 26) + 65);
}

/** '04R' -> '4R', as an ATIS says runways. */
const runwayName = (runway: string) => runway.replace(/^0/, '');

/** The weather part of a METAR: wind to altimeter, without the station, time or remarks. */
export function metarBody(raw: string): string {
  return raw
    .replace(/^(METAR|SPECI)\s+/, '')
    .replace(/^[A-Z0-9]{4}\s+\d{6}Z\s+/, '')
    .replace(/^AUTO\s+/, '')
    .replace(/\s+RMK\b.*$/, '')
    .trim();
}

export interface AtisTextInput {
  /** 'JFK'. */
  airport: string;
  letter: string;
  /** '0151' (UTC). */
  timeZ: string;
  wind: Wind;
  report?: Readonly<LiveWeatherReport> | undefined;
  arrivals: readonly string[];
  departures: readonly string[];
  /** Runways among the arrival runways with an ILS. */
  ilsRunways: readonly string[];
}

/** The broadcast, in the style of a digital ATIS (D-ATIS). */
export function atisText(input: AtisTextInput): string {
  const { wind } = input;
  const weather = input.report
    ? metarBody(input.report.raw)
    : wind.directionDeg === 0 || wind.speedKts <= 2
      ? 'WIND CALM'
      : `WIND ${String(wind.directionDeg).padStart(3, '0')} AT ${wind.speedKts}${wind.gustKts !== undefined ? ` GUSTS ${wind.gustKts}` : ''}`;
  const list = (runways: readonly string[]) => runways.map(runwayName).join(', ');
  const plural = (runways: readonly string[]) => (runways.length > 1 ? 'RUNWAYS' : 'RUNWAY');
  const parts = [
    `${input.airport} ATIS INFO ${input.letter} ${input.timeZ}Z`,
    weather,
    input.ilsRunways.length > 0
      ? `ILS ${plural(input.ilsRunways)} ${input.ilsRunways.map(runwayName).join(' AND ')} APPROACH${input.ilsRunways.length > 1 ? 'ES' : ''} IN USE`
      : undefined,
    `LANDING ${plural(input.arrivals)} ${list(input.arrivals)}`,
    `DEPARTING ${plural(input.departures)} ${list(input.departures)}`,
    `ADVISE ON INITIAL CONTACT YOU HAVE INFO ${input.letter}`,
  ];
  return `${parts.filter(Boolean).join('. ')}.`;
}
