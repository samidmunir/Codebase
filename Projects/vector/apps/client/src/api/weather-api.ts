import { metarResponseSchema, type MetarResponse } from '@vector/shared';
import { apiRequest } from './api-client';

/** Latest METARs for the airports, through the server (cached there for a couple of minutes). */
export async function fetchMetars(stations: readonly string[]): Promise<MetarResponse> {
  const ids = encodeURIComponent(stations.join(','));
  return metarResponseSchema.parse(await apiRequest(`/weather/metar?ids=${ids}`));
}
