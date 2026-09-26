import { SettingsValidationError, type ApiError } from '@vector/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { InvalidCredentialsError, InvalidSessionError } from '../auth/auth-service';
import { UnauthorizedError } from '../auth/authenticate';
import { EmailTakenError } from '../users/users-repository';
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
