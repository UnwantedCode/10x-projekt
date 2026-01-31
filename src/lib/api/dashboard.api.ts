/**
 * Dashboard API client functions
 */

import type {
  ProfileDTO,
  ListDTO,
  ListsResponseDTO,
  TasksResponseDTO,
  CreateListCommand,
  UpdateListCommand,
  CreateTaskCommand,
  UpdateTaskCommand,
  UpdateProfileCommand,
  CompleteOnboardingCommand,
  SuccessResponseDTO,
} from "@/types";

import type { TaskFilterState } from "@/components/dashboard/types";
import { TASKS_PAGE_SIZE, LISTS_PAGE_SIZE } from "@/components/dashboard/types";

import {
  ApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ServerError,
  NetworkError,
} from "./errors";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Handles API response and throws appropriate errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  // Handle specific status codes
  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (response.status === 404) {
    const data = await response.json().catch(() => ({}));
    throw new NotFoundError(data.message || "Nie znaleziono zasobu.");
  }

  if (response.status === 400) {
    const data = await response.json().catch(() => ({}));
    throw new ValidationError(data.message || "Nieprawidłowe dane.", data.details);
  }

  if (response.status === 409) {
    const data = await response.json().catch(() => ({}));
    throw new ConflictError(data.message || "Konflikt danych.");
  }

  if (response.status >= 500) {
    throw new ServerError();
  }

  throw new ApiError(`Request failed with status ${response.status}`);
}

/**
 * Wraps fetch with error handling for network errors
 */
async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new NetworkError();
  }
}

// =============================================================================
// Profile API
// =============================================================================

/**
 * Fetches current user's profile
 */
export async function fetchProfile(): Promise<ProfileDTO> {
  const response = await safeFetch("/api/profile");
  return handleResponse<ProfileDTO>(response);
}

/**
 * Updates user profile (e.g., active list)
 */
export async function updateProfile(command: UpdateProfileCommand): Promise<ProfileDTO> {
  const response = await safeFetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<ProfileDTO>(response);
}

/**
 * Updates the active list ID
 */
export async function updateActiveList(listId: string | null): Promise<ProfileDTO> {
  return updateProfile({ activeListId: listId });
}

/**
 * Completes onboarding for the user
 */
export async function completeOnboarding(version: number): Promise<ProfileDTO> {
  const command: CompleteOnboardingCommand = { version };
  const response = await safeFetch("/api/profile/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<ProfileDTO>(response);
}

// =============================================================================
// Lists API
// =============================================================================

/**
 * Fetches all user's lists with pagination
 */
export async function fetchLists(params?: { limit?: number; offset?: number }): Promise<ListsResponseDTO> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params?.limit ?? LISTS_PAGE_SIZE));
  if (params?.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const response = await safeFetch(`/api/lists?${searchParams}`);
  return handleResponse<ListsResponseDTO>(response);
}

/**
 * Creates a new list
 */
export async function createList(command: CreateListCommand): Promise<ListDTO> {
  const response = await safeFetch("/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<ListDTO>(response);
}

/**
 * Updates an existing list
 */
export async function updateList(listId: string, command: UpdateListCommand): Promise<ListDTO> {
  const response = await safeFetch(`/api/lists/${listId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<ListDTO>(response);
}

/**
 * Deletes a list
 */
export async function deleteList(listId: string): Promise<SuccessResponseDTO> {
  const response = await safeFetch(`/api/lists/${listId}`, {
    method: "DELETE",
  });
  return handleResponse<SuccessResponseDTO>(response);
}

// =============================================================================
// Tasks API
// =============================================================================

interface FetchTasksParams extends Partial<TaskFilterState> {
  limit?: number;
  offset?: number;
}

/**
 * Fetches tasks for a specific list with filtering and pagination
 */
export async function fetchTasks(listId: string, params?: FetchTasksParams): Promise<TasksResponseDTO> {
  const searchParams = new URLSearchParams();

  // Add filter parameters
  if (params?.status !== undefined && params.status !== null) {
    searchParams.set("status", String(params.status));
  }
  if (params?.priority !== undefined && params.priority !== null) {
    searchParams.set("priority", String(params.priority));
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }
  if (params?.sort) {
    searchParams.set("sort", params.sort);
  }
  if (params?.order) {
    searchParams.set("order", params.order);
  }

  // Add pagination parameters
  searchParams.set("limit", String(params?.limit ?? TASKS_PAGE_SIZE));
  if (params?.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const response = await safeFetch(`/api/lists/${listId}/tasks?${searchParams}`);
  return handleResponse<TasksResponseDTO>(response);
}

/**
 * Creates a new task in a list
 */
export async function createTask(listId: string, command: CreateTaskCommand): Promise<TaskDTO> {
  const response = await safeFetch(`/api/lists/${listId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<TaskDTO>(response);
}

/**
 * Updates an existing task
 */
export async function updateTask(taskId: string, command: UpdateTaskCommand): Promise<TaskDTO> {
  const response = await safeFetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<TaskDTO>(response);
}

/**
 * Updates task status (convenience function)
 */
export async function updateTaskStatus(taskId: string, status: 1 | 2): Promise<TaskDTO> {
  return updateTask(taskId, { status });
}

/**
 * Deletes a task
 */
export async function deleteTask(taskId: string): Promise<SuccessResponseDTO> {
  const response = await safeFetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  return handleResponse<SuccessResponseDTO>(response);
}

// =============================================================================
// Type Exports
// =============================================================================

export type { TaskDTO, ListDTO, ProfileDTO } from "@/types";
