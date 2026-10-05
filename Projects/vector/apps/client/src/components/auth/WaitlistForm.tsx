import { useState, type FormEvent } from 'react';
import { ApiRequestError } from '../../api/api-client';
import { joinWaitlist } from '../../api/beta-api';

/** Asks for an invite: an email address (and why they're keen), for the admins' waitlist. */
export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await joinWaitlist({ email, note });
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? (caught.fields.email ?? caught.message)
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="auth-waitlist auth-waitlist--done" role="status">
        <strong>You’re on the list.</strong>
        <p>We’ll email {email.trim()} an invite when there’s a seat on the frequency.</p>
      </div>
    );

  return (
    <form
      className="auth-waitlist"
      aria-label="Join the waitlist"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <strong>Join the waitlist</strong>
      <p>Leave your email and we’ll send you an invite as places open up.</p>
      <label className="auth-field">
        <span>Email</span>
        <input
          name="waitlistEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          required
        />
      </label>
      <label className="auth-field">
        <span>
          What brings you to Vector? <span className="auth-field__hint">(optional)</span>
        </span>
        <textarea
          name="waitlistNote"
          rows={2}
          maxLength={500}
          placeholder="I fly on VATSIM, I’m a student controller…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="auth-form__submit" disabled={busy}>
        {busy && <span className="auth-form__spinner" aria-hidden="true" />}
        {busy ? 'Adding you…' : 'Ask for an invite'}
      </button>
    </form>
  );
}
