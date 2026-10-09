import { useEffect, useState } from 'react';
import type { Release } from '@vector/shared';
import { getReleases } from '../../api/releases-api';
import {
  FeatureStatusChip,
  ReleaseStatusChip,
  VersionTrack,
} from '../../components/roadmap/ReleaseParts';
import { releaseTitle } from '../../components/roadmap/release-format';
import { usePublicPageMeta } from '../../site/page-meta';
import './roadmap-screen.css';

/** Every version of Vector: what's out, what's next, and what each brings. */
export function RoadmapScreen() {
  usePublicPageMeta('/roadmap');
  const [releases, setReleases] = useState<Release[]>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    getReleases()
      .then((list) => current && setReleases(list))
      .catch(() => current && setError(true));
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="site-page roadmap-page">
      <header className="roadmap-page__header">
        <p className="hero__eyebrow">Roadmap</p>
        <h1>Where Vector is going</h1>
        <p className="roadmap-page__lede">
          What each version brought, and what’s coming next. Tell us what you’d like with Send
          feedback in your account menu.
        </p>
      </header>
      {error ? (
        <p role="alert">Couldn’t load the roadmap. Try again in a moment.</p>
      ) : !releases ? (
        <p className="roadmap-page__muted">Loading…</p>
      ) : (
        <>
          <VersionTrack releases={releases} />
          <div className="roadmap-page__releases">
            {releases.map((release) => (
              <section
                key={release.id}
                className="roadmap-release"
                data-status={release.status}
                aria-label={releaseTitle(release)}
              >
                <header className="roadmap-release__header">
                  <h2>{releaseTitle(release)}</h2>
                  <ReleaseStatusChip release={release} />
                </header>
                {release.summary && <p className="roadmap-release__summary">{release.summary}</p>}
                <ul className="roadmap-release__features">
                  {release.features.map((feature) => (
                    <li key={feature.title}>
                      <div>
                        <strong>{feature.title}</strong>
                        {feature.description && <p>{feature.description}</p>}
                      </div>
                      <FeatureStatusChip status={feature.status} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
