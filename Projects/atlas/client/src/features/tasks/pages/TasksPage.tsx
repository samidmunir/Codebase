import { useCallback, useEffect, useState } from "react";

import { createTask, getTasks } from "../api/tasksApi";
import TaskCard from "../components/TaskCard";
import TasksHeader from "../components/TasksHeader";
import TaskSummary from "../components/TaskSummary";
import TaskToolbar from "../components/TaskToolbar";

import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
} from "../types/task.types";

import CreateTaskModal from "../components/CreateTaskModal";

import "../styles/tasks.css";

const DEFAULT_FILTERS: TaskListFilters = {
  sort: "updatedAt",
  order: "desc",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [filters, setFilters] = useState<TaskListFilters>(DEFAULT_FILTERS);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async (activeFilters: TaskListFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getTasks(activeFilters);

      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);

      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const handleOpenCreateTask = () => {
    setCreateTaskError(null);
    setIsCreateOpen(true);
  };

  const handleCloseCreateTask = () => {
    if (isCreatingTask) {
      return;
    }

    setCreateTaskError(null);
    setIsCreateOpen(false);
  };

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      setIsCreatingTask(true);
      setCreateTaskError(null);

      await createTask(input);

      setIsCreateOpen(false);

      await loadTasks(filters);
    } catch (err) {
      console.error("Failed to create task:", err);

      setCreateTaskError(
        err instanceof Error ? err.message : "Unable to create task.",
      );
    } finally {
      setIsCreatingTask(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(
      () => {
        void loadTasks(filters);
      },
      filters.search ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters, loadTasks]);

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <main className="tasks-page">
      <TasksHeader
        taskCount={tasks.length}
        onCreateTask={handleOpenCreateTask}
      />

      <TaskSummary tasks={tasks} />

      <TaskToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <section className="tasks-state" aria-live="polite">
          <div className="tasks-loader" aria-hidden="true" />

          <p>Loading tasks...</p>
        </section>
      ) : error ? (
        <section className="tasks-state tasks-state--error" role="alert">
          <h2>Unable to load tasks</h2>
          <p>{error}</p>

          <button type="button" onClick={() => void loadTasks(filters)}>
            Try again
          </button>
        </section>
      ) : tasks.length === 0 ? (
        <section className="tasks-state">
          <h2>No tasks found</h2>

          <p>Try adjusting your filters or clearing your search.</p>

          <button type="button" onClick={handleClearFilters}>
            Clear filters
          </button>
        </section>
      ) : (
        <section className="tasks-grid" aria-label="Tasks">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      )}
      <CreateTaskModal
        isOpen={isCreateOpen}
        isSubmitting={isCreatingTask}
        error={createTaskError}
        onClose={handleCloseCreateTask}
        onSubmit={handleCreateTask}
      />
    </main>
  );
}
