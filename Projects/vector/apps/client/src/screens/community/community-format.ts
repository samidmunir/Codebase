import { ApiRequestError } from '../../api/api-client';

/** The message to show for a failed request. */
export const failure = (caught: unknown) =>
  caught instanceof ApiRequestError
    ? caught.message
    : 'Couldn’t reach the server. Check your connection and try again.';
