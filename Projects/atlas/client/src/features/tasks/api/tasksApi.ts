import { authenticatedApiRequest } from "../../../api/authenticatedClient";

import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
  TaskResponse,
  TasksResponse,
  UpdateTaskInput,
} from "../types/task.types";

function buildTaskQuery(filters: TaskListFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.projectId) {
    params.set("projectId", filters.projectId);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.due) {
    params.set("due", filters.due);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  if (filters.order) {
    params.set("order", filters.order);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export async function getTasks(filters: TaskListFilters = {}): Promise<Task[]> {
  const response = await authenticatedApiRequest<TasksResponse>(
    `/tasks${buildTaskQuery(filters)}`,
  );

  return response.tasks;
}

export async function getTask(taskId: string): Promise<Task> {
  const response = await authenticatedApiRequest<TaskResponse>(
    `/tasks/${taskId}`,
  );

  return response.task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await authenticatedApiRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.task;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const response = await authenticatedApiRequest<TaskResponse>(
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await authenticatedApiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
