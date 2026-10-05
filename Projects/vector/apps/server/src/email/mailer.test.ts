import { afterEach, describe, expect, it, vi } from 'vitest';
import { resendMailer } from './mailer';
import { verifyEmailMessage } from './messages';

const message = verifyEmailMessage(
  'ace@example.com',
  'Ace <b>Pilot</b>',
  'https://vector.test/verify-email#abc',
);

describe('resendMailer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the email to Resend with the API key', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await resendMailer({ apiKey: 're_test', from: 'Vector <hi@example.com>' }).send(message);

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ authorization: 'Bearer re_test' });
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'Vector <hi@example.com>',
      to: ['ace@example.com'],
      subject: 'Verify your email for Vector',
    });
  });

  it('fails when Resend refuses the email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad from', { status: 422 })));
    await expect(
      resendMailer({ apiKey: 're_test', from: 'x <x@x.x>' }).send(message),
    ).rejects.toThrow(/422.*bad from/);
  });
});

describe('messages', () => {
  it('escapes names in the HTML and keeps the link in the text', () => {
    expect(message.html).toContain('Ace &lt;b&gt;Pilot&lt;/b&gt;');
    expect(message.html).not.toContain('<b>Pilot');
    expect(message.text).toContain('Verify my email: https://vector.test/verify-email#abc');
  });
});
