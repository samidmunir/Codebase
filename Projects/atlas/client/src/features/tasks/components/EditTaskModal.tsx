import { useEffect, useState, type FormEvent } from "react";

import { getProjects } from "../../projects/api/projectsApi";
import type { Project } from "../../projects/types/project.types";

import type {
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../types/task.types";

interface EditTaskModalProps {
  task: Task;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdateTaskInput) => Promise<void>;
}

interface EditTaskFormState {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

function createInitialForm(task: Task): EditTaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    projectId: task.projectId ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.slice(0, 10) ?? "",
  };
}

export default function EditTaskModal({
  task,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: EditTaskModalProps) {
  const [form, setForm] = useState<EditTaskFormState>(() =>
    createInitialForm(task),
  );

  const [projects, setProjects] = useState<Project[]>([]);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [projectsError, setProjectsError] = useState<string | null>(null);

  /*
   * Fetching Projects is a legitimate effect:
   * we're synchronizing this component with an external API.
   *
   * Notice there are no synchronous setState calls at the
   * beginning of the effect.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchProjects = async () => {
      try {
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
          setProjectsError("Projects could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    };

    /*
     * Loading begins as false, but unlike our earlier lint
     * issue we don't want to synchronously flip it inside
     * the effect.
     *
     * The Project selector can simply remain usable while
     * the request resolves.
     */
    void fetchProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const updateField = <K extends keyof EditTaskFormState>(
    key: K,
    value: EditTaskFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const title = form.title.trim();

    if (!title) {
      return;
    }

    const originalDescription = task.description ?? "";

    const originalDueDate = task.dueDate?.slice(0, 10) ?? "";

    const originalProjectId = task.projectId ?? "";

    const input: UpdateTaskInput = {};

    /*
     * Only include fields that actually changed.
     */
    if (title !== task.title) {
      input.title = title;
    }

    const description = form.description.trim();

    if (description !== originalDescription) {
      input.description = description || null;
    }

    if (form.status !== task.status) {
      input.status = form.status;
    }

    if (form.priority !== task.priority) {
      input.priority = form.priority;
    }

    if (form.dueDate !== originalDueDate) {
      input.dueDate = form.dueDate || null;
    }

    if (form.projectId !== originalProjectId) {
      input.projectId = form.projectId || null;
    }

    /*
     * If nothing changed, simply close.
     */
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }

    await onSubmit(input);
  };

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
      >
        <header className="task-modal__header">
          <div>
            <p className="tasks-eyebrow">Task</p>

            <h2 id="edit-task-title">Edit task</h2>

            <p>Update the task's details, assignment, priority, or status.</p>
          </div>

          <button
            type="button"
            className="task-modal__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit task dialog"
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
            <label htmlFor="edit-task-title-input">
              Title
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="edit-task-title-input"
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={150}
              required
              autoFocus
              disabled={isSubmitting}
            />

            <span className="task-form__hint">{form.title.length}/150</span>
          </div>

          <div className="task-form__field">
            <label htmlFor="edit-task-description">Description</label>

            <textarea
              id="edit-task-description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              maxLength={5000}
              disabled={isSubmitting}
            />

            <span className="task-form__hint">
              {form.description.length}/5000
            </span>
          </div>

          <div className="task-form__field">
            <label htmlFor="edit-task-project">Project</label>

            <select
              id="edit-task-project"
              value={form.projectId}
              onChange={(event) => updateField("projectId", event.target.value)}
              disabled={isSubmitting}
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
              <label htmlFor="edit-task-status">Status</label>

              <select
                id="edit-task-status"
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
              <label htmlFor="edit-task-priority">Priority</label>

              <select
                id="edit-task-priority"
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
            <label htmlFor="edit-task-due-date">Due date</label>

            <input
              id="edit-task-due-date"
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="tasks-create-button"
              disabled={isSubmitting || !form.title.trim()}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
