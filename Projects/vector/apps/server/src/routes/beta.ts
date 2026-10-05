import {
  feedbackRequestSchema,
  feedbackUpdateSchema,
  newInviteCodeRequestSchema,
  waitlistRequestSchema,
  FEEDBACK_STATUSES,
} from '@vector/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Authenticator } from '../auth/authenticate';
import type { BetaRepository } from '../beta/beta-repository';
import { BetaNotFoundError, type BetaService } from '../beta/beta-service';

export interface BetaRouteOptions {
  beta: BetaService;
  repository: BetaRepository;
  authenticate: Authenticator;
  rateLimit: number;
}

const idParams = z.object({ id: z.uuid() });
const codeParams = z.object({ code: z.string().trim().min(1).max(40) });
const statusQuery = z.object({ status: z.enum(FEEDBACK_STATUSES).optional() });

/** The beta: checking codes, the waitlist and feedback (public), and managing them (admins). */
export async function betaRoutes(app: FastifyInstance, options: BetaRouteOptions) {
  const { beta, repository } = options;
  const limited = { config: { rateLimit: { max: options.rateLimit, timeWindow: '1 minute' } } };
  const admin = { preHandler: options.authenticate.admin };
  const actor = (request: FastifyRequest) => ({
    id: request.account!.id,
    email: request.account!.email,
  });
  const id = (request: FastifyRequest, what: string) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) throw new BetaNotFoundError(what);
    return parsed.data.id;
  };

  /** Whether an invite code works (the registration page checks as it's typed). */
  app.get('/invites/:code', limited, async (request) =>
    beta.check(codeParams.parse(request.params).code),
  );

  // Always 204, so it doesn't tell whether someone is already on it.
  app.post('/waitlist', limited, async (request, reply) => {
    const { email, note } = waitlistRequestSchema.parse(request.body);
    await repository.join(email, note);
    return reply.code(204).send();
  });

  app.post(
    '/feedback',
    { preHandler: options.authenticate.user, ...limited },
    async (request, reply) => {
      await beta.sendFeedback(
        request.userId!,
        feedbackRequestSchema.parse(request.body),
        request.headers['user-agent'],
      );
      return reply.code(204).send();
    },
  );

  // ---- Admins ------------------------------------------------------------------------

  app.get('/admin/invites', admin, async () => ({ codes: await repository.invites() }));

  app.post('/admin/invites', admin, async (request, reply) => {
    const invite = await beta.createInvite(
      actor(request),
      newInviteCodeRequestSchema.parse(request.body ?? {}),
    );
    return reply.code(201).send(invite);
  });

  app.post('/admin/invites/:id/revoke', admin, async (request) =>
    beta.revokeInvite(actor(request), id(request, 'invite code')),
  );

  app.get('/admin/waitlist', admin, async () => repository.waitlist());

  app.post('/admin/waitlist/:id/invite', admin, async (request) =>
    beta.inviteFromWaitlist(actor(request), id(request, 'waitlist entry')),
  );

  app.delete('/admin/waitlist/:id', admin, async (request, reply) => {
    await beta.removeFromWaitlist(actor(request), id(request, 'waitlist entry'));
    return reply.code(204).send();
  });

  app.get('/admin/feedback', admin, async (request) =>
    repository.feedback(statusQuery.parse(request.query).status),
  );

  app.patch('/admin/feedback/:id', admin, async (request, reply) => {
    const { status } = feedbackUpdateSchema.parse(request.body);
    if (!(await repository.setFeedbackStatus(id(request, 'feedback'), status)))
      throw new BetaNotFoundError('feedback');
    return reply.code(204).send();
  });
}
