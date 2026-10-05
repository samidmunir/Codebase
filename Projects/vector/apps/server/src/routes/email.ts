import {
  changeEmailRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  tokenRequestSchema,
} from '@vector/shared';
import type { FastifyInstance } from 'fastify';
import type { Authenticator } from '../auth/authenticate';
import type { EmailService } from '../email/email-service';

export interface EmailRouteOptions {
  emails: EmailService;
  authenticate: Authenticator;
  /** Requests allowed per IP per minute on the routes that send email or open links. */
  rateLimit: number;
}

/** Emailed links: verifying the address, resetting the password, changing the email. */
export async function emailRoutes(app: FastifyInstance, options: EmailRouteOptions) {
  const { emails } = options;
  const config = { rateLimit: { max: options.rateLimit, timeWindow: '1 minute' } };
  const signedIn = { preHandler: options.authenticate.user, config };

  app.post('/auth/verify-email/send', signedIn, async (request, reply) => {
    await emails.sendVerification(request.userId!);
    return reply.code(204).send();
  });

  app.post('/auth/verify-email', { config }, async (request, reply) => {
    await emails.verify(tokenRequestSchema.parse(request.body).token);
    return reply.code(204).send();
  });

  // Always 204, so it doesn't tell whether an email has an account.
  app.post('/auth/forgot-password', { config }, async (request, reply) => {
    await emails.requestPasswordReset(forgotPasswordRequestSchema.parse(request.body).email);
    return reply.code(204).send();
  });

  app.post('/auth/reset-password', { config }, async (request, reply) => {
    const { token, password } = resetPasswordRequestSchema.parse(request.body);
    await emails.resetPassword(token, password);
    return reply.code(204).send();
  });

  app.post('/auth/email', signedIn, async (request, reply) => {
    const { email, currentPassword } = changeEmailRequestSchema.parse(request.body);
    await emails.requestEmailChange(request.userId!, email, currentPassword);
    return reply.code(204).send();
  });

  app.delete('/auth/email', signedIn, async (request, reply) => {
    await emails.cancelEmailChange(request.userId!);
    return reply.code(204).send();
  });

  app.post('/auth/email/confirm', { config }, async (request, reply) => {
    await emails.confirmEmailChange(tokenRequestSchema.parse(request.body).token);
    return reply.code(204).send();
  });

  app.post('/auth/email/undo', { config }, async (request, reply) => {
    await emails.undoEmailChange(tokenRequestSchema.parse(request.body).token);
    return reply.code(204).send();
  });
}
