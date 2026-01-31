import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import type { TaskDTO, PaginationDTO, CreateTaskCommand, TaskStatus } from "@/types";

import {
  fetchTasks,
  createTask as apiCreateTask,
  updateTaskStatus as apiUpdateTaskStatus,
} from "@/lib/api/dashboard.api";

import { isUnauthorizedError, handleUnauthorizedError, getErrorMessage } from "@/lib/api/errors";

import type { TaskFilterState, TasksByPriority } from "../types";
import { DEFAULT_FILTER_STATE, TASKS_PAGE_SIZE } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface UseTasksReturn {
  // State
  tasks: TaskDTO[];
  tasksByPriority: TasksByPriority;
  filters: TaskFilterState;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  pagination: PaginationDTO | null;
  error: string | null;
  totalCount: number;

  // Actions
  setFilters: (filters: Partial<TaskFilterState>) => void;
  resetFilters: () => void;
  loadMore: () => Promise<void>;
  createTask: (command: CreateTaskCommand) => Promise<TaskDTO>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  refreshTasks: () => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Groups tasks by priority level
 */
function groupTasksByPriority(tasks: TaskDTO[]): TasksByPriority {
  return {
    high: tasks.filter((task) => task.priority === 3),
    medium: tasks.filter((task) => task.priority === 2),
    low: tasks.filter((task) => task.priority === 1),
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTasks(listId: string | null): UseTasksReturn {
  // State
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [filters, setFiltersState] = useState<TaskFilterState>(DEFAULT_FILTER_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const tasksByPriority = useMemo(() => groupTasksByPriority(tasks), [tasks]);

  const hasMore = useMemo(() => {
    if (!pagination) return false;
    return pagination.offset + pagination.limit < pagination.total;
  }, [pagination]);

  const totalCount = pagination?.total ?? 0;

  // =============================================================================
  // Error Handling
  // =============================================================================

  const handleError = useCallback((err: unknown) => {
    if (isUnauthorizedError(err)) {
      handleUnauthorizedError();
      return;
    }
    setError(getErrorMessage(err));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  // Fetch tasks when listId or filters change
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch if no list selected
    if (!listId) {
      setTasks([]);
      setPagination(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    abortControllerRef.current = new AbortController();

    async function loadTasks() {
      if (!listId) return; // TypeScript guard
      
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchTasks(listId, {
          ...filters,
          limit: TASKS_PAGE_SIZE,
          offset: 0,
        });

        if (mounted) {
          setTasks(response.data);
          setPagination(response.pagination);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (mounted) {
          handleError(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      mounted = false;
    };
  }, [listId, filters, handleError]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // =============================================================================
  // Actions
  // =============================================================================

  const setFilters = useCallback((newFilters: Partial<TaskFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTER_STATE);
  }, []);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!listId || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const offset = pagination ? pagination.offset + pagination.limit : 0;

      const response = await fetchTasks(listId, {
        ...filters,
        limit: TASKS_PAGE_SIZE,
        offset,
      });

      setTasks((prev) => [...prev, ...response.data]);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [listId, hasMore, isLoadingMore, pagination, filters, handleError]);

  const createTaskAction = useCallback(
    async (command: CreateTaskCommand): Promise<TaskDTO> => {
      if (!listId) {
        throw new Error("No list selected");
      }

      try {
        const newTask = await apiCreateTask(listId, command);

        // Optimistic update - add task to appropriate position
        setTasks((prev) => {
          // If sorting by priority desc, insert at correct position
          if (filters.sort === "priority" && filters.order === "desc") {
            const insertIndex = prev.findIndex((task) => task.priority < newTask.priority);
            if (insertIndex === -1) {
              return [...prev, newTask];
            }
            return [...prev.slice(0, insertIndex), newTask, ...prev.slice(insertIndex)];
          }
          // Otherwise add at the beginning
          return [newTask, ...prev];
        });

        // Update pagination total
        setPagination((prev) => (prev ? { ...prev, total: prev.total + 1 } : null));

        setError(null);
        return newTask;
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    [listId, filters.sort, filters.order, handleError]
  );

  const updateTaskStatusAction = useCallback(
    async (taskId: string, status: TaskStatus): Promise<void> => {
      // Optimistic update
      const previousTasks = tasks;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                doneAt: status === 2 ? new Date().toISOString() : null,
              }
            : task
        )
      );

      try {
        await apiUpdateTaskStatus(taskId, status);
        setError(null);

        // If filtering by status and task no longer matches, remove it
        if (filters.status !== null && filters.status !== status) {
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
          setPagination((prev) => (prev ? { ...prev, total: prev.total - 1 } : null));
        }
      } catch (err) {
        // Rollback on error
        setTasks(previousTasks);
        handleError(err);
        throw err;
      }
    },
    [tasks, filters.status, handleError]
  );

  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!listId) return;

    setIsLoading(true);

    try {
      const response = await fetchTasks(listId, {
        ...filters,
        limit: TASKS_PAGE_SIZE,
        offset: 0,
      });

      setTasks(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [listId, filters, handleError]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    tasks,
    tasksByPriority,
    filters,
    isLoading,
    isLoadingMore,
    hasMore,
    pagination,
    error,
    totalCount,

    // Actions
    setFilters,
    resetFilters,
    loadMore,
    createTask: createTaskAction,
    updateTaskStatus: updateTaskStatusAction,
    refreshTasks,
    clearError,
  };
}
