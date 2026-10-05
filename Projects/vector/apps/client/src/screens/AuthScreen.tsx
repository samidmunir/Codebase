import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiRequestError } from '../api/api-client';
import { auth } from '../auth/auth-store';
import { AuthLayout } from '../components/auth/AuthLayout';
import { InviteField } from '../components/auth/InviteField';
import { PasswordField } from '../components/auth/PasswordField';
import { WaitlistForm } from '../components/auth/WaitlistForm';
import { HandleField } from '../components/HandleField';
import { usePageMeta } from '../site/page-meta';
import { useSiteStatus } from '../site/site-status';
import './auth-screen.css';

type Mode = 'login' | 'register';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; busy: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to pick up your scope where you left it.',
    submit: 'Sign in',
    busy: 'Signing in',
  },
  register: {
    title: 'Take the frequency',
    subtitle: 'One account for your settings, saved sessions, career and the records.',
    submit: 'Create account',
    busy: 'Creating your account',
  },
};

/** A different airspace behind each page. */
const AIRSPACE: Record<Mode, string> = { login: 'chicago', register: 'dallas' };

export function AuthScreen({ mode }: { mode: Mode }) {
  usePageMeta({ title: mode === 'login' ? 'Sign in' : 'Create an account' });
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') ?? '');
  // On the invite-only page: asking for an invite instead.
  const [waitlist, setWaitlist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fields, setFields] = useState<Record<string, string>>({});
  const copy = COPY[mode];
  const site = useSiteStatus();
  const closed = mode === 'register' && site.registrationMode === 'closed';
  const inviteOnly = mode === 'register' && site.registrationMode === 'invite';
  const next = searchParams.get('next');
  const withNext = (path: string) => `${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFields({});
    try {
      if (mode === 'login') await auth.login(email, password);
      else
        await auth.register(
          email,
          password,
          displayName,
          handle,
          inviteOnly ? inviteCode.trim().toUpperCase() : undefined,
        );
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(
          caught.fields &&
            Object.keys(caught.fields).length > 0 &&
            !['email_taken', 'handle_taken', 'invite_required'].includes(caught.code)
            ? 'Check the highlighted fields.'
            : caught.message,
        );
        setFields(caught.fields);
      } else {
        setError('Could not reach the server. Check your connection and try again.');
      }
      setBusy(false);
    }
  };

  const field = (name: string) =>
    fields[name] ? (
      <span className="auth-field__error" id={`${name}-error`}>
        {fields[name]}
      </span>
    ) : null;

  const emailField = (
    <label className="auth-field">
      <span>Email</span>
      <input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        spellCheck={false}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={Boolean(fields.email)}
        aria-describedby={fields.email ? 'email-error' : undefined}
        required
        // The first thing to type on either page.
        autoFocus
      />
      {field('email')}
    </label>
  );

  return (
    <AuthLayout airspaceId={AIRSPACE[mode]}>
      <nav className="auth-tabs" aria-label="Account">
        <Link
          to={withNext('/login')}
          className="auth-tabs__tab"
          aria-current={mode === 'login' ? 'page' : undefined}
        >
          Sign in
        </Link>
        <Link
          to={withNext('/register')}
          className="auth-tabs__tab"
          aria-current={mode === 'register' ? 'page' : undefined}
        >
          Create account
        </Link>
      </nav>

      <h1 className="auth-card__title">{copy.title}</h1>
      <p className="auth-card__subtitle">
        {inviteOnly
          ? 'Vector is in a private beta: bring your invite code, or ask for one.'
          : copy.subtitle}
      </p>

      {closed ? (
        <>
          <div className="auth-closed" role="status">
            <strong>New accounts are paused.</strong>
            <p>
              {site.registrationMessage ||
                'We’re not creating new accounts right now. Check back soon.'}
            </p>
            <p>
              Already have one? <Link to={withNext('/login')}>Sign in</Link>.
            </p>
          </div>
          {site.beta && <WaitlistForm />}
        </>
      ) : inviteOnly && waitlist ? (
        <>
          <WaitlistForm />
          <p className="auth-beta-switch">
            Got a code after all?{' '}
            <button type="button" onClick={() => setWaitlist(false)}>
              Use your invite
            </button>
          </p>
        </>
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
          {mode === 'login' ? (
            <>
              {emailField}
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                error={fields.password}
                labelAside={
                  <Link to="/forgot-password" className="auth-field__aside">
                    Forgot password?
                  </Link>
                }
              />
            </>
          ) : (
            <>
              {inviteOnly && (
                <fieldset className="auth-group">
                  <legend>Your invite</legend>
                  <InviteField
                    value={inviteCode}
                    onChange={setInviteCode}
                    error={fields.inviteCode}
                  />
                </fieldset>
              )}
              <fieldset className="auth-group">
                <legend>Signing in</legend>
                {emailField}
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  error={fields.password}
                  showStrength
                />
              </fieldset>
              <fieldset className="auth-group">
                <legend>How others see you</legend>
                <label className="auth-field">
                  <span>Display name</span>
                  <input
                    name="displayName"
                    autoComplete="nickname"
                    maxLength={40}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    aria-invalid={Boolean(fields.displayName)}
                    aria-describedby={fields.displayName ? 'displayName-error' : undefined}
                    required
                  />
                  {field('displayName')}
                </label>
                <HandleField value={handle} onChange={setHandle} error={fields.handle} />
                <div className="auth-preview" aria-label="How you’ll appear">
                  <span className="auth-preview__avatar" aria-hidden="true">
                    {(displayName.trim() || handle || '?')
                      .split(/\s+/)
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span>
                    <strong>{displayName.trim() || 'Your name'}</strong>
                    <span className="auth-preview__handle">@{handle.trim() || 'handle'}</span>
                  </span>
                  <span className="auth-preview__where">
                    on records, profiles and the community
                  </span>
                </div>
              </fieldset>
            </>
          )}

          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-form__submit" disabled={busy}>
            {busy && <span className="auth-form__spinner" aria-hidden="true" />}
            {busy ? `${copy.busy}…` : copy.submit}
          </button>

          {mode === 'register' && (
            <p className="auth-form__terms">
              By creating an account you agree to the <Link to="/terms">Terms</Link> and the{' '}
              <Link to="/privacy">Privacy policy</Link>. We’ll email you a link to verify your
              address.
            </p>
          )}
        </form>
      )}

      {inviteOnly && !waitlist && (
        <p className="auth-beta-switch">
          No invite yet?{' '}
          <button type="button" onClick={() => setWaitlist(true)}>
            Join the waitlist
          </button>
        </p>
      )}

      {!closed && (
        <p className="auth-card__switch">
          {mode === 'login' ? 'New to Vector?' : 'Already have an account?'}{' '}
          <Link to={withNext(mode === 'login' ? '/register' : '/login')}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
