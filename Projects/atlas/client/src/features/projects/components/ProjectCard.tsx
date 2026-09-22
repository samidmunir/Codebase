import type { Project } from "../types/project.types";
import { Link } from "react-router-dom";

interface ProjectCardProps {
  project: Project;
}

function formatStatus(status: Project["status"]): string {
  switch (status) {
    case "on_hold":
      return "On Hold";

    case "planning":
      return "Planning";

    case "active":
      return "Active";

    case "completed":
      return "Completed";
  }
}

function formatPriority(priority: Project["priority"]): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(date: string | null): string {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="project-card">
      <div className="project-card__top">
        <span className={`project-status project-status--${project.status}`}>
          {formatStatus(project.status)}
        </span>

        <span
          className={`project-priority project-priority--${project.priority}`}
        >
          {formatPriority(project.priority)}
        </span>
      </div>

      <div className="project-card__content">
        <h2>{project.name}</h2>

        <p className="project-card__description">
          {project.description || "No description provided."}
        </p>
      </div>

      <div className="project-card__dates">
        <div>
          <span>Start</span>
          <strong>{formatDate(project.startDate)}</strong>
        </div>

        <div>
          <span>Target</span>
          <strong>{formatDate(project.targetDate)}</strong>
        </div>
      </div>

      <footer className="project-card__footer">
        <span>Updated {formatDate(project.updatedAt)}</span>

        <Link to={`/projects/${project.id}`} className="project-card__view">
          View project
          <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  );
}
