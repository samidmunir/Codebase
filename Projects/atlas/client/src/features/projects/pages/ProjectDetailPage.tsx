import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { archiveProject, getProject, restoreProject } from "../api/projectsApi";
import type { Project } from "../types/project.types";

import EditProjectModal from "../components/EditProjectModal";

import "../styles/projects.css";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: Project["status"]): string {
  switch (status) {
    case "planning":
      return "Planning";

    case "active":
      return "Active";

    case "on_hold":
      return "On Hold";

    case "completed":
      return "Completed";
  }
}

function formatPriority(priority: Project["priority"]): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const [project, setProject] = useState<Project | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isLifecycleUpdating, setIsLifecycleUpdating] = useState(false);

  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!projectId) {
        setError("Project ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await getProject(projectId);

        if (!cancelled) {
          setProject(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load project:", err);

          setError(
            err instanceof Error ? err.message : "Unable to load project.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId, retryCount]);

  async function handleArchive() {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Archive "${project.name}"? You can restore it later.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsLifecycleUpdating(true);
      setLifecycleError(null);

      await archiveProject(project.id);

      const updatedProject = await getProject(project.id);

      setProject(updatedProject);
    } catch (err) {
      console.error("Failed to archive project:", err);

      setLifecycleError(
        err instanceof Error ? err.message : "Unable to archive project.",
      );
    } finally {
      setIsLifecycleUpdating(false);
    }
  }

  async function handleRestore() {
    if (!project) {
      return;
    }

    try {
      setIsLifecycleUpdating(true);
      setLifecycleError(null);

      await restoreProject(project.id);

      const updatedProject = await getProject(project.id);

      setProject(updatedProject);
    } catch (err) {
      console.error("Failed to restore project:", err);

      setLifecycleError(
        err instanceof Error ? err.message : "Unable to restore project.",
      );
    } finally {
      setIsLifecycleUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <section className="project-detail-page">
        <div className="project-detail-skeleton">
          <div className="project-skeleton project-skeleton--badge" />

          <div className="project-skeleton project-detail-skeleton__title" />

          <div className="project-skeleton project-skeleton--line" />
          <div className="project-skeleton project-skeleton--line" />
          <div className="project-skeleton project-skeleton--line-short" />
        </div>
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className="project-detail-page">
        <Link to="/projects" className="project-detail-back">
          ← Back to Projects
        </Link>

        <div className="projects-state projects-state--error">
          <div className="projects-state__icon">!</div>

          <h2>Unable to load project</h2>

          <p>{error ?? "The requested project could not be found."}</p>

          <button
            type="button"
            className="projects-secondary-button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="project-detail-page">
      <Link to="/projects" className="project-detail-back">
        ← Back to Projects
      </Link>

      <header className="project-detail-header">
        <div className="project-detail-header__content">
          <div className="project-detail-badges">
            <span
              className={`project-status project-status--${project.status}`}
            >
              {formatStatus(project.status)}
            </span>

            <span
              className={`project-priority project-priority--${project.priority}`}
            >
              {formatPriority(project.priority)}
            </span>

            {project.archivedAt && (
              <span className="project-archived-badge">Archived</span>
            )}
          </div>

          <h1>{project.name}</h1>

          <p>
            {project.description ||
              "No description has been added to this project."}
          </p>
        </div>

        <div className="project-detail-actions">
          {!project.archivedAt && (
            <button
              type="button"
              className="projects-secondary-button"
              disabled={isLifecycleUpdating}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Project
            </button>
          )}

          {project.archivedAt ? (
            <button
              type="button"
              className="projects-create-button"
              disabled={isLifecycleUpdating}
              onClick={() => {
                void handleRestore();
              }}
            >
              {isLifecycleUpdating ? "Restoring..." : "Restore Project"}
            </button>
          ) : (
            <button
              type="button"
              className="project-archive-button"
              disabled={isLifecycleUpdating}
              onClick={() => {
                void handleArchive();
              }}
            >
              {isLifecycleUpdating ? "Archiving..." : "Archive Project"}
            </button>
          )}
        </div>
      </header>

      {lifecycleError && (
        <div className="project-lifecycle-error" role="alert">
          <span>{lifecycleError}</span>

          <button
            type="button"
            onClick={() => setLifecycleError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="project-detail-grid">
        <article className="project-detail-panel">
          <div className="project-detail-panel__header">
            <div>
              <span className="projects-eyebrow">Timeline</span>

              <h2>Project schedule</h2>
            </div>
          </div>

          <div className="project-detail-metadata">
            <div className="project-detail-field">
              <span>Start date</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>

            <div className="project-detail-field">
              <span>Target date</span>
              <strong>{formatDate(project.targetDate)}</strong>
            </div>

            <div className="project-detail-field">
              <span>Completed</span>
              <strong>
                {project.completedAt
                  ? formatTimestamp(project.completedAt)
                  : "Not completed"}
              </strong>
            </div>
          </div>
        </article>

        <article className="project-detail-panel">
          <div className="project-detail-panel__header">
            <div>
              <span className="projects-eyebrow">Activity</span>

              <h2>Project information</h2>
            </div>
          </div>

          <div className="project-detail-metadata">
            <div className="project-detail-field">
              <span>Created</span>
              <strong>{formatTimestamp(project.createdAt)}</strong>
            </div>

            <div className="project-detail-field">
              <span>Last updated</span>
              <strong>{formatTimestamp(project.updatedAt)}</strong>
            </div>

            <div className="project-detail-field">
              <span>Project ID</span>

              <code>{project.id}</code>
            </div>
          </div>
        </article>
      </div>
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(updatedProject) => {
            setProject(updatedProject);
            setIsEditModalOpen(false);
          }}
        />
      )}
    </section>
  );
}
