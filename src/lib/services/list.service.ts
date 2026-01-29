import type { SupabaseClient } from "@/db/supabase.client";
import type { ListDTO, ListsResponseDTO, CreateListCommand, UpdateListCommand } from "@/types";

/**
 * Result type for create list operation
 */
type CreateListResult =
  | { success: true; data: ListDTO }
  | { success: false; error: "duplicate_name" | "database_error"; message: string };

/**
 * Result type for update list operation
 */
type UpdateListResult =
  | { success: true; data: ListDTO }
  | { success: false; error: "not_found" | "duplicate_name" | "database_error"; message: string };

/**
 * Result type for delete list operation
 */
type DeleteListResult = { success: true } | { success: false; error: "not_found" | "database_error"; message: string };

/**
 * Fetches paginated lists for the authenticated user
 *
 * @param supabase - Supabase client instance (with user session)
 * @param params - Pagination parameters
 * @returns ListsResponseDTO with lists and pagination metadata
 * @throws Error if database query fails
 */
export async function getLists(
  supabase: SupabaseClient,
  params: { limit: number; offset: number }
): Promise<ListsResponseDTO> {
  const { limit, offset } = params;

  const { data, error, count } = await supabase
    .from("lists")
    .select("id, name, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  const lists: ListDTO[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    data: lists,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  };
}

/**
 * Fetches a single list by ID for the authenticated user
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list to fetch
 * @returns ListDTO if found, null if not found
 * @throws Error if database query fails (except for not found)
 */
export async function getListById(supabase: SupabaseClient, listId: string): Promise<ListDTO | null> {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, created_at, updated_at")
    .eq("id", listId)
    .single();

  if (error) {
    // PGRST116 = no rows found (expected for 404)
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Creates a new list for the authenticated user
 *
 * @param supabase - Supabase client instance (with user session)
 * @param userId - UUID of the user creating the list
 * @param command - Create list command with name
 * @returns CreateListResult with created list or error
 */
export async function createList(
  supabase: SupabaseClient,
  userId: string,
  command: CreateListCommand
): Promise<CreateListResult> {
  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: userId,
      name: command.name,
    })
    .select("id, name, created_at, updated_at")
    .single();

  if (error) {
    // Unique constraint violation (PostgreSQL error code 23505)
    if (error.code === "23505") {
      return {
        success: false,
        error: "duplicate_name",
        message: "A list with this name already exists",
      };
    }
    console.error("Database error creating list:", error);
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
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Updates an existing list for the authenticated user
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list to update
 * @param command - Update list command with new name
 * @returns UpdateListResult with updated list or error
 */
export async function updateList(
  supabase: SupabaseClient,
  listId: string,
  command: UpdateListCommand
): Promise<UpdateListResult> {
  const { data, error } = await supabase
    .from("lists")
    .update({ name: command.name })
    .eq("id", listId)
    .select("id, name, created_at, updated_at")
    .single();

  if (error) {
    // PGRST116 = no rows found (list not found or RLS blocked)
    if (error.code === "PGRST116") {
      return {
        success: false,
        error: "not_found",
        message: "List not found",
      };
    }
    // Unique constraint violation (PostgreSQL error code 23505)
    if (error.code === "23505") {
      return {
        success: false,
        error: "duplicate_name",
        message: "A list with this name already exists",
      };
    }
    console.error("Database error updating list:", error);
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
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Deletes a list for the authenticated user
 * Cascades to tasks and ai_interactions via FK constraints
 *
 * @param supabase - Supabase client instance (with user session)
 * @param listId - UUID of the list to delete
 * @returns DeleteListResult with success or error
 */
export async function deleteList(supabase: SupabaseClient, listId: string): Promise<DeleteListResult> {
  const { error, count } = await supabase.from("lists").delete({ count: "exact" }).eq("id", listId);

  if (error) {
    console.error("Database error deleting list:", error);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  // RLS ensures user can only delete their own lists
  // count === 0 means list not found or doesn't belong to user
  if (count === 0) {
    return {
      success: false,
      error: "not_found",
      message: "List not found or doesn't belong to user",
    };
  }

  return { success: true };
}
