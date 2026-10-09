import type { FeatureStatus, Release, ReleaseStatus } from '@vector/shared';
import { releaseDate } from './release-format';
import './roadmap.css';

const FEATURE_LABEL: Record<FeatureStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
};

const RELEASE_LABEL: Record<ReleaseStatus, string> = {
  released: 'Out now',
  next: 'Next',
  planned: 'Planned',
};

export function FeatureStatusChip({ status }: { status: FeatureStatus }) {
  return (
    <span className="feature-status" data-status={status}>
      {status === 'shipped' && <span aria-hidden="true">✓ </span>}
      {FEATURE_LABEL[status]}
    </span>
  );
}

export function ReleaseStatusChip({ release }: { release: Release }) {
  return (
    <span className="release-status" data-status={release.status}>
      {release.status === 'released' && release.releasedOn
        ? `${RELEASE_LABEL.released} · ${releaseDate(release.releasedOn)}`
        : RELEASE_LABEL[release.status]}
    </span>
  );
}

/**
 * The versions along a line: out (filled), next (pulsing), planned (dimmed), oldest
 * on the left. Shows the latest released one and everything after it.
 */
export function VersionTrack({ releases }: { releases: Release[] }) {
  const oldestFirst = [...releases].reverse();
  const lastOut = oldestFirst.findLastIndex((release) => release.status === 'released');
  const shown = oldestFirst.slice(Math.max(0, lastOut));
  if (shown.length === 0) return null;
  return (
    <ol className="version-track" aria-label="Versions">
      {shown.map((release) => (
        <li key={release.id} data-status={release.status}>
          <span className="version-track__dot" aria-hidden="true" />
          <span className="version-track__version">v{release.version}</span>
          <span className="version-track__label">
            {release.status === 'released'
              ? `Out now${release.releasedOn ? ` · ${releaseDate(release.releasedOn)}` : ''}`
              : release.status === 'next'
                ? 'Next'
                : 'Later'}
          </span>
        </li>
      ))}
    </ol>
  );
}
