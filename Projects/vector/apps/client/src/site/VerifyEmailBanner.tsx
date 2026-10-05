import { useState } from 'react';
import type { AuthUser } from '@vector/shared';
import { ApiRequestError } from '../api/api-client';
import { sendVerificationEmail } from '../api/email-api';

/** Asks a pilot who hasn't verified their email to, with a button to send the link again. */
export function VerifyEmailBanner({ user }: { user: AuthUser }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | undefined>(undefined);

  const send = async () => {
    setState('sending');
    setError(undefined);
    try {
      await sendVerificationEmail();
      setState('sent');
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Couldn’t reach the server.');
      setState('idle');
    }
  };

  return (
    <div className="site-banner" role="status">
      <span>
        {state === 'sent' ? (
          <>
            Sent. Open the link we emailed to <strong>{user.email}</strong>.
          </>
        ) : (
          <>
            Verify your email to go on the records: open the link we sent to{' '}
            <strong>{user.email}</strong>.
          </>
        )}
        {error && <> {error}</>}
      </span>
      {state !== 'sent' && (
        <button
          type="button"
          className="site-button"
          disabled={state === 'sending'}
          onClick={() => void send()}
        >
          {state === 'sending' ? 'Sending…' : 'Send it again'}
        </button>
      )}
    </div>
  );
}
