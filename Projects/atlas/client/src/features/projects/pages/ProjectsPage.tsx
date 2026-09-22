import { useEffect, useRef, useState } from "react";

import { getProjects } from "../api/projectsApi";
import ProjectCard from "../components/ProjectCard";
import ProjectCardSkeleton from "../components/ProjectCardSkeleton";
import ProjectToolBar from "../components/ProjectToolbar";
import type { Project, ProjectListFilters } from "../types/project.types";
import { useDebounce } from "../../../hooks/useDebounce";
import CreateProjectModal from "../components/CreateProjectModal";

import "../styles/projects.css";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isRefetching, setIsRefetching] = useState(false);

  const [retryCount, setRetryCount] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProjectListFilters>({
    archived: false,
    sort: "updatedAt",
    order: "desc",
  });

  const debouncedSearch = useDebounce(filters.search ?? "", 350);

  const hasLoadedOnce = useRef(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      const isInitialRequest = !hasLoadedOnce.current;

      try {
        if (!isInitialRequest) {
          setIsRefetching(true);
        }

        setError(null);

        const requestFilters: ProjectListFilters = {
          status: filters.status,
          priority: filters.priority,
          archived: filters.archived,
          sort: filters.sort,
          order: filters.order,
          search: debouncedSearch,
        };

        const data = await getProjects(requestFilters);

        if (!cancelled) {
          setProjects(data);
          hasLoadedOnce.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load projects:", err);

          setError(
            err instanceof Error ? err.message : "Unable to load projects.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
          setIsRefetching(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [
    filters.status,
    filters.priority,
    filters.archived,
    filters.sort,
    filters.order,
    debouncedSearch,
    retryCount,
  ]);

  const hasActiveFilters =
    Boolean(filters.search?.trim()) ||
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    filters.archived === true ||
    filters.sort !== "updatedAt" ||
    filters.order !== "desc";

  function clearFilters() {
    setFilters({
      archived: false,
      sort: "updatedAt",
      order: "desc",
    });
  }

  function retryLoad() {
    setRetryCount((count) => count + 1);
  }

  return (
    <section className="projects-page">
      <header className="projects-header">
        <div>
          <span className="projects-eyebrow">Workspace</span>

          <h1>Projects</h1>

          <p>
            Organize meaningful work, track progress, and keep your priorities
            moving forward.
          </p>
        </div>

        <button
          className="projects-create-button"
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <span>+</span>
          New Project
        </button>
      </header>

      <ProjectToolBar filters={filters} onChange={setFilters} />

      <div className="projects-results-header">
        <div className="projects-summary">
          {!isInitialLoading && (
            <span>
              <strong>{projects.length}</strong>{" "}
              {projects.length === 1 ? "project" : "projects"}
              {filters.archived ? " archived" : ""}
            </span>
          )}
        </div>

        <div
          className={`projects-refresh-status ${
            isRefetching ? "projects-refresh-status--visible" : ""
          }`}
          aria-live="polite"
        >
          <span className="projects-refresh-dot" />
          Updating
        </div>
      </div>

      {error && projects.length > 0 && (
        <div className="projects-inline-error" role="alert">
          <span>We couldn't refresh your projects.</span>

          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <div className="projects-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : error && projects.length === 0 ? (
        <div className="projects-state projects-state--error">
          <div className="projects-state__icon">!</div>

          <h2>Unable to load projects</h2>

          <p>{error}</p>

          <button
            type="button"
            className="projects-secondary-button"
            onClick={retryLoad}
          >
            Try again
          </button>
        </div>
      ) : projects.length === 0 && hasActiveFilters ? (
        <div className="projects-state">
          <div className="projects-state__icon">⌕</div>

          <h2>No matching projects</h2>

          <p>No projects match your current search and filter settings.</p>

          <button
            type="button"
            className="projects-secondary-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty__icon">P</div>

          <h2>No projects yet</h2>

          <p>
            Create your first project and start organizing the work that
            matters.
          </p>

          <button
            className="projects-create-button"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span>+</span>
            Create Project
          </button>
        </div>
      ) : (
        <div
          className={`projects-grid ${
            isRefetching ? "projects-grid--refreshing" : ""
          }`}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          setRetryCount((count) => count + 1);
        }}
      />
    </section>
  );
}
