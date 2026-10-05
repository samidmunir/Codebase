import { EMAIL_LINK_HOURS } from '@vector/shared';
import type { EmailMessage } from './mailer';

// The emails Vector sends. Each is short, in plain text and simple HTML.

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Parts {
  to: string;
  subject: string;
  greeting: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footer: string;
}

function compose(parts: Parts): EmailMessage {
  const text = [
    parts.greeting,
    '',
    ...parts.paragraphs.flatMap((p) => [p, '']),
    ...(parts.action ? [`${parts.action.label}: ${parts.action.url}`, ''] : []),
    parts.footer,
    '',
    '— Vector',
  ].join('\n');
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#05080b;font-family:Inter,Helvetica,Arial,sans-serif;color:#d7e3ea">
<div style="max-width:520px;margin:0 auto;padding:28px;background:#0b1117;border:1px solid #1d2a33;border-radius:10px">
<p style="margin:0 0 20px;font-weight:700;letter-spacing:.02em;color:#4cf2a0">VECTOR</p>
<p style="margin:0 0 16px">${escape(parts.greeting)}</p>
${parts.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escape(p)}</p>`).join('\n')}
${
  parts.action
    ? `<p style="margin:24px 0"><a href="${escape(parts.action.url)}" style="display:inline-block;padding:12px 20px;background:#4cf2a0;color:#04120c;font-weight:600;text-decoration:none;border-radius:6px">${escape(parts.action.label)}</a></p>
<p style="margin:0 0 16px;font-size:13px;color:#8a9aa5;word-break:break-all">Or open this link: ${escape(parts.action.url)}</p>`
    : ''
}
<p style="margin:24px 0 0;font-size:13px;color:#8a9aa5">${escape(parts.footer)}</p>
</div></body></html>`;
  return { to: parts.to, subject: parts.subject, text, html };
}

const hi = (name: string) => `Hi ${name},`;

export function verifyEmailMessage(to: string, name: string, url: string): EmailMessage {
  return compose({
    to,
    subject: 'Verify your email for Vector',
    greeting: hi(name),
    paragraphs: [
      'Confirm this is your email address, and your verified sessions can go on the Vector records.',
    ],
    action: { label: 'Verify my email', url },
    footer: `The link works for ${EMAIL_LINK_HOURS.verify} hours. If you didn't create a Vector account, you can ignore this email.`,
  });
}

export function resetPasswordMessage(to: string, name: string, url: string): EmailMessage {
  return compose({
    to,
    subject: 'Reset your Vector password',
    greeting: hi(name),
    paragraphs: [
      'Someone asked to reset the password for your Vector account. Choose a new one with the link below; it signs you out everywhere.',
    ],
    action: { label: 'Choose a new password', url },
    footer: `The link works once, for ${EMAIL_LINK_HOURS.reset} hour. If you didn't ask for this, ignore this email: your password hasn't changed.`,
  });
}

export function changeEmailMessage(to: string, name: string, url: string): EmailMessage {
  return compose({
    to,
    subject: 'Confirm your new email for Vector',
    greeting: hi(name),
    paragraphs: [`Your Vector account will use ${to} once you confirm it with the link below.`],
    action: { label: 'Confirm my new email', url },
    footer: `The link works for ${EMAIL_LINK_HOURS.change} hours. If you didn't ask for this, ignore this email and nothing changes.`,
  });
}

/** Sent to an address someone tried to move another account to, when it already has one. */
export function emailInUseMessage(to: string, signInUrl: string): EmailMessage {
  return compose({
    to,
    subject: 'Your email is already on Vector',
    greeting: 'Hi,',
    paragraphs: [
      'Someone asked to move a Vector account to this email address, but you already have an account with it, so nothing changed.',
      'If that was you, sign in with this address instead, or reset its password if you’ve forgotten it.',
    ],
    action: { label: 'Sign in', url: signInUrl },
    footer: 'If it wasn’t you, you can ignore this email.',
  });
}

/** Sent to the old address once an email change goes through, with a link to undo it. */
export function emailChangedMessage(
  to: string,
  name: string,
  newEmail: string,
  undoUrl: string,
): EmailMessage {
  return compose({
    to,
    subject: 'Your Vector email was changed',
    greeting: hi(name),
    paragraphs: [
      `Your Vector account now uses ${newEmail}. Emails will go there from now on.`,
      'If you didn’t make this change, undo it with the link below: it moves your account back to this address and signs it out everywhere. Then reset your password.',
    ],
    action: { label: 'Undo this change', url: undoUrl },
    footer: `The link works for ${EMAIL_LINK_HOURS.revert / 24} days. If you made this change, there’s nothing to do.`,
  });
}
