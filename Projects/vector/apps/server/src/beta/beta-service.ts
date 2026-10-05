import type { newInviteCodeRequestSchema } from '@vector/shared';
import { describeUserAgent, type RegistrationMode } from '@vector/shared';
import type { z } from 'zod';
import type { FastifyBaseLogger } from 'fastify';
import type { Actor } from '../admin/admin-service';
import type { AuditRepository } from '../admin/audit-repository';
import type { Mailer } from '../email/mailer';
import { inviteMessage } from '../email/messages';
import { newInviteCode, type BetaRepository } from './beta-repository';

/** Registering while it's closed. */
export class RegistrationClosedError extends Error {
  constructor(message: string) {
    super(message || 'New accounts aren’t being created right now. Check back soon.');
    this.name = 'RegistrationClosedError';
  }
}

/** Registering without a working invite code while it's invite-only. */
export class InviteRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InviteRequiredError';
  }
}

export class BetaNotFoundError extends Error {
  constructor(what: string) {
    super(`That ${what} no longer exists`);
    this.name = 'BetaNotFoundError';
  }
}

/** Sending feedback: this many an hour per pilot. */
const FEEDBACK_PER_HOUR = 10;

export class FeedbackLimitError extends Error {
  constructor() {
    super('Thanks: that’s a lot of feedback for one hour. Try again a little later.');
    this.name = 'FeedbackLimitError';
  }
}

/** Invite codes, the waitlist and feedback. */
export function betaService(deps: {
  beta: BetaRepository;
  audit: AuditRepository;
  registration: () => Promise<{ mode: RegistrationMode; message: string }>;
  mailer: Mailer;
  appUrl: string;
  log: FastifyBaseLogger;
}) {
  const { beta, audit } = deps;

  return {
    /**
     * Lets a registration through (open), or through with a code (invite-only: the
     * code's use is taken now), or not at all (closed). `done` records the code on
     * the account; `cancel` gives the use back if the account wasn't created.
     */
    async admit(code: string | undefined): Promise<{
      done: (userId: string) => Promise<void>;
      cancel: () => Promise<void>;
    }> {
      const { mode, message } = await deps.registration();
      const nothing = { done: async () => {}, cancel: async () => {} };
      if (mode === 'open') return nothing;
      if (mode === 'closed') throw new RegistrationClosedError(message);
      if (!code) throw new InviteRequiredError('You need an invite code to join the beta');
      const taken = await beta.take(code);
      if ('problem' in taken) throw new InviteRequiredError(taken.problem);
      return {
        done: (userId) => beta.attach(userId, taken.id),
        cancel: () => beta.giveBack(taken.id),
      };
    },

    async check(code: string) {
      const reason = await beta.check(code);
      return reason ? { valid: false, reason } : { valid: true };
    },

    async createInvite(actor: Actor, request: z.output<typeof newInviteCodeRequestSchema>) {
      const invite = await beta.createInvite({
        code: request.code ?? newInviteCode(),
        note: request.note,
        maxUses: request.maxUses,
        expiresInDays: request.expiresInDays,
        createdBy: actor.id,
      });
      await audit.record(actor, 'invite.create', invite.code, {
        ...(invite.note ? { note: invite.note } : {}),
        uses: invite.maxUses,
        ...(request.expiresInDays ? { expiresInDays: request.expiresInDays } : {}),
      });
      return invite;
    },

    async revokeInvite(actor: Actor, id: string) {
      const invite = await beta.revokeInvite(id);
      if (!invite) throw new BetaNotFoundError('invite code');
      await audit.record(actor, 'invite.revoke', invite.code, { used: invite.uses });
      return invite;
    },

    /** Sends someone on the waitlist their own single-use code, by email. */
    async inviteFromWaitlist(actor: Actor, id: string) {
      const entry = await beta.waitlistEntry(id);
      if (!entry) throw new BetaNotFoundError('waitlist entry');
      const invite = await beta.createInvite({
        code: newInviteCode(),
        note: `Waitlist: ${entry.email}`,
        maxUses: 1,
        expiresInDays: 30,
        createdBy: actor.id,
      });
      await beta.markInvited(id, invite.id);
      const url = `${deps.appUrl}/register?invite=${encodeURIComponent(invite.code)}`;
      deps.mailer
        .send(inviteMessage(entry.email, invite.code, url))
        .catch((error: unknown) => deps.log.error({ err: error }, 'invite email not sent'));
      await audit.record(actor, 'waitlist.invite', entry.email, { code: invite.code });
      return invite;
    },

    async removeFromWaitlist(actor: Actor, id: string) {
      const email = await beta.removeFromWaitlist(id);
      if (!email) throw new BetaNotFoundError('waitlist entry');
      await audit.record(actor, 'waitlist.delete', email);
    },

    async sendFeedback(
      userId: string,
      request: { kind: 'bug' | 'idea' | 'other'; message: string; page: string },
      userAgent: string | undefined,
    ) {
      if ((await beta.recentFeedback(userId)) >= FEEDBACK_PER_HOUR) throw new FeedbackLimitError();
      await beta.addFeedback({
        userId,
        kind: request.kind,
        message: request.message,
        page: request.page.slice(0, 300),
        device: describeUserAgent(userAgent),
      });
    },
  };
}

export type BetaService = ReturnType<typeof betaService>;
