import { z } from 'zod';

// Releases: what each version of Vector brought, and what the next one will. Admins
// edit them (Admin → Releases); the landing page and /roadmap show them.

/** Released: out now. Next: being built. Planned: after that. */
export const RELEASE_STATUSES = ['released', 'next', 'planned'] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const FEATURE_STATUSES = ['planned', 'in_progress', 'shipped'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

/** 0.2, 0.2.1, 1.0 */
export const versionSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/, 'Use a version like 0.2 or 0.2.1');

export const releaseFeatureSchema = z.object({
  title: z.string().trim().min(1, 'Give the feature a title').max(80),
  description: z.string().trim().max(300).default(''),
  status: z.enum(FEATURE_STATUSES).default('planned'),
});
export type ReleaseFeature = z.infer<typeof releaseFeatureSchema>;

export const releaseSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  /** A name for it, e.g. "The beta" (optional). */
  name: z.string(),
  summary: z.string(),
  status: z.enum(RELEASE_STATUSES),
  /** The day it came out (YYYY-MM-DD), once released. */
  releasedOn: z.string().nullable(),
  features: z.array(releaseFeatureSchema),
  updatedAt: z.iso.datetime(),
});
export type Release = z.infer<typeof releaseSchema>;

/** Newest version first. */
export const releaseListSchema = z.object({ releases: z.array(releaseSchema) });
export type ReleaseList = z.infer<typeof releaseListSchema>;

export const releaseRequestSchema = z
  .object({
    version: versionSchema,
    name: z.string().trim().max(60).default(''),
    summary: z.string().trim().max(400).default(''),
    status: z.enum(RELEASE_STATUSES),
    releasedOn: z.iso.date().nullable().default(null),
    features: z.array(releaseFeatureSchema).max(20).default([]),
  })
  .refine((release) => release.status !== 'released' || release.releasedOn !== null, {
    message: 'A released version needs its release date',
    path: ['releasedOn'],
  });
export type ReleaseRequest = z.input<typeof releaseRequestSchema>;

/** Sorts versions numerically, newest first (0.10 after 0.9). */
export function compareVersionsDesc(a: string, b: string): number {
  const parts = (version: string) => version.split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const difference = (y[i] ?? 0) - (x[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** What's out now (the newest released version) and what's coming next (the soonest next one). */
export function currentAndNext(releases: Release[]): {
  current: Release | undefined;
  next: Release | undefined;
} {
  const sorted = [...releases].sort((a, b) => compareVersionsDesc(a.version, b.version));
  return {
    current: sorted.find((release) => release.status === 'released'),
    next: sorted.filter((release) => release.status === 'next').at(-1),
  };
}
