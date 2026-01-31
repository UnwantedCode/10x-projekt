import type { SupabaseClient } from "@/db/supabase.client";
import type {
  TaskDTO,
  TasksResponseDTO,
  TasksQueryParams,
  CreateTaskCommand,
  UpdateTaskCommand,
  ReorderTasksCommand,
  ReorderTasksResponseDTO,
} from "@/types";

/**
 * Default query parameters for tasks
 */
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const DEFAULT_SORT = "sort_order" as const;
const DEFAULT_ORDER = "asc" as const;

/**
 * Result type for verifying list ownership
 */
type VerifyListResult = { success: true } | { success: false; error: "not_found" | "database_error"; message: string };

/**
 * Verifies that a list exists and belongs to the authenticated user
 * RLS handles the ownership check automatically
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list to verify
 * @returns VerifyListResult indicating success or error
 */
export async function verifyListOwnership(supabase: SupabaseClient, listId: string): Promise<VerifyListResult> {
  const { data, error } = await supabase.from("lists").select("id").eq("id", listId).single();

  if (error) {
    // PGRST116 = no rows found (list not found or RLS blocked)
    if (error.code === "PGRST116") {
      return {
        success: false,
        error: "not_found",
        message: "List not found",
      };
    }
    console.error("Database error verifying list ownership:", error);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  if (!data) {
    return {
      success: false,
      error: "not_found",
      message: "List not found",
    };
  }

  return { success: true };
}

/**
 * Fetches tasks for a list with filtering, sorting, and pagination
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list to fetch tasks from
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns TasksResponseDTO with tasks and pagination metadata
 * @throws Error if database query fails
 */
export async function getTasksByListId(
  supabase: SupabaseClient,
  listId: string,
  params: TasksQueryParams
): Promise<TasksResponseDTO> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? DEFAULT_OFFSET;
  const sort = params.sort ?? DEFAULT_SORT;
  const order = params.order ?? DEFAULT_ORDER;

  // Build query with filters (status filter only when explicitly requested; omit = show all)
  let query = supabase
    .from("tasks")
    .select("id, list_id, title, description, priority, status, sort_order, done_at, created_at, updated_at", {
      count: "exact",
    })
    .eq("list_id", listId);

  if (params.status !== undefined && params.status !== null) {
    query = query.eq("status", params.status);
  }

  // Apply priority filter if provided
  if (params.priority !== undefined) {
    query = query.eq("priority", params.priority);
  }

  // Apply text search if provided (uses search_text column with ILIKE)
  if (params.search && params.search.trim()) {
    query = query.ilike("search_text", `%${params.search.trim()}%`);
  }

  // Apply sorting
  const ascending = order === "asc";
  query = query.order(sort, { ascending });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  const tasks: TaskDTO[] = (data ?? []).map((row) => ({
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    sortOrder: row.sort_order,
    doneAt: row.done_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    data: tasks,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  };
}

/**
 * Internal task entity type for service operations
 */
interface TaskEntity {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  priority: number;
  status: number;
  sort_order: number;
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches a task by ID
 * RLS ensures user can only see their own tasks
 *
 * @param supabase - Supabase client instance (with user session)
 * @param taskId - UUID of the task to fetch
 * @returns TaskEntity if found, null if not found
 */
export async function getTaskById(supabase: SupabaseClient, taskId: string): Promise<TaskEntity | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, list_id, title, description, priority, status, sort_order, done_at, created_at, updated_at")
    .eq("id", taskId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Checks if a sort order value is already used by another task in the same list
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list
 * @param sortOrder - Sort order value to check
 * @param excludeTaskId - Task ID to exclude from the check (the task being updated)
 * @returns true if conflict exists, false otherwise
 */
export async function checkSortOrderConflict(
  supabase: SupabaseClient,
  listId: string,
  sortOrder: number,
  excludeTaskId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("list_id", listId)
    .eq("sort_order", sortOrder)
    .neq("id", excludeTaskId)
    .single();

  return data !== null;
}

/**
 * Result type for create task operation
 */
type CreateTaskResult =
  | { success: true; data: TaskDTO }
  | { success: false; error: "list_not_found" | "database_error"; message: string };

/**
 * Creates a new task in the specified list
 *
 * @param supabase - Supabase client instance (with user session)
 * @param userId - UUID of the user creating the task
 * @param listId - UUID of the list to add the task to
 * @param command - Create task command with title, description, and priority
 * @returns CreateTaskResult with created task or error
 */
export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  listId: string,
  command: CreateTaskCommand
): Promise<CreateTaskResult> {
  // Get the maximum sort_order for this list to place new task at the end
  const { data: maxOrderData } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxOrderData?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      list_id: listId,
      title: command.title,
      description: command.description ?? null,
      priority: command.priority,
      status: 1, // TODO status
      sort_order: nextSortOrder,
    })
    .select("id, list_id, title, description, priority, status, sort_order, done_at, created_at, updated_at")
    .single();

  if (error) {
    // Foreign key violation (list doesn't exist)
    if (error.code === "23503") {
      return {
        success: false,
        error: "list_not_found",
        message: "List not found",
      };
    }
    console.error("Database error creating task:", error);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  return {
    success: true,
    data: {
      id: data.id,
      listId: data.list_id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      sortOrder: data.sort_order,
      doneAt: data.done_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Result type for update task operation
 */
type UpdateTaskResult =
  | { success: true; data: TaskDTO }
  | { success: false; error: "not_found" | "sort_order_conflict" | "database_error"; message: string };

/**
 * Updates an existing task
 *
 * @param supabase - Supabase client instance (with user session)
 * @param taskId - UUID of the task to update
 * @param command - Update task command with optional fields
 * @returns UpdateTaskResult with updated task or error
 */
export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  command: UpdateTaskCommand
): Promise<UpdateTaskResult> {
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

  if (command.title !== undefined) {
    updateData.title = command.title;
  }
  if (command.description !== undefined) {
    updateData.description = command.description;
  }
  if (command.priority !== undefined) {
    updateData.priority = command.priority;
  }
  if (command.status !== undefined) {
    updateData.status = command.status;
    // Set done_at when marking as done (status=2), clear when marking as todo (status=1)
    updateData.done_at = command.status === 2 ? new Date().toISOString() : null;
  }
  if (command.sortOrder !== undefined) {
    updateData.sort_order = command.sortOrder;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .select("id, list_id, title, description, priority, status, sort_order, done_at, created_at, updated_at")
    .single();

  if (error) {
    // PGRST116 = no rows found (task not found or RLS blocked)
    if (error.code === "PGRST116") {
      return {
        success: false,
        error: "not_found",
        message: "Task not found",
      };
    }
    console.error("Database error updating task:", error);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  return {
    success: true,
    data: {
      id: data.id,
      listId: data.list_id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      sortOrder: data.sort_order,
      doneAt: data.done_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Result type for delete task operation
 */
type DeleteTaskResult = { success: true } | { success: false; error: "not_found" | "database_error"; message: string };

/**
 * Deletes a task
 *
 * @param supabase - Supabase client instance (with user session)
 * @param taskId - UUID of the task to delete
 * @returns DeleteTaskResult with success or error
 */
export async function deleteTask(supabase: SupabaseClient, taskId: string): Promise<DeleteTaskResult> {
  const { error, count } = await supabase.from("tasks").delete({ count: "exact" }).eq("id", taskId);

  if (error) {
    console.error("Database error deleting task:", error);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  // RLS ensures user can only delete their own tasks
  // count === 0 means task not found or doesn't belong to user
  if (count === 0) {
    return {
      success: false,
      error: "not_found",
      message: "Task not found or doesn't belong to user",
    };
  }

  return { success: true };
}

/**
 * Result type for reorder tasks operation
 */
type ReorderTasksResult =
  | { success: true; data: ReorderTasksResponseDTO }
  | { success: false; error: "invalid_tasks" | "database_error"; message: string };

/**
 * Reorders tasks in a list by updating their sort_order values
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list containing the tasks
 * @param command - Reorder command with task IDs and new sort orders
 * @returns ReorderTasksResult with updated count or error
 */
export async function reorderTasks(
  supabase: SupabaseClient,
  listId: string,
  command: ReorderTasksCommand
): Promise<ReorderTasksResult> {
  const taskIds = command.taskOrders.map((item) => item.id);

  // Verify all tasks belong to the specified list and user
  const { data: existingTasks, error: fetchError } = await supabase
    .from("tasks")
    .select("id")
    .eq("list_id", listId)
    .in("id", taskIds);

  if (fetchError) {
    console.error("Database error fetching tasks for reorder:", fetchError);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  const existingTaskIds = new Set(existingTasks?.map((t) => t.id) ?? []);
  const invalidTaskIds = taskIds.filter((id) => !existingTaskIds.has(id));

  if (invalidTaskIds.length > 0) {
    return {
      success: false,
      error: "invalid_tasks",
      message: "One or more tasks not found in the specified list",
    };
  }

  // Update sort_order for each task
  let updatedCount = 0;
  for (const item of command.taskOrders) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ sort_order: item.sortOrder })
      .eq("id", item.id)
      .eq("list_id", listId);

    if (updateError) {
      console.error("Database error updating task sort order:", updateError);
      return {
        success: false,
        error: "database_error",
        message: "An unexpected error occurred while updating task order",
      };
    }
    updatedCount++;
  }

  return {
    success: true,
    data: {
      success: true,
      updatedCount,
    },
  };
}
