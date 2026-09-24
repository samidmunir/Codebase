import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProject } from "../../projects/api/projectsApi";
import type { Project } from "../../projects/types/project.types";

import EditTaskModal from "../components/EditTaskModal";
import { getTask, updateTask } from "../api/tasksApi";

import type {
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../types/task.types";

import "../styles/tasks.css";

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const normalized = value.slice(0, 10);

  const date = new Date(`${normalized}T00:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{
    taskId: string;
  }>();

  /*
   * Task detail state
   */
  const [task, setTask] = useState<Task | null>(null);

  const [project, setProject] = useState<Project | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  /*
   * Edit Task state
   *
   * These MUST live inside TaskDetailPage because
   * the edit handlers depend on component state.
   */
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const [updateError, setUpdateError] = useState<string | null>(null);

  /*
   * Load Task + associated Project.
   */
  useEffect(() => {
    if (!taskId) {
      return;
    }

    let cancelled = false;

    const fetchTask = async () => {
      try {
        const taskData = await getTask(taskId);

        if (cancelled) {
          return;
        }

        setTask(taskData);

        if (taskData.projectId) {
          try {
            const projectData = await getProject(taskData.projectId);

            if (!cancelled) {
              setProject(projectData);
            }
          } catch (projectError) {
            console.error("Failed to load task project:", projectError);

            if (!cancelled) {
              setProject(null);
            }
          }
        } else {
          setProject(null);
        }
      } catch (err) {
        console.error("Failed to load task:", err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load task.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchTask();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  /*
   * Edit Task handlers
   */
  const handleOpenEdit = () => {
    setUpdateError(null);
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    if (isUpdatingTask) {
      return;
    }

    setUpdateError(null);
    setIsEditOpen(false);
  };

  const handleUpdateTask = async (input: UpdateTaskInput) => {
    if (!task) {
      return;
    }

    try {
      setIsUpdatingTask(true);
      setUpdateError(null);

      const updatedTask = await updateTask(task.id, input);

      setTask(updatedTask);

      /*
       * Refresh the associated Project so the
       * displayed Project name remains accurate
       * after reassignment.
       */
      if (updatedTask.projectId) {
        try {
          const updatedProject = await getProject(updatedTask.projectId);

          setProject(updatedProject);
        } catch (projectError) {
          console.error("Failed to refresh task project:", projectError);

          setProject(null);
        }
      } else {
        setProject(null);
      }

      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update task:", err);

      setUpdateError(
        err instanceof Error ? err.message : "Unable to update task.",
      );
    } finally {
      setIsUpdatingTask(false);
    }
  };

  /*
   * The route normally guarantees taskId because
   * this page is mounted at /tasks/:taskId.
   *
   * We still handle the missing-ID case explicitly.
   */
  if (!taskId) {
    return (
      <main className="task-detail-page">
        <Link to="/tasks" className="task-detail-back">
          ← Back to Tasks
        </Link>

        <section className="tasks-state tasks-state--error" role="alert">
          <h2>Unable to load task</h2>

          <p>Task ID is missing.</p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="task-detail-page">
        <div className="task-detail-loading">
          <div className="tasks-loader" aria-hidden="true" />

          <p>Loading task...</p>
        </div>
      </main>
    );
  }

  if (error || !task) {
    return (
      <main className="task-detail-page">
        <Link to="/tasks" className="task-detail-back">
          ← Back to Tasks
        </Link>

        <section className="tasks-state tasks-state--error" role="alert">
          <h2>Unable to load task</h2>

          <p>{error ?? "The requested task could not be found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="task-detail-page">
      <Link to="/tasks" className="task-detail-back">
        ← Back to Tasks
      </Link>

      <header className="task-detail-header">
        <div className="task-detail-header__content">
          <div className="task-detail-badges">
            <span className={`task-status task-status--${task.status}`}>
              {statusLabels[task.status]}
            </span>

            <span className={`task-priority task-priority--${task.priority}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>

          <h1>{task.title}</h1>

          <p>{task.description || "No description provided."}</p>
        </div>

        <div className="task-detail-actions">
          <button
            type="button"
            className="tasks-secondary-button"
            onClick={handleOpenEdit}
          >
            Edit Task
          </button>
        </div>
      </header>

      <section className="task-detail-grid">
        <article className="task-detail-panel">
          <header className="task-detail-panel__header">
            <p className="tasks-eyebrow">Details</p>

            <h2>Task information</h2>
          </header>

          <div className="task-detail-metadata">
            <div className="task-detail-field">
              <span>Status</span>

              <strong>{statusLabels[task.status]}</strong>
            </div>

            <div className="task-detail-field">
              <span>Priority</span>

              <strong>{priorityLabels[task.priority]}</strong>
            </div>

            <div className="task-detail-field">
              <span>Due date</span>

              <strong>{formatDate(task.dueDate)}</strong>
            </div>

            <div className="task-detail-field">
              <span>Project</span>

              <strong>
                {task.projectId
                  ? (project?.name ?? "Project unavailable")
                  : "Standalone task"}
              </strong>
            </div>
          </div>
        </article>

        <article className="task-detail-panel">
          <header className="task-detail-panel__header">
            <p className="tasks-eyebrow">Activity</p>

            <h2>Task lifecycle</h2>
          </header>

          <div className="task-detail-metadata">
            <div className="task-detail-field">
              <span>Created</span>

              <strong>{formatTimestamp(task.createdAt)}</strong>
            </div>

            <div className="task-detail-field">
              <span>Last updated</span>

              <strong>{formatTimestamp(task.updatedAt)}</strong>
            </div>

            <div className="task-detail-field">
              <span>Completed</span>

              <strong>{formatTimestamp(task.completedAt)}</strong>
            </div>

            <div className="task-detail-field">
              <span>Task ID</span>

              <code title={task.id}>{task.id}</code>
            </div>
          </div>
        </article>
      </section>

      {isEditOpen && (
        <EditTaskModal
          key={task.id}
          task={task}
          isSubmitting={isUpdatingTask}
          error={updateError}
          onClose={handleCloseEdit}
          onSubmit={handleUpdateTask}
        />
      )}
    </main>
  );
}
