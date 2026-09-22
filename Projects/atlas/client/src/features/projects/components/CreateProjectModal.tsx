import { useEffect, useState } from "react";

import type {
  ProjectPriority,
  ProjectStatus,
  CreateProjectInput,
  Project,
} from "../types/project.types";

import { createProject } from "../api/projectsApi";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  targetDate: string;
}

const initialFormState: ProjectFormState = {
  name: "",
  description: "",
  status: "planning",
  priority: "medium",
  startDate: "",
  targetDate: "",
};

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [form, setForm] = useState<ProjectFormState>(initialFormState);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setForm(initialFormState);
        setSubmitError(null);
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setForm(initialFormState);
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

    const input: CreateProjectInput = {
      name,
      description: description.length > 0 ? description : null,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const project = await createProject(input);

      setForm(initialFormState);

      onCreated(project);
      onClose();
    } catch (err) {
      console.error("Failed to create project:", err);

      setSubmitError(
        err instanceof Error ? err.message : "Unable to create project.",
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
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <header className="project-modal__header">
          <div>
            <span className="projects-eyebrow">New workspace</span>

            <h2 id="create-project-title">Create project</h2>

            <p>Define the work, priority, and timeline for your new project.</p>
          </div>

          <button
            type="button"
            className="project-modal__close"
            aria-label="Close create project dialog"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            ×
          </button>
        </header>

        <form className="project-form" onSubmit={handleSubmit}>
          <div className="project-form__field">
            <label htmlFor="project-name">
              Project name
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="project-name"
              type="text"
              maxLength={150}
              required
              autoFocus
              placeholder="e.g. Launch Atlas MVP"
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
            <label htmlFor="project-description">Description</label>

            <textarea
              id="project-description"
              rows={4}
              maxLength={5000}
              placeholder="What are you trying to accomplish?"
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
              <label htmlFor="project-status">Status</label>

              <select
                id="project-status"
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
              <label htmlFor="project-priority">Priority</label>

              <select
                id="project-priority"
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
              <label htmlFor="project-start-date">Start date</label>

              <input
                id="project-start-date"
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
              <label htmlFor="project-target-date">Target date</label>

              <input
                id="project-target-date"
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
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
