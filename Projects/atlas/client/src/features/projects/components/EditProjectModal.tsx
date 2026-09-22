import { useEffect, useState } from "react";

import { updateProject } from "../api/projectsApi";
import type {
  Project,
  ProjectPriority,
  ProjectStatus,
  UpdateProjectInput,
} from "../types/project.types";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onUpdated: (project: Project) => void;
}

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  targetDate: string;
}

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  // Supports both:
  // "2026-09-21"
  // "2026-09-21T00:00:00Z"
  return value.slice(0, 10);
}

function createFormState(project: Project): ProjectFormState {
  return {
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    priority: project.priority,
    startDate: toDateInputValue(project.startDate),
    targetDate: toDateInputValue(project.targetDate),
  };
}

export default function EditProjectModal({
  project,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const [form, setForm] = useState<ProjectFormState>(() =>
    createFormState(project),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = "";
    };
  }, [isSubmitting, onClose]);

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setSubmitError("Project name is required.");
      return;
    }

    if (form.startDate && form.targetDate && form.targetDate < form.startDate) {
      setSubmitError("Target date cannot be before the start date.");
      return;
    }

    const original = createFormState(project);

    const input: UpdateProjectInput = {};

    if (name !== original.name.trim()) {
      input.name = name;
    }

    if (description !== original.description.trim()) {
      input.description = description.length > 0 ? description : null;
    }

    if (form.status !== original.status) {
      input.status = form.status;
    }

    if (form.priority !== original.priority) {
      input.priority = form.priority;
    }

    if (form.startDate !== original.startDate) {
      input.startDate = form.startDate || null;
    }

    if (form.targetDate !== original.targetDate) {
      input.targetDate = form.targetDate || null;
    }

    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const updatedProject = await updateProject(project.id, input);

      onUpdated(updatedProject);
      onClose();
    } catch (err) {
      console.error("Failed to update project:", err);

      setSubmitError(
        err instanceof Error ? err.message : "Unable to update project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="project-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <div
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-title"
      >
        <header className="project-modal__header">
          <div>
            <span className="projects-eyebrow">Project settings</span>

            <h2 id="edit-project-title">Edit project</h2>

            <p>Update the project's details, priority, status, and timeline.</p>
          </div>

          <button
            type="button"
            className="project-modal__close"
            aria-label="Close edit project dialog"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            ×
          </button>
        </header>

        <form className="project-form" onSubmit={handleSubmit}>
          <div className="project-form__field">
            <label htmlFor="edit-project-name">
              Project name
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="edit-project-name"
              type="text"
              maxLength={150}
              required
              autoFocus
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="project-form__field">
            <label htmlFor="edit-project-description">Description</label>

            <textarea
              id="edit-project-description"
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />

            <span className="project-form__hint">
              {form.description.length} / 5000
            </span>
          </div>

          <div className="project-form__row">
            <div className="project-form__field">
              <label htmlFor="edit-project-status">Status</label>

              <select
                id="edit-project-status"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ProjectStatus,
                  }))
                }
              >
                <option value="planning">Planning</option>

                <option value="active">Active</option>

                <option value="on_hold">On Hold</option>

                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="project-form__field">
              <label htmlFor="edit-project-priority">Priority</label>

              <select
                id="edit-project-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as ProjectPriority,
                  }))
                }
              >
                <option value="low">Low</option>

                <option value="medium">Medium</option>

                <option value="high">High</option>

                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="project-form__row">
            <div className="project-form__field">
              <label htmlFor="edit-project-start-date">Start date</label>

              <input
                id="edit-project-start-date"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="project-form__field">
              <label htmlFor="edit-project-target-date">Target date</label>

              <input
                id="edit-project-target-date"
                type="date"
                min={form.startDate || undefined}
                value={form.targetDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {submitError && (
            <div className="project-form__error" role="alert">
              {submitError}
            </div>
          )}

          <footer className="project-modal__actions">
            <button
              type="button"
              className="projects-secondary-button"
              disabled={isSubmitting}
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="projects-create-button"
              disabled={isSubmitting || !form.name.trim()}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
