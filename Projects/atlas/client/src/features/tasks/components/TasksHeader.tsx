interface TasksHeaderProps {
  taskCount: number;
  onCreateTask: () => void;
}

export default function TasksHeader({
  taskCount,
  onCreateTask,
}: TasksHeaderProps) {
  return (
    <header className="tasks-header">
      <div>
        <p className="tasks-eyebrow">Workspace</p>

        <h1>Tasks</h1>

        <p className="tasks-subtitle">
          Organize your work, track priorities, and keep your projects moving
          forward.
        </p>
      </div>

      <div className="tasks-header-actions">
        <span className="tasks-count">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>

        <button
          type="button"
          className="tasks-create-button"
          onClick={onCreateTask}
        >
          + New Task
        </button>
      </div>
    </header>
  );
}
