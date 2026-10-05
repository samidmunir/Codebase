import { PASSWORD_MIN_LENGTH } from '@vector/shared';

// How strong a new password looks, judged only by its length and the kinds of
// character in it, plus a short list of passwords everyone tries first. A guide
// for the pilot; the server's only rule is the minimum length.

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'qwerty123',
  'iloveyou',
  'letmein1',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'abc12345',
  'vector123',
  'airplane',
  'controller',
]);

export function passwordStrength(password: string): Strength {
  if (password.length === 0) return { score: 0, label: '' };
  if (password.length < PASSWORD_MIN_LENGTH)
    return { score: 0, label: `${PASSWORD_MIN_LENGTH - password.length} more characters` };
  if (COMMON.has(password.toLowerCase())) return { score: 1, label: 'Very common: pick another' };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  const long = password.length >= 16 ? 2 : password.length >= 12 ? 1 : 0;
  const score = Math.min(4, Math.max(1, long + kinds - 1)) as Strength['score'];
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score]! };
}
