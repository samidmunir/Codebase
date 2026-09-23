import { useEffect, useState, useCallback, type FormEvent } from "react";

import { getProjects } from "../../projects/api/projectsApi";
import type { Project } from "../../projects/types/project.types";

import type {
  CreateTaskInput,
  TaskPriority,
  TaskStatus,
} from "../types/task.types";

interface CreateTaskModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

interface TaskFormState {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

const INITIAL_FORM: TaskFormState = {
  title: "",
  description: "",
  projectId: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
};

export default function CreateTaskModal({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM);

  const [projects, setProjects] = useState<Project[]>([]);

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [projectsError, setProjectsError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setForm(INITIAL_FORM);
    setProjects([]);
    setProjectsError(null);

    onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectsError(null);

        const data = await getProjects({
          archived: false,
          sort: "name",
          order: "asc",
        });

        if (!cancelled) {
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);

        if (!cancelled) {
          setProjectsError(
            "Projects could not be loaded. You can still create a standalone task.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) {
    return null;
  }

  const updateField = <K extends keyof TaskFormState>(
    key: K,
    value: TaskFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();

    if (!title || isSubmitting) {
      return;
    }

    const input: CreateTaskInput = {
      title,
      status: form.status,
      priority: form.priority,
    };

    const description = form.description.trim();

    if (description) {
      input.description = description;
    }

    if (form.projectId) {
      input.projectId = form.projectId;
    }

    if (form.dueDate) {
      input.dueDate = form.dueDate;
    }

    await onSubmit(input);

    setForm(INITIAL_FORM);
    setProjects([]);
    setProjectsError(null);
  };

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <header className="task-modal__header">
          <div>
            <p className="tasks-eyebrow">New Task</p>

            <h2 id="create-task-title">Create a task</h2>

            <p>
              Create a standalone task or associate it with one of your
              projects.
            </p>
          </div>

          <button
            type="button"
            className="task-modal__close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close create task dialog"
          >
            ×
          </button>
        </header>

        <form className="task-form" onSubmit={handleSubmit}>
          {error && (
            <div className="task-form__error" role="alert">
              {error}
            </div>
          )}

          <div className="task-form__field">
            <label htmlFor="task-title">
              Title
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="task-title"
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="What needs to be done?"
              maxLength={150}
              required
              autoFocus
              disabled={isSubmitting}
            />

            <span className="task-form__hint">{form.title.length}/150</span>
          </div>

          <div className="task-form__field">
            <label htmlFor="task-description">Description</label>

            <textarea
              id="task-description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Add any useful details..."
              maxLength={5000}
              disabled={isSubmitting}
            />

            <span className="task-form__hint">
              {form.description.length}/5000
            </span>
          </div>

          <div className="task-form__field">
            <label htmlFor="task-project">Project</label>

            <select
              id="task-project"
              value={form.projectId}
              onChange={(event) => updateField("projectId", event.target.value)}
              disabled={isSubmitting || isLoadingProjects}
            >
              <option value="">Standalone task</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {isLoadingProjects && (
              <span className="task-form__message">Loading projects...</span>
            )}

            {projectsError && (
              <span className="task-form__message task-form__message--error">
                {projectsError}
              </span>
            )}
          </div>

          <div className="task-form__row">
            <div className="task-form__field">
              <label htmlFor="task-status">Status</label>

              <select
                id="task-status"
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as TaskStatus)
                }
                disabled={isSubmitting}
              >
                <option value="todo">To do</option>

                <option value="in_progress">In progress</option>

                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="task-form__field">
              <label htmlFor="task-priority">Priority</label>

              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) =>
                  updateField("priority", event.target.value as TaskPriority)
                }
                disabled={isSubmitting}
              >
                <option value="low">Low</option>

                <option value="medium">Medium</option>

                <option value="high">High</option>

                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="task-form__field">
            <label htmlFor="task-due-date">Due date</label>

            <input
              id="task-due-date"
              type="date"
              value={form.dueDate}
              onChange={(event) => updateField("dueDate", event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <footer className="task-modal__actions">
            <button
              type="button"
              className="tasks-secondary-button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="tasks-create-button"
              disabled={isSubmitting || !form.title.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
