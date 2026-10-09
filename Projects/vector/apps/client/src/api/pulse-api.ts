import { pulseSchema, type Pulse } from '@vector/shared';
import { apiRequest } from './api-client';

/** "This week on Vector": real numbers, once there are enough to show. */
export async function getPulse(): Promise<Pulse> {
  return pulseSchema.parse(await apiRequest('/pulse'));
}
