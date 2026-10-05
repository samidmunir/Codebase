import { useEffect, useState } from 'react';
import type { InviteCheck } from '@vector/shared';
import { checkInvite } from '../../api/beta-api';

/** How long typing pauses before the code is checked. */
const CHECK_DELAY_MS = 400;

/** The invite code on the registration page, checked as it's typed. */
export function InviteField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
}) {
  const [check, setCheck] = useState<InviteCheck & { code: string }>();
  const code = value.trim().toUpperCase();

  useEffect(() => {
    if (code.length < 6) return;
    let current = true;
    const timer = setTimeout(() => {
      checkInvite(code)
        .then((result) => current && setCheck({ code, ...result }))
        .catch(() => undefined);
    }, CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [code]);

  // Only what's known about the code as it's typed now.
  const known = check?.code === code ? check : undefined;
  const problem = error ?? (known && !known.valid ? known.reason : undefined);

  return (
    <label className="auth-field">
      <span>Invite code</span>
      <input
        name="inviteCode"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={40}
        placeholder="VEC-XXXX-XXXX"
        className="auth-invite__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(problem)}
        aria-describedby="inviteCode-status"
        required
      />
      {problem ? (
        <span className="auth-field__error" id="inviteCode-status">
          {problem}
        </span>
      ) : known?.valid ? (
        <span className="auth-field__ok" id="inviteCode-status">
          ✓ That code works
        </span>
      ) : (
        <span className="auth-field__hint" id="inviteCode-status">
          Vector is in a private beta. Your invite came with a code.
        </span>
      )}
    </label>
  );
}
