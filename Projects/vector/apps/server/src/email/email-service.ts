import { EMAIL_LINK_HOURS } from '@vector/shared';
import type { FastifyBaseLogger } from 'fastify';
import { WrongPasswordError } from '../account/account-service';
import { hashPassword, verifyPassword } from '../auth/passwords';
import type { SessionsRepository } from '../auth/sessions-repository';
import { hashRefreshToken, newRefreshToken } from '../auth/tokens';
import {
  EmailTakenError,
  UserNotFoundError,
  type UsersRepository,
} from '../users/users-repository';
import type { EmailTokenPurpose, EmailTokensRepository } from './email-tokens-repository';
import type { EmailMessage, Mailer } from './mailer';
import {
  changeEmailMessage,
  emailChangedMessage,
  emailInUseMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from './messages';

/** The link is unknown, already used or expired. */
export class InvalidEmailLinkError extends Error {
  constructor() {
    super('This link has expired or has already been used.');
    this.name = 'InvalidEmailLinkError';
  }
}

/** A link of this kind was sent moments ago. */
export class EmailCooldownError extends Error {
  constructor(readonly retryAfterSec: number) {
    super('We just sent you an email. Check your inbox, or try again in a minute.');
    this.name = 'EmailCooldownError';
  }
}

export class SameEmailError extends Error {
  constructor() {
    super('That’s already your email');
    this.name = 'SameEmailError';
  }
}

/** The email is already verified. */
export class AlreadyVerifiedError extends Error {
  constructor() {
    super('Your email is already verified');
    this.name = 'AlreadyVerifiedError';
  }
}

/** At most one email of each kind per account in this time. */
const COOLDOWN_MS = 60_000;

/** The client pages that open each link (the token goes in the fragment, never to a server). */
const LINK_PATHS: Record<EmailTokenPurpose, string> = {
  verify: '/verify-email',
  reset: '/reset-password',
  change: '/confirm-email',
  revert: '/undo-email-change',
};

export interface EmailServiceDeps {
  users: UsersRepository;
  tokens: EmailTokensRepository;
  signIns: SessionsRepository;
  mailer: Mailer;
  /** Where the client is served, for links (CLIENT_ORIGIN). */
  appUrl: string;
  log: FastifyBaseLogger;
}

/** Verifying emails, resetting passwords and changing emails, by emailed link. */
export function emailService(deps: EmailServiceDeps) {
  const { users, tokens, signIns } = deps;

  /**
   * Sends without waiting: delivery can be slow, and how long a request takes
   * mustn't tell whether an email has an account.
   */
  function deliver(message: EmailMessage) {
    deps.mailer.send(message).catch((error: unknown) => {
      deps.log.error({ err: error, subject: message.subject }, 'email not sent');
    });
  }

  /** A new link of this kind for the user (replacing any unused one), and its URL. */
  async function link(
    userId: string,
    purpose: EmailTokenPurpose,
    newEmail?: string,
  ): Promise<string> {
    const { token, hash } = newRefreshToken();
    await tokens.replace({
      userId,
      purpose,
      tokenHash: hash,
      hours: EMAIL_LINK_HOURS[purpose],
      ...(newEmail ? { newEmail } : {}),
    });
    return `${deps.appUrl}${LINK_PATHS[purpose]}#${token}`;
  }

  /** Seconds until another email of this kind may go, or 0. */
  async function cooldown(userId: string, purpose: EmailTokenPurpose): Promise<number> {
    const last = await tokens.lastSentAt(userId, purpose);
    const wait = last ? last.getTime() + COOLDOWN_MS - Date.now() : 0;
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
  }

  async function consume(token: string, purpose: EmailTokenPurpose) {
    const consumed = await tokens.consume(hashRefreshToken(token), purpose);
    if (!consumed) throw new InvalidEmailLinkError();
    const user = await users.findById(consumed.userId);
    if (!user || user.disabledAt) throw new InvalidEmailLinkError();
    return { user, newEmail: consumed.newEmail };
  }

  return {
    /** Emails a link to verify the account's address. */
    async sendVerification(userId: string, options: { ignoreCooldown?: boolean } = {}) {
      const user = await users.findById(userId);
      if (!user) throw new UserNotFoundError();
      if (user.emailVerifiedAt) throw new AlreadyVerifiedError();
      const wait = options.ignoreCooldown ? 0 : await cooldown(userId, 'verify');
      if (wait > 0) throw new EmailCooldownError(wait);
      deliver(verifyEmailMessage(user.email, user.displayName, await link(userId, 'verify')));
    },

    async verify(token: string): Promise<void> {
      const { user } = await consume(token, 'verify');
      await users.update(user.id, { emailVerified: true });
    },

    /** Emails a reset link if the address has an (enabled) account; says nothing either way. */
    async requestPasswordReset(email: string): Promise<void> {
      const user = await users.findByEmail(email);
      if (!user || user.disabledAt || (await cooldown(user.id, 'reset')) > 0) return;
      deliver(resetPasswordMessage(user.email, user.displayName, await link(user.id, 'reset')));
    },

    /** Sets a new password from a reset link, and signs out everywhere. */
    async resetPassword(token: string, password: string): Promise<void> {
      const { user } = await consume(token, 'reset');
      // Opening the link proves they have the address.
      await users.update(user.id, {
        passwordHash: await hashPassword(password),
        emailVerified: true,
      });
      await tokens.discard(user.id, 'reset');
      await signIns.revokeAllForUser(user.id);
    },

    /**
     * Starts moving the account to a new address: a link goes there. If the address
     * already has an account, its owner is told instead, and the requester isn't.
     */
    async requestEmailChange(userId: string, email: string, currentPassword: string) {
      const user = await users.findById(userId);
      if (!user) throw new UserNotFoundError();
      if (!(await verifyPassword(currentPassword, user.passwordHash)))
        throw new WrongPasswordError();
      if (email.toLowerCase() === user.email.toLowerCase()) throw new SameEmailError();
      const wait = await cooldown(userId, 'change');
      if (wait > 0) throw new EmailCooldownError(wait);
      const url = await link(userId, 'change', email);
      if (await users.findByEmail(email)) deliver(emailInUseMessage(email, `${deps.appUrl}/login`));
      else deliver(changeEmailMessage(email, user.displayName, url));
    },

    async cancelEmailChange(userId: string): Promise<void> {
      await tokens.discard(userId, 'change');
    },

    /** Moves the account to the new address from its link; the old one can undo it. */
    async confirmEmailChange(token: string): Promise<void> {
      const { user, newEmail } = await consume(token, 'change');
      if (!newEmail) throw new InvalidEmailLinkError();
      if (await users.findByEmail(newEmail)) throw new EmailTakenError();
      await users.update(user.id, { email: newEmail, emailVerified: true });
      const undo = await link(user.id, 'revert', user.email);
      deliver(emailChangedMessage(user.email, user.displayName, newEmail, undo));
    },

    /** Moves the account back to the address it changed from, and signs it out everywhere. */
    async undoEmailChange(token: string): Promise<void> {
      const { user, newEmail: previous } = await consume(token, 'revert');
      if (!previous) throw new InvalidEmailLinkError();
      const owner = await users.findByEmail(previous);
      if (owner && owner.id !== user.id) throw new EmailTakenError();
      await users.update(user.id, { email: previous, emailVerified: true });
      await tokens.discard(user.id, 'change');
      await signIns.revokeAllForUser(user.id);
    },
  };
}

export type EmailService = ReturnType<typeof emailService>;
