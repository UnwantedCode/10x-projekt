import type { Database } from "./db/database.types";

// =============================================================================
// Database Entity Types (Row types from Supabase)
// =============================================================================

type ProfileEntity = Database["public"]["Tables"]["profiles"]["Row"];
type ListEntity = Database["public"]["Tables"]["lists"]["Row"];
type TaskEntity = Database["public"]["Tables"]["tasks"]["Row"];
type AIInteractionEntity = Database["public"]["Tables"]["ai_interactions"]["Row"];

// =============================================================================
// Shared Types
// =============================================================================

/**
 * Standard pagination metadata for list responses
 */
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Standard success response for delete operations
 */
export interface SuccessResponseDTO {
  success: boolean;
}

/**
 * Standard error response format
 */
export interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}

// =============================================================================
// Profile DTOs and Commands
// =============================================================================

/**
 * Profile DTO - represents user profile in API responses
 * Maps from ProfileEntity with camelCase field names
 */
export interface ProfileDTO {
  id: ProfileEntity["id"];
  activeListId: ProfileEntity["active_list_id"];
  onboardingCompletedAt: ProfileEntity["onboarding_completed_at"];
  onboardingVersion: ProfileEntity["onboarding_version"];
  createdAt: ProfileEntity["created_at"];
  updatedAt: ProfileEntity["updated_at"];
}

/**
 * Command for updating user profile (PATCH /api/profile)
 */
export interface UpdateProfileCommand {
  activeListId: string | null;
}

/**
 * Command for completing onboarding (POST /api/profile/onboarding/complete)
 */
export interface CompleteOnboardingCommand {
  version: number;
}

// =============================================================================
// List DTOs and Commands
// =============================================================================

/**
 * List DTO - represents a task list in API responses
 * Maps from ListEntity with camelCase field names, excludes user_id
 */
export interface ListDTO {
  id: ListEntity["id"];
  name: ListEntity["name"];
  createdAt: ListEntity["created_at"];
  updatedAt: ListEntity["updated_at"];
}

/**
 * Response for GET /api/lists - paginated list of lists
 */
export interface ListsResponseDTO {
  data: ListDTO[];
  pagination: PaginationDTO;
}

/**
 * Command for creating a new list (POST /api/lists)
 */
export interface CreateListCommand {
  name: string;
}

/**
 * Command for updating a list (PATCH /api/lists/:id)
 */
export interface UpdateListCommand {
  name: string;
}

// =============================================================================
// Task DTOs and Commands
// =============================================================================

/**
 * Task priority values
 * 1 = low, 2 = medium, 3 = high
 */
export type TaskPriority = 1 | 2 | 3;

/**
 * Task status values
 * 1 = todo, 2 = done
 */
export type TaskStatus = 1 | 2;

/**
 * Task DTO - represents a task in API responses
 * Maps from TaskEntity with camelCase field names, excludes user_id and search_text
 */
export interface TaskDTO {
  id: TaskEntity["id"];
  listId: TaskEntity["list_id"];
  title: TaskEntity["title"];
  description: TaskEntity["description"];
  priority: TaskEntity["priority"];
  status: TaskEntity["status"];
  sortOrder: TaskEntity["sort_order"];
  doneAt: TaskEntity["done_at"];
  createdAt: TaskEntity["created_at"];
  updatedAt: TaskEntity["updated_at"];
}

/**
 * Response for GET /api/lists/:listId/tasks - paginated list of tasks
 */
export interface TasksResponseDTO {
  data: TaskDTO[];
  pagination: PaginationDTO;
}

/**
 * Command for creating a new task (POST /api/lists/:listId/tasks)
 */
export interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority: TaskPriority;
}

/**
 * Command for updating a task (PATCH /api/tasks/:id)
 * All fields are optional - only provided fields will be updated
 */
export interface UpdateTaskCommand {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  sortOrder?: number;
}

/**
 * Single task order entry for reordering
 */
export interface TaskOrderItem {
  id: string;
  sortOrder: number;
}

/**
 * Command for bulk reordering tasks (POST /api/lists/:listId/tasks/reorder)
 */
export interface ReorderTasksCommand {
  taskOrders: TaskOrderItem[];
}

/**
 * Response for POST /api/lists/:listId/tasks/reorder
 */
export interface ReorderTasksResponseDTO {
  success: boolean;
  updatedCount: number;
}

// =============================================================================
// AI Interaction DTOs and Commands
// =============================================================================

/**
 * AI decision values
 * 1 = accepted, 2 = modified, 3 = rejected
 */
export type AIDecision = 1 | 2 | 3;

/**
 * Command for requesting AI priority suggestion (POST /api/ai/suggest)
 * taskId is optional - when null, use during task creation
 */
export interface AISuggestCommand {
  taskId: string | null;
  title: string;
  description?: string | null;
}

/**
 * Response for POST /api/ai/suggest - AI priority suggestion
 */
export interface AISuggestionDTO {
  interactionId: AIInteractionEntity["id"];
  suggestedPriority: AIInteractionEntity["suggested_priority"];
  justification: NonNullable<AIInteractionEntity["justification"]>;
  justificationTags: string[];
  model: AIInteractionEntity["model"];
  createdAt: AIInteractionEntity["created_at"];
}

/**
 * Command for recording decision on AI suggestion (PATCH /api/ai-interactions/:id)
 *
 * Decision values and field requirements:
 * - decision=1 (accepted): finalPriority and rejectedReason must be null
 * - decision=2 (modified): finalPriority required, rejectedReason must be null
 * - decision=3 (rejected): rejectedReason required, finalPriority must be null
 */
export interface RecordAIDecisionCommand {
  decision: AIDecision;
  finalPriority?: TaskPriority | null;
  rejectedReason?: string | null;
}

/**
 * AI Interaction DTO - represents AI interaction history in API responses
 * Maps from AIInteractionEntity with camelCase field names, excludes user_id and prompt_hash
 */
export interface AIInteractionDTO {
  id: AIInteractionEntity["id"];
  taskId: AIInteractionEntity["task_id"];
  model: AIInteractionEntity["model"];
  suggestedPriority: AIInteractionEntity["suggested_priority"];
  justification: AIInteractionEntity["justification"];
  justificationTags: string[];
  decision: AIInteractionEntity["decision"];
  decidedAt: AIInteractionEntity["decided_at"];
  finalPriority: AIInteractionEntity["final_priority"];
  rejectedReason: AIInteractionEntity["rejected_reason"];
  createdAt: AIInteractionEntity["created_at"];
}

/**
 * Response for GET /api/tasks/:taskId/ai-interactions - paginated list of interactions
 */
export interface AIInteractionsResponseDTO {
  data: AIInteractionDTO[];
  pagination: PaginationDTO;
}

// =============================================================================
// Query Parameter Types
// =============================================================================

/**
 * Query parameters for GET /api/lists
 */
export interface ListsQueryParams {
  limit?: number;
  offset?: number;
}

/**
 * Sort fields for tasks
 */
export type TaskSortField = "priority" | "sort_order" | "created_at";

/**
 * Sort direction
 */
export type SortOrder = "asc" | "desc";

/**
 * Query parameters for GET /api/lists/:listId/tasks
 */
export interface TasksQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sort?: TaskSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for GET /api/tasks/:taskId/ai-interactions
 */
export interface AIInteractionsQueryParams {
  limit?: number;
  offset?: number;
}
