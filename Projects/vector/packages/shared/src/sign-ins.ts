import { z } from 'zod';

// Sign-ins (one per device), as the pilot and admins see them.

export const signInSchema = z.object({
  /** The sign-in (its first token's id); stays the same as the token refreshes. */
  id: z.uuid(),
  /** "Firefox on macOS", or "Unknown device". */
  device: z.string(),
  ip: z.string().nullable(),
  signedInAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
  /** The device asking (only in the pilot's own list). */
  current: z.boolean(),
});
export type SignIn = z.infer<typeof signInSchema>;

export const signInListSchema = z.object({ signIns: z.array(signInSchema) });
export type SignInList = z.infer<typeof signInListSchema>;

const BROWSERS: [RegExp, string][] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\b(?:OPR|Opera)\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS|Chromium)\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/\biPhone\b/, 'iOS'],
  [/\biPad\b/, 'iPadOS'],
  [/\bAndroid\b/, 'Android'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bWindows\b/, 'Windows'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bLinux\b/, 'Linux'],
];

/** A browser's User-Agent as a person would say it: "Firefox on macOS". */
export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? 'Unknown device';
}
