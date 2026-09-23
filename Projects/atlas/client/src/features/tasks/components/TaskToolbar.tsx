import type {
  TaskDueFilter,
  TaskListFilters,
  TaskPriority,
  TaskSortField,
  TaskSortOrder,
  TaskStatus,
} from "../types/task.types";

interface TaskToolbarProps {
  filters: TaskListFilters;
  onFiltersChange: (filters: TaskListFilters) => void;
  onClear: () => void;
}

export default function TaskToolbar({
  filters,
  onFiltersChange,
  onClear,
}: TaskToolbarProps) {
  const updateFilter = <K extends keyof TaskListFilters>(
    key: K,
    value: TaskListFilters[K],
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <section className="task-toolbar" aria-label="Task filters">
      <div className="task-search">
        <label htmlFor="task-search">Search</label>

        <input
          id="task-search"
          type="search"
          placeholder="Search tasks..."
          value={filters.search ?? ""}
          onChange={(event) =>
            updateFilter("search", event.target.value || undefined)
          }
        />
      </div>

      <div className="task-filter">
        <label htmlFor="task-status">Status</label>

        <select
          id="task-status"
          value={filters.status ?? ""}
          onChange={(event) => {
            const value = event.target.value;

            updateFilter("status", value ? (value as TaskStatus) : undefined);
          }}
        >
          <option value="">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="task-filter">
        <label htmlFor="task-priority">Priority</label>

        <select
          id="task-priority"
          value={filters.priority ?? ""}
          onChange={(event) => {
            const value = event.target.value;

            updateFilter(
              "priority",
              value ? (value as TaskPriority) : undefined,
            );
          }}
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="task-filter">
        <label htmlFor="task-due">Due</label>

        <select
          id="task-due"
          value={filters.due ?? ""}
          onChange={(event) => {
            const value = event.target.value;

            updateFilter("due", value ? (value as TaskDueFilter) : undefined);
          }}
        >
          <option value="">Any date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="none">No due date</option>
        </select>
      </div>

      <div className="task-filter">
        <label htmlFor="task-sort">Sort</label>

        <select
          id="task-sort"
          value={filters.sort ?? "updatedAt"}
          onChange={(event) =>
            updateFilter("sort", event.target.value as TaskSortField)
          }
        >
          <option value="updatedAt">Last updated</option>
          <option value="createdAt">Created</option>
          <option value="title">Title</option>
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <div className="task-filter">
        <label htmlFor="task-order">Order</label>

        <select
          id="task-order"
          value={filters.order ?? "desc"}
          onChange={(event) =>
            updateFilter("order", event.target.value as TaskSortOrder)
          }
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <button type="button" className="task-clear-button" onClick={onClear}>
        Clear filters
      </button>
    </section>
  );
}
