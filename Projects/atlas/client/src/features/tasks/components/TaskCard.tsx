import type { Task, TaskPriority, TaskStatus } from "../types/task.types";
import { Link } from "react-router-dom";

interface TaskCardProps {
  task: Task;
  projectName: string | null;
}

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

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "No due date";
  }

  const normalizedDate = dueDate.slice(0, 10);

  const date = new Date(`${normalizedDate}T00:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function TaskCard({ task, projectName }: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card-top">
        <div>
          <span className={`task-status task-status--${task.status}`}>
            {statusLabels[task.status]}
          </span>

          <span className={`task-priority task-priority--${task.priority}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
      </div>

      <div className="task-card-body">
        <h2>{task.title}</h2>

        <p className="task-card-description">
          {task.description || "No description provided."}
        </p>
      </div>

      <footer className="task-card-footer">
        <div className="task-card-footer__meta">
          <span>Due: {formatDueDate(task.dueDate)}</span>

          <span
            className="task-card-project"
            title={projectName ?? "Standalone"}
          >
            <span className="task-card-project__icon" aria-hidden="true">
              ◇
            </span>

            {projectName ?? "Standalone"}
          </span>
        </div>

        <Link
          to={`/tasks/${task.id}`}
          className="task-card__view"
          aria-label={`View ${task.title}`}
        >
          View
          <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  );
}
