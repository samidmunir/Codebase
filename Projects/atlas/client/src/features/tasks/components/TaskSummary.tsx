import type { Task } from "../types/task.types";

interface TaskSummaryProps {
  tasks: Task[];
}

export default function TaskSummary({ tasks }: TaskSummaryProps) {
  const todoCount = tasks.filter((task) => task.status === "todo").length;

  const inProgressCount = tasks.filter(
    (task) => task.status === "in_progress",
  ).length;

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;

  return (
    <section className="task-summary" aria-label="Task summary">
      <article className="task-summary-card">
        <span className="task-summary-label">Total</span>

        <strong>{tasks.length}</strong>
      </article>

      <article className="task-summary-card">
        <span className="task-summary-label">To do</span>

        <strong>{todoCount}</strong>
      </article>

      <article className="task-summary-card">
        <span className="task-summary-label">In progress</span>

        <strong>{inProgressCount}</strong>
      </article>

      <article className="task-summary-card">
        <span className="task-summary-label">Completed</span>

        <strong>{completedCount}</strong>
      </article>
    </section>
  );
}
