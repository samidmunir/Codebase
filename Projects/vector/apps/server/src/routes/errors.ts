import { SettingsValidationError, type ApiError } from '@vector/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  ConfirmationMismatchError,
  HandleChangeTooSoonError,
  LastAdminError,
  WrongPasswordError,
} from '../account/account-service';
import { AdminGuardError } from '../admin/admin-service';
import { AirspaceDisabledError, AirspaceNotFoundError } from '../airspaces/airspaces-repository';
import {
  AccountDisabledError,
  InvalidCredentialsError,
  InvalidSessionError,
} from '../auth/auth-service';
import { ForbiddenError, UnauthorizedError } from '../auth/authenticate';
import { SavedSessionLimitError, SavedSessionNotFoundError } from '../sessions/sessions-repository';
import { EmailTakenError, HandleTakenError, UserNotFoundError } from '../users/users-repository';
import { ResultNotFoundError } from '../results/results-repository';
import { NewsNotFoundError, SlugTakenError } from '../news/news-repository';
import { InvalidResultError } from '../results/results-service';
import { WeatherUnavailableError } from '../weather/metar-service';
import {
  AlreadyVerifiedError,
  EmailCooldownError,
  InvalidEmailLinkError,
  SameEmailError,
} from '../email/email-service';
import {
  ForumCategoryNotFoundError,
  ForumPostNotFoundError,
  ForumThreadNotFoundError,
} from '../forum/forum-repository';
import {
  ForumEditError,
  ForumPostingError,
  ForumResultError,
  OpeningPostError,
} from '../forum/forum-service';
import { CategoryNotEmptyError, CategoryTakenError } from '../forum/forum-admin-repository';
import { RegistrationClosedError } from '../site/site-settings-repository';
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
  if (error instanceof WrongPasswordError)
    return reply.code(403).send(
      body('wrong_password', error.message, {
        currentPassword: error.message,
        password: error.message,
      }),
    );
  if (error instanceof HandleChangeTooSoonError)
    return reply.code(409).send(body('handle_too_soon', error.message, { handle: error.message }));
  if (error instanceof ConfirmationMismatchError)
    return reply
      .code(400)
      .send(body('confirmation_mismatch', error.message, { confirmHandle: error.message }));
  if (error instanceof LastAdminError)
    return reply.code(409).send(body('last_admin', error.message));
  if (error instanceof HandleTakenError) {
    return reply.code(409).send(body('handle_taken', error.message, { handle: error.message }));
  }
  if (error instanceof EmailTakenError) {
    return reply.code(409).send(body('email_taken', error.message, { email: error.message }));
  }
  if (
    error instanceof ForumCategoryNotFoundError ||
    error instanceof ForumThreadNotFoundError ||
    error instanceof ForumPostNotFoundError
  )
    return reply.code(404).send(body('forum_not_found', error.message));
  if (error instanceof ForumPostingError)
    return reply
      .code(
        error.reason === 'rateLimited'
          ? 429
          : error.reason === 'links'
            ? 400
            : error.reason === 'readOnly'
              ? 503
              : 403,
      )
      .send(
        body(
          `forum_${error.reason}`,
          error.message,
          error.reason === 'links' ? { body: error.message } : undefined,
        ),
      );
  if (error instanceof ForumEditError)
    return reply.code(403).send(body('forum_edit', error.message));
  if (error instanceof ForumResultError)
    return reply.code(400).send(body('forum_result', error.message, { resultId: error.message }));
  if (error instanceof OpeningPostError)
    return reply.code(409).send(body('opening_post', error.message));
  if (error instanceof CategoryTakenError)
    return reply.code(409).send(body('category_taken', error.message, { id: error.message }));
  if (error instanceof CategoryNotEmptyError)
    return reply
      .code(409)
      .send(body('category_not_empty', error.message, { moveTo: error.message }));
  if (error instanceof RegistrationClosedError)
    return reply.code(403).send(body('registration_closed', error.message));
  if (error instanceof InvalidEmailLinkError)
    return reply.code(400).send(body('invalid_link', error.message));
  if (error instanceof EmailCooldownError)
    return reply
      .code(429)
      .header('retry-after', String(error.retryAfterSec))
      .send(body('email_cooldown', error.message));
  if (error instanceof SameEmailError)
    return reply.code(400).send(body('same_email', error.message, { email: error.message }));
  if (error instanceof AlreadyVerifiedError)
    return reply.code(409).send(body('already_verified', error.message));
  if (error instanceof InvalidCredentialsError)
    return reply.code(401).send(body('invalid_credentials', error.message));
  if (error instanceof InvalidSessionError) {
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(false));
    return reply.code(401).send(body(`session_${error.reason}`, error.message));
  }
  if (error instanceof UnauthorizedError)
    return reply.code(401).send(body('unauthorized', error.message));
  if (error instanceof AccountDisabledError)
    return reply.code(403).send(body('account_disabled', error.message));
  if (error instanceof ForbiddenError)
    return reply.code(403).send(body('forbidden', error.message));
  if (error instanceof AdminGuardError)
    return reply.code(409).send(body('admin_guard', error.message));
  if (error instanceof NewsNotFoundError)
    return reply.code(404).send(body('news_not_found', error.message));
  if (error instanceof SlugTakenError)
    return reply.code(409).send(body('slug_taken', error.message, { slug: error.message }));
  if (error instanceof ResultNotFoundError)
    return reply.code(404).send(body('result_not_found', error.message));
  if (error instanceof InvalidResultError) {
    request.log.warn({ detail: error.detail.slice(0, 2_000) }, 'rejected a session result');
    return reply.code(400).send(body('invalid_result', error.message));
  }
  if (error instanceof UserNotFoundError)
    return reply.code(404).send(body('user_not_found', error.message));
  if (error instanceof AirspaceNotFoundError)
    return reply.code(404).send(body('airspace_not_found', error.message));
  if (error instanceof AirspaceDisabledError)
    return reply.code(403).send(body('airspace_disabled', error.message));
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
