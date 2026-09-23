import type { Task, TaskPriority, TaskStatus } from "../types/task.types";

interface TaskCardProps {
  task: Task;
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

export default function TaskCard({ task }: TaskCardProps) {
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
        <span>Due: {formatDueDate(task.dueDate)}</span>

        <span>{task.projectId ? "Project task" : "Standalone"}</span>
      </footer>
    </article>
  );
}
