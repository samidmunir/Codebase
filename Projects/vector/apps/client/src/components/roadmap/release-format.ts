import type { Release } from '@vector/shared';
import { formatDate } from '../../format/dates';

/** "v0.2", "v0.1 · The beta". */
export const releaseTitle = (release: Release) =>
  `v${release.version}${release.name ? ` · ${release.name}` : ''}`;

/** "5 Oct 2026" from 2026-10-05. */
export const releaseDate = (day: string) => formatDate(`${day}T12:00:00Z`);
