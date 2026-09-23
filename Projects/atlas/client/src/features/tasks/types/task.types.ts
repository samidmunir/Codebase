export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskDueFilter = "overdue" | "today" | "upcoming" | "none";

export type TaskSortField =
  | "updatedAt"
  | "createdAt"
  | "title"
  | "dueDate"
  | "priority";

export type TaskSortOrder = "asc" | "desc";

export interface Task {
  id: string;
  projectId: string | null;

  title: string;
  description: string | null;

  status: TaskStatus;
  priority: TaskPriority;

  dueDate: string | null;
  completedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId?: string | null;

  title: string;
  description?: string | null;

  status?: TaskStatus;
  priority?: TaskPriority;

  dueDate?: string | null;
}

export interface UpdateTaskInput {
  projectId?: string | null;

  title?: string;
  description?: string | null;

  status?: TaskStatus;
  priority?: TaskPriority;

  dueDate?: string | null;
}

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  search?: string;
  due?: TaskDueFilter;
  sort?: TaskSortField;
  order?: TaskSortOrder;
}

export interface TaskResponse {
  task: Task;
}

export interface TasksResponse {
  tasks: Task[];
}
