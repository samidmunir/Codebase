import { HANDLE_MAX_LENGTH } from '@vector/shared';
import { useHandleAvailability } from './use-handle-availability';

/** A handle input with its availability shown under it. */
export function HandleField({
  value,
  onChange,
  current,
  error,
  className = 'auth-field',
  hintClassName = 'auth-field__hint',
  errorClassName = 'auth-field__error',
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  current?: string;
  error?: string | undefined;
  className?: string;
  hintClassName?: string;
  errorClassName?: string;
  inputClassName?: string;
}) {
  const availability = useHandleAvailability(value, current);
  const message =
    error ?? (availability && !availability.available ? availability.reason : undefined);
  return (
    <label className={className}>
      <span>Handle</span>
      <input
        name="handle"
        className={inputClassName}
        autoComplete="username"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={HANDLE_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(message)}
        aria-describedby="handle-status"
        required
      />
      {message ? (
        <span className={errorClassName} id="handle-status">
          {message}
        </span>
      ) : (
        <span className={hintClassName} id="handle-status">
          {availability?.available
            ? `✓ ${availability.handle} is free`
            : 'Your public name on profiles, records and the forum: letters, numbers and _'}
        </span>
      )}
    </label>
  );
}
