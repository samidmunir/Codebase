import type { MetarObservation, MetarResponse } from '@vector/shared';

// Fetches METARs from the Aviation Weather Center's data API and keeps them
// briefly, so many players polling the same airports make one request.
// https://aviationweather.gov/data/api/

const SOURCE_URL = 'https://aviationweather.gov/api/data/metar';
/** The source updates METARs about hourly (sooner for special reports). */
const DEFAULT_CACHE_SECONDS = 120;
const REQUEST_TIMEOUT_MS = 10_000;
const HPA_TO_INHG = 0.02953;

export class WeatherUnavailableError extends Error {
  constructor(detail: string) {
    super('Live weather is unavailable right now');
    this.name = 'WeatherUnavailableError';
    this.cause = detail;
  }
}

/** One station in the source's JSON format (only the fields Vector uses). */
interface SourceMetar {
  icaoId?: unknown;
  obsTime?: unknown;
  rawOb?: unknown;
  wdir?: unknown;
  wspd?: unknown;
  wgst?: unknown;
  visib?: unknown;
  altim?: unknown;
  temp?: unknown;
  dewp?: unknown;
  fltCat?: unknown;
  clouds?: unknown;
}

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Converts one source record, or undefined if it lacks what Vector needs. */
export function toObservation(source: SourceMetar): MetarObservation | undefined {
  const icao = typeof source.icaoId === 'string' ? source.icaoId : undefined;
  const obsTime = num(source.obsTime);
  const speed = num(source.wspd);
  if (!icao || obsTime === undefined || speed === undefined || typeof source.rawOb !== 'string')
    return undefined;
  const direction = num(source.wdir);
  const gust = num(source.wgst);
  // Visibility is a number, or a string like '10+' for 10 SM or more.
  const visibility =
    num(source.visib) ??
    (typeof source.visib === 'string' ? Number.parseFloat(source.visib) || undefined : undefined);
  const layers = Array.isArray(source.clouds)
    ? (source.clouds as { cover?: unknown; base?: unknown }[])
    : [];
  const ceiling = layers
    .filter((layer) => layer.cover === 'BKN' || layer.cover === 'OVC' || layer.cover === 'OVX')
    .map((layer) => num(layer.base))
    .filter((base): base is number => base !== undefined)
    .sort((a, b) => a - b)[0];
  const altimeterHpa = num(source.altim);
  const temperature = num(source.temp);
  const dewpoint = num(source.dewp);
  const category =
    source.fltCat === 'VFR' ||
    source.fltCat === 'MVFR' ||
    source.fltCat === 'IFR' ||
    source.fltCat === 'LIFR'
      ? source.fltCat
      : undefined;
  return {
    icao,
    observedAt: new Date(obsTime * 1000).toISOString(),
    raw: source.rawOb,
    // 'VRB' (variable) comes as a string; calm as 0 kt.
    windDirectionTrueDeg: direction !== undefined && speed > 0 ? direction : null,
    windSpeedKts: speed,
    ...(gust !== undefined && gust > speed ? { gustKts: gust } : {}),
    ...(visibility !== undefined ? { visibilitySm: visibility } : {}),
    ...(ceiling !== undefined ? { ceilingFt: ceiling } : {}),
    ...(altimeterHpa !== undefined
      ? { altimeterInHg: Math.round(altimeterHpa * HPA_TO_INHG * 100) / 100 }
      : {}),
    ...(temperature !== undefined ? { temperatureC: temperature } : {}),
    ...(dewpoint !== undefined ? { dewpointC: dewpoint } : {}),
    ...(category ? { flightCategory: category } : {}),
  };
}

export interface MetarServiceOptions {
  fetch?: typeof fetch;
  cacheSeconds?: number;
  now?: () => number;
}

export function metarService(options: MetarServiceOptions = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const cacheMs = (options.cacheSeconds ?? DEFAULT_CACHE_SECONDS) * 1000;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { at: number; response: MetarResponse }>();
  const inFlight = new Map<string, Promise<MetarResponse>>();

  async function load(ids: readonly string[]): Promise<MetarResponse> {
    const url = `${SOURCE_URL}?ids=${ids.join(',')}&format=json`;
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { accept: 'application/json', 'user-agent': 'Vector ATC simulator' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new WeatherUnavailableError(String(error));
    }
    // 204: no reports for these stations.
    if (response.status === 204)
      return { observations: [], fetchedAt: new Date(now()).toISOString() };
    if (!response.ok) throw new WeatherUnavailableError(`source returned ${response.status}`);
    const body: unknown = await response.json().catch(() => undefined);
    if (!Array.isArray(body)) throw new WeatherUnavailableError('unexpected source format');
    const observations = body
      .map((record) => toObservation(record as SourceMetar))
      .filter((o): o is MetarObservation => o !== undefined && ids.includes(o.icao));
    return { observations, fetchedAt: new Date(now()).toISOString() };
  }

  return {
    /** Latest METARs for the stations, from the cache when fresh. */
    async latest(ids: readonly string[]): Promise<MetarResponse> {
      const key = [...ids].sort().join(',');
      const cached = cache.get(key);
      if (cached && now() - cached.at < cacheMs) return cached.response;
      const pending = inFlight.get(key) ?? load([...ids].sort());
      inFlight.set(key, pending);
      try {
        const response = await pending;
        cache.set(key, { at: now(), response });
        return response;
      } finally {
        inFlight.delete(key);
      }
    },
  };
}

export type MetarService = ReturnType<typeof metarService>;
