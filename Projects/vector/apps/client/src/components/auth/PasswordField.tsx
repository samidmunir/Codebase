import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { passwordStrength } from './password-strength';

/**
 * A password input with a show/hide button, a Caps Lock warning, and (for a new
 * password) how strong it looks.
 */
export function PasswordField({
  label = 'Password',
  value,
  onChange,
  autoComplete,
  error,
  showStrength = false,
  labelAside,
  name = 'password',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string | undefined;
  showStrength?: boolean;
  /** Shown beside the label, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  name?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  // An error says what's wrong instead of the strength hint.
  const strength = showStrength && !error ? passwordStrength(value) : undefined;
  const checkCaps = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);
  const notes = [error && `${id}-error`, capsLock && `${id}-caps`, strength && `${id}-strength`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="auth-field">
      <div className="auth-field__label-row">
        <label htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      <div className="auth-password">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCapsLock(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={notes || undefined}
          spellCheck={false}
          required
        />
        <button
          type="button"
          className="auth-password__toggle"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {capsLock && (
        <span className="auth-field__warning" id={`${id}-caps`}>
          Caps Lock is on
        </span>
      )}
      {strength && (
        <div className="auth-strength" id={`${id}-strength`} data-score={strength.score}>
          <span className="auth-strength__bar" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span key={step} data-on={strength.score >= step || undefined} />
            ))}
          </span>
          <span className="auth-strength__label">
            {strength.label || 'At least 8 characters. A few words make a strong one.'}
          </span>
        </div>
      )}
      {error && (
        <span className="auth-field__error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
