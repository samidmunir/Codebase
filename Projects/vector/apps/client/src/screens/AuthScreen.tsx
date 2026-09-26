import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PASSWORD_MIN_LENGTH } from '@vector/shared';
import { ApiRequestError } from '../api/api-client';
import { auth } from '../auth/auth-store';
import './auth-screen.css';
import './home-screen.css';

type Mode = 'login' | 'register';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; busy: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to open your scope.',
    submit: 'Sign in',
    busy: 'Signing in',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Your settings and saved sessions follow you everywhere.',
    submit: 'Create account',
    busy: 'Creating account',
  },
};

export function AuthScreen({ mode }: { mode: Mode }) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fields, setFields] = useState<Record<string, string>>({});
  const copy = COPY[mode];
  const next = searchParams.get('next');
  const switchTo = `${mode === 'login' ? '/register' : '/login'}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setFields({});
    try {
      if (mode === 'login') await auth.login(email, password);
      else await auth.register(email, password, displayName);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(
          caught.fields && Object.keys(caught.fields).length > 0 && caught.code !== 'email_taken'
            ? undefined
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

  return (
    <main className="shell">
      <div className="scope-backdrop" aria-hidden="true">
        <div className="scope-backdrop__rings" />
        <div className="scope-backdrop__sweep" />
      </div>

      <section className="hero auth-card">
        <p className="hero__eyebrow">Vector</p>
        <h1 className="auth-card__title">{copy.title}</h1>
        <p className="hero__subtitle">{copy.subtitle}</p>

        <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
          {mode === 'register' && (
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
          )}
          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fields.email)}
              aria-describedby={fields.email ? 'email-error' : undefined}
              required
            />
            {field('email')}
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fields.password)}
              aria-describedby={fields.password ? 'password-error' : undefined}
              required
            />
            {mode === 'register' && !fields.password && (
              <span className="auth-field__hint">At least {PASSWORD_MIN_LENGTH} characters</span>
            )}
            {field('password')}
          </label>

          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-form__submit" disabled={busy}>
            {busy ? `${copy.busy}…` : copy.submit}
          </button>
        </form>

        <p className="auth-card__switch">
          {mode === 'login' ? 'New to Vector?' : 'Already have an account?'}{' '}
          <Link to={switchTo}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Link>
        </p>
      </section>
    </main>
  );
}
