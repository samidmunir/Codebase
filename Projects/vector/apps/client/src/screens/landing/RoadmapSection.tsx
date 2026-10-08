import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { currentAndNext, type Release } from '@vector/shared';
import { getReleases } from '../../api/releases-api';
import { FeatureStatusChip, VersionTrack } from '../../components/roadmap/ReleaseParts';

/** What the next version of Vector brings (from the releases admins keep). */
export function RoadmapSection() {
  const [releases, setReleases] = useState<Release[]>();

  useEffect(() => {
    let current = true;
    getReleases()
      .then((list) => current && setReleases(list))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  const next = releases && currentAndNext(releases).next;
  if (!releases || !next) return null;

  return (
    <section className="landing-section landing-roadmap" aria-labelledby="roadmap-title">
      <p className="hero__eyebrow" data-reveal>
        Roadmap
      </p>
      <div className="landing-roadmap__head" data-reveal>
        <div>
          <h2 id="roadmap-title" className="landing-section__title">
            Coming in v{next.version}
            {next.name && <span className="landing-roadmap__name"> · {next.name}</span>}
          </h2>
          {next.summary && <p className="landing-roadmap__summary">{next.summary}</p>}
        </div>
        <VersionTrack releases={releases} />
      </div>
      <div className="landing-features">
        {next.features.map((feature, index) => (
          <article
            key={feature.title}
            className="landing-feature landing-roadmap__feature"
            data-reveal
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <FeatureStatusChip status={feature.status} />
            <h3>{feature.title}</h3>
            {feature.description && <p>{feature.description}</p>}
          </article>
        ))}
      </div>
      <p className="landing-roadmap__more" data-reveal>
        <Link to="/roadmap">See the whole roadmap →</Link>
      </p>
    </section>
  );
}
