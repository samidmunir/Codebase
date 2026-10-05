import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyBaseLogger } from 'fastify';

/** One email, in plain text and HTML. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10_000;

/** Sends through Resend's API. */
export function resendMailer(options: { apiKey: string; from: string }): Mailer {
  return {
    async send(message) {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Resend refused the email (${response.status}): ${detail.slice(0, 300)}`);
      }
    },
  };
}

/** Writes emails to the server log, links and all (development). */
export function logMailer(log: FastifyBaseLogger): Mailer {
  return {
    send(message) {
      log.info({ to: message.to, subject: message.subject }, `email:\n${message.text}`);
      return Promise.resolve();
    },
  };
}

/** Writes each email to a JSON file in a folder (end-to-end tests read them there). */
export function outboxMailer(dir: string): Mailer {
  let count = 0;
  return {
    async send(message) {
      await mkdir(dir, { recursive: true });
      count += 1;
      const name = `${Date.now()}-${process.pid}-${count}.json`;
      await writeFile(join(dir, name), JSON.stringify(message, null, 2));
    },
  };
}

/** Keeps emails in memory (integration tests). */
export function memoryMailer(): Mailer & {
  sent: EmailMessage[];
  to(address: string): EmailMessage[];
} {
  const sent: EmailMessage[] = [];
  return {
    sent,
    to: (address) => sent.filter((message) => message.to === address),
    send(message) {
      sent.push(message);
      return Promise.resolve();
    },
  };
}
