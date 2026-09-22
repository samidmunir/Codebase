import type {
  ProjectListFilters,
  ProjectPriority,
  ProjectSortField,
  ProjectSortOrder,
  ProjectStatus,
} from "../types/project.types";

interface ProjectToolbarProps {
  filters: ProjectListFilters;
  onChange: (filters: ProjectListFilters) => void;
}

export default function ProjectToolbar({
  filters,
  onChange,
}: ProjectToolbarProps) {
  function updateFilter<K extends keyof ProjectListFilters>(
    key: K,
    value: ProjectListFilters[K],
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  function clearFilters() {
    onChange({
      search: "",
      archived: false,
      sort: "updatedAt",
      order: "desc",
    });
  }

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    filters.archived === true ||
    filters.sort !== "updatedAt" ||
    filters.order !== "desc";

  return (
    <div className="projects-toolbar">
      <div className="projects-search">
        <span className="projects-search__icon" aria-hidden="true">
          ⌕
        </span>

        <input
          type="search"
          value={filters.search ?? ""}
          placeholder="Search projects..."
          aria-label="Search projects"
          onChange={(event) => updateFilter("search", event.target.value)}
        />
      </div>

      <div className="projects-toolbar__controls">
        <select
          aria-label="Filter by status"
          value={filters.status ?? ""}
          onChange={(event) =>
            updateFilter(
              "status",
              (event.target.value || undefined) as ProjectStatus | undefined,
            )
          }
        >
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>

        <select
          aria-label="Filter by priority"
          value={filters.priority ?? ""}
          onChange={(event) =>
            updateFilter(
              "priority",
              (event.target.value || undefined) as ProjectPriority | undefined,
            )
          }
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <select
          aria-label="Project archive view"
          value={filters.archived ? "archived" : "current"}
          onChange={(event) =>
            updateFilter("archived", event.target.value === "archived")
          }
        >
          <option value="current">Current</option>
          <option value="archived">Archived</option>
        </select>

        <select
          aria-label="Sort projects"
          value={filters.sort ?? "updatedAt"}
          onChange={(event) =>
            updateFilter("sort", event.target.value as ProjectSortField)
          }
        >
          <option value="updatedAt">Recently updated</option>
          <option value="createdAt">Date created</option>
          <option value="name">Name</option>
          <option value="startDate">Start date</option>
          <option value="targetDate">Target date</option>
        </select>

        <button
          type="button"
          className="projects-sort-order"
          aria-label={
            filters.order === "asc" ? "Sort ascending" : "Sort descending"
          }
          title={filters.order === "asc" ? "Ascending" : "Descending"}
          onClick={() =>
            updateFilter(
              "order",
              (filters.order === "asc" ? "desc" : "asc") as ProjectSortOrder,
            )
          }
        >
          {filters.order === "asc" ? "↑" : "↓"}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            className="projects-clear-filters"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
