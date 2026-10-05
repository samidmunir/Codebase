import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { PASSWORD_MIN_LENGTH } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import {
  confirmEmailChange,
  forgotPassword,
  linkToken,
  resetPassword,
  undoEmailChange,
  verifyEmail,
} from '../../api/email-api';
import { auth, useAuth } from '../../auth/auth-store';
import { usePageMeta } from '../../site/page-meta';
import '../auth-screen.css';
import '../home-screen.css';

// The pages emailed links open, and asking for a password reset. Tokens are in the
// URL fragment: read once, then removed from the address bar.

const OFFLINE = 'Could not reach the server. Check your connection and try again.';
const message = (caught: unknown) => (caught instanceof ApiRequestError ? caught.message : OFFLINE);

function FocusCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>
      <section className="hero auth-card">
        <p className="hero__eyebrow">Vector</p>
        <h1 className="auth-card__title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

/** The link's token, taken from the address bar once. */
function useLinkToken(): string {
  const [token] = useState(() => linkToken(window.location.hash));
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  return token;
}

export function ForgotPasswordScreen() {
  usePageMeta({ title: 'Forgot your password' });
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError && caught.fields.email
          ? caught.fields.email
          : message(caught),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FocusCard title={sent ? 'Check your email' : 'Forgot your password?'}>
      {sent ? (
        <>
          <p className="hero__subtitle">
            If an account uses <strong>{email}</strong>, we’ve sent it a link to choose a new
            password. The link works for an hour.
          </p>
          <p className="auth-card__switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </>
      ) : (
        <>
          <p className="hero__subtitle">Enter your email and we’ll send you a link to reset it.</p>
          <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
            <label className="auth-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {error && (
              <p className="auth-form__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="auth-form__submit" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send the link'}
            </button>
          </form>
          <p className="auth-card__switch">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </>
      )}
    </FocusCard>
  );
}

export function ResetPasswordScreen() {
  usePageMeta({ title: 'Choose a new password' });
  const token = useLinkToken();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'form' | 'busy' | 'done'>('form');
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState('busy');
    setError(undefined);
    try {
      await resetPassword(token, password);
      // Every sign-in has ended, this one too.
      if (auth.get().status === 'signedIn') auth.signedOutLocally();
      setState('done');
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError && caught.fields.password
          ? caught.fields.password
          : message(caught),
      );
      setState('form');
    }
  };

  if (state === 'done')
    return (
      <FocusCard title="Password changed">
        <p className="hero__subtitle">You’ve been signed out everywhere. Sign in with it now.</p>
        <Link to="/login" className="auth-form__submit auth-card__action">
          Sign in
        </Link>
      </FocusCard>
    );

  if (!token)
    return (
      <FocusCard title="This link is incomplete">
        <p className="hero__subtitle">Copy the whole link from the email, or ask for a new one.</p>
        <p className="auth-card__switch">
          <Link to="/forgot-password">Send a new link</Link>
        </p>
      </FocusCard>
    );

  return (
    <FocusCard title="Choose a new password">
      <p className="hero__subtitle">It signs you out on every device.</p>
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <label className="auth-field">
          <span>New password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <span className="auth-field__hint">At least {PASSWORD_MIN_LENGTH} characters</span>
        </label>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}{' '}
            {error.includes('expired') && <Link to="/forgot-password">Send a new link</Link>}
          </p>
        )}
        <button
          type="submit"
          className="auth-form__submit"
          disabled={state === 'busy' || password.length < PASSWORD_MIN_LENGTH}
        >
          {state === 'busy' ? 'Saving…' : 'Save the new password'}
        </button>
      </form>
    </FocusCard>
  );
}

type LinkKind = 'verify' | 'confirm' | 'undo';

const LINKS: Record<
  LinkKind,
  {
    title: string;
    working: string;
    done: string;
    open: (token: string) => Promise<void>;
  }
> = {
  verify: {
    title: 'Verify your email',
    working: 'Verifying your email…',
    done: 'Your email is verified. Your verified sessions can go on the records now.',
    open: verifyEmail,
  },
  confirm: {
    title: 'Confirm your new email',
    working: 'Confirming your new email…',
    done: 'Your account uses your new email now.',
    open: confirmEmailChange,
  },
  undo: {
    title: 'Undo the email change',
    working: 'Moving your account back…',
    done: 'Your account is back on this email, and signed out everywhere. Reset your password now, in case someone else knows it.',
    open: undoEmailChange,
  },
};

/** Each link is opened once, even if the page renders twice. */
const opened = new Map<string, Promise<void>>();

/** Opens a verify, confirm or undo link as soon as the page loads. */
export function EmailLinkScreen({ kind }: { kind: LinkKind }) {
  const copy = LINKS[kind];
  usePageMeta({ title: copy.title });
  const token = useLinkToken();
  const signedIn = useAuth().status === 'signedIn';
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | undefined>(
    token
      ? undefined
      : { ok: false, error: 'This link is incomplete. Copy the whole link from the email.' },
  );

  useEffect(() => {
    if (!token) return;
    let attempt = opened.get(token);
    if (!attempt) {
      attempt = copy.open(token);
      opened.set(token, attempt);
    }
    let cancelled = false;
    attempt
      .then(async () => {
        if (kind === 'undo') {
          if (auth.get().status === 'signedIn') auth.signedOutLocally();
        } else await auth.reload().catch(() => undefined);
        if (!cancelled) setResult({ ok: true });
      })
      .catch((caught: unknown) => !cancelled && setResult({ ok: false, error: message(caught) }));
    return () => {
      cancelled = true;
    };
  }, [token, copy, kind]);

  return (
    <FocusCard title={result?.ok === false ? 'That didn’t work' : copy.title}>
      <p className="hero__subtitle" role="status">
        {!result ? copy.working : result.ok ? copy.done : result.error}
      </p>
      {result?.ok && kind === 'undo' && (
        <Link to="/forgot-password" className="auth-form__submit auth-card__action">
          Reset my password
        </Link>
      )}
      {result && kind !== 'undo' && (
        <Link
          to={signedIn ? (result.ok ? '/play' : '/account') : '/login'}
          className="auth-form__submit auth-card__action"
        >
          {signedIn ? (result.ok ? 'Play' : 'Go to your account') : 'Sign in'}
        </Link>
      )}
      {result?.ok === false && signedIn && kind === 'verify' && (
        <p className="auth-card__switch">You can send a new link from your account page.</p>
      )}
    </FocusCard>
  );
}
