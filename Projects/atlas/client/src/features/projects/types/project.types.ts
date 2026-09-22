export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export type ProjectSortField =
  | "updatedAt"
  | "createdAt"
  | "name"
  | "startDate"
  | "targetDate";

export type ProjectSortOrder = "asc" | "desc";

export interface Project {
  id: string;
  name: string;
  description: string | null;

  status: ProjectStatus;
  priority: ProjectPriority;

  startDate: string | null;
  targetDate: string | null;

  completedAt: string | null;
  archivedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;

  status?: ProjectStatus;
  priority?: ProjectPriority;

  startDate?: string | null;
  targetDate?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;

  status?: ProjectStatus;
  priority?: ProjectPriority;

  startDate?: string | null;
  targetDate?: string | null;
}

export interface ProjectListFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  archived?: boolean;
  search?: string;
  sort?: ProjectSortField;
  order?: ProjectSortOrder;
}

export interface ProjectResponse {
  project: Project;
}

export interface ProjectsResponse {
  projects: Project[];
}
