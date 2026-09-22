export default function ProjectCardSkeleton() {
  return (
    <article className="project-card project-card--skeleton" aria-hidden="true">
      <div className="project-skeleton__top">
        <div className="project-skeleton project-skeleton--badge" />
        <div className="project-skeleton project-skeleton--badge-small" />
      </div>

      <div className="project-skeleton__content">
        <div className="project-skeleton project-skeleton--title" />
        <div className="project-skeleton project-skeleton--line" />
        <div className="project-skeleton project-skeleton--line" />
        <div className="project-skeleton project-skeleton--line-short" />
      </div>

      <div className="project-skeleton__dates">
        <div>
          <div className="project-skeleton project-skeleton--label" />
          <div className="project-skeleton project-skeleton--date" />
        </div>

        <div>
          <div className="project-skeleton project-skeleton--label" />
          <div className="project-skeleton project-skeleton--date" />
        </div>
      </div>
    </article>
  );
}
