import { SettingsValidationError, type ApiError } from '@vector/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { InvalidCredentialsError, InvalidSessionError } from '../auth/auth-service';
import { UnauthorizedError } from '../auth/authenticate';
import { SavedSessionLimitError, SavedSessionNotFoundError } from '../sessions/sessions-repository';
import { EmailTakenError } from '../users/users-repository';
import { WeatherUnavailableError } from '../weather/metar-service';
import { InvalidSnapshotError } from './sessions';
import { REFRESH_COOKIE, refreshCookieOptions } from './auth';

const body = (code: string, message: string, fields?: Record<string, string>): ApiError => ({
  error: { code, message, ...(fields ? { fields } : {}) },
});

/** Maps domain errors to JSON error responses. Unexpected errors are logged and hidden. */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    return reply.code(400).send(body('invalid_request', 'Check the highlighted fields', fields));
  }
  if (error instanceof EmailTakenError) {
    return reply.code(409).send(body('email_taken', error.message, { email: error.message }));
  }
  if (error instanceof InvalidCredentialsError)
    return reply.code(401).send(body('invalid_credentials', error.message));
  if (error instanceof InvalidSessionError) {
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(false));
    return reply.code(401).send(body(`session_${error.reason}`, error.message));
  }
  if (error instanceof UnauthorizedError)
    return reply.code(401).send(body('unauthorized', error.message));
  if (error instanceof SettingsValidationError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.key, issue.message]));
    return reply.code(400).send(body('invalid_settings', 'Some settings are invalid', fields));
  }
  if (error instanceof SavedSessionNotFoundError)
    return reply.code(404).send(body('session_not_found', error.message));
  if (error instanceof SavedSessionLimitError)
    return reply.code(409).send(body('session_limit', error.message));
  if (error instanceof InvalidSnapshotError) {
    request.log.warn(
      { detail: error.detail.slice(0, 2_000) },
      'rejected an invalid session snapshot',
    );
    return reply.code(400).send(body('invalid_snapshot', error.message));
  }
  if (error instanceof WeatherUnavailableError) {
    request.log.warn({ detail: String(error.cause) }, 'live weather fetch failed');
    return reply.code(503).send(body('weather_unavailable', error.message));
  }
  if ('statusCode' in error && error.statusCode === 413) {
    return reply.code(413).send(body('too_large', 'That session is too large to save'));
  }
  if ('statusCode' in error && error.statusCode === 429) {
    return reply
      .code(429)
      .send(body('rate_limited', 'Too many attempts. Wait a minute and try again.'));
  }
  if ('statusCode' in error && error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send(body('bad_request', error.message));
  }
  request.log.error(error);
  return reply.code(500).send(body('internal_error', 'Something went wrong'));
}
