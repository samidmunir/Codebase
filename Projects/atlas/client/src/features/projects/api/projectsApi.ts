import { authenticatedApiRequest } from "../../../api/authenticatedClient";

import type {
  CreateProjectInput,
  Project,
  ProjectListFilters,
  ProjectResponse,
  ProjectsResponse,
  UpdateProjectInput,
} from "../types/project.types";

function buildProjectQuery(filters: ProjectListFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.archived !== undefined) {
    params.set("archived", String(filters.archived));
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
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

export async function getProjects(
  filters: ProjectListFilters = {},
): Promise<Project[]> {
  const query = buildProjectQuery(filters);

  const response = await authenticatedApiRequest<ProjectsResponse>(
    `/projects${query}`,
  );

  return response.projects;
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await authenticatedApiRequest<ProjectResponse>(
    `/projects/${projectId}`,
  );

  return response.project;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const response = await authenticatedApiRequest<ProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.project;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await authenticatedApiRequest<ProjectResponse>(
    `/projects/${projectId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.project;
}

export async function archiveProject(projectId: string): Promise<void> {
  await authenticatedApiRequest(`/projects/${projectId}/archive`, {
    method: "POST",
  });
}

export async function restoreProject(projectId: string): Promise<void> {
  await authenticatedApiRequest(`/projects/${projectId}/restore`, {
    method: "POST",
  });
}
