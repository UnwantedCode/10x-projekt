import type { SupabaseClient } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";
import type {
  AISuggestCommand,
  AISuggestionDTO,
  AIInteractionDTO,
  AIInteractionsResponseDTO,
  AIInteractionsQueryParams,
  RecordAIDecisionCommand,
  TaskPriority,
} from "@/types";
import { createHash } from "crypto";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_REQUEST_TIMEOUT_MS = 30000;

// =============================================================================
// Types
// =============================================================================

type AIInteractionEntity = Database["public"]["Tables"]["ai_interactions"]["Row"];

/**
 * Internal type for AI service response (parsed from OpenRouter)
 */
interface AIServiceResponse {
  suggestedPriority: TaskPriority;
  justification: string;
  justificationTags: string[];
}

/**
 * Result type for suggest priority operation
 */
type SuggestPriorityResult =
  | { success: true; data: AISuggestionDTO }
  | { success: false; error: "task_not_found" | "ai_service_error" | "database_error"; message: string };

/**
 * Result type for record decision operation
 */
type RecordDecisionResult =
  | { success: true; data: AIInteractionDTO }
  | { success: false; error: "not_found" | "already_decided" | "database_error"; message: string };

// =============================================================================
// DTO Mapper
// =============================================================================

/**
 * Maps database entity to AIInteractionDTO
 * Converts snake_case to camelCase and parses justification_tags JSON
 */
function mapEntityToDTO(entity: AIInteractionEntity): AIInteractionDTO {
  let justificationTags: string[] = [];
  if (entity.justification_tags) {
    if (Array.isArray(entity.justification_tags)) {
      justificationTags = entity.justification_tags.filter((tag): tag is string => typeof tag === "string");
    }
  }

  return {
    id: entity.id,
    taskId: entity.task_id,
    model: entity.model,
    suggestedPriority: entity.suggested_priority,
    justification: entity.justification,
    justificationTags,
    decision: entity.decision,
    decidedAt: entity.decided_at,
    finalPriority: entity.final_priority,
    rejectedReason: entity.rejected_reason,
    createdAt: entity.created_at,
  };
}

// =============================================================================
// OpenRouter Helper Functions
// =============================================================================

/**
 * Sanitizes text to prevent prompt injection attacks
 * Removes potential control characters and limits length
 */
function sanitizeForPrompt(text: string, maxLength = 500): string {
  return text.replace(/```/g, "").replace(/\{/g, "(").replace(/\}/g, ")").substring(0, maxLength);
}

/**
 * Generates SHA256 hash of prompt for caching/logging purposes
 */
function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

/**
 * Builds the AI prompt from title and description
 */
function buildPrompt(title: string, description: string | null): string {
  const sanitizedTitle = sanitizeForPrompt(title, 200);
  const sanitizedDescription = description ? sanitizeForPrompt(description, 500) : "Brak opisu";

  return `Jesteś asystentem do zarządzania zadaniami. Przeanalizuj poniższe zadanie i zasugeruj priorytet (1=niski, 2=średni, 3=wysoki).

Tytuł: ${sanitizedTitle}
Opis: ${sanitizedDescription}

Odpowiedz w formacie JSON:
{
  "priority": <1|2|3>,
  "justification": "<krótkie uzasadnienie po polsku, max 300 znaków>",
  "tags": ["<tag1>", "<tag2>"]
}

Dostępne tagi: deadline, impact, complexity, stakeholders, dependencies, risk`;
}

/**
 * Validates and normalizes the parsed AI response
 */
function validateAndNormalizeResponse(parsed: unknown): AIServiceResponse {
  const obj = parsed as Record<string, unknown>;

  // Validate priority
  const priority = obj.priority;
  let suggestedPriority: TaskPriority = 2;
  if (priority === 1 || priority === 2 || priority === 3) {
    suggestedPriority = priority;
  }

  // Validate justification
  const justification =
    typeof obj.justification === "string" ? obj.justification.substring(0, 300) : "Brak uzasadnienia";

  // Validate tags
  const validTags = ["deadline", "impact", "complexity", "stakeholders", "dependencies", "risk"];
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((tag): tag is string => typeof tag === "string" && validTags.includes(tag))
    : [];

  return {
    suggestedPriority,
    justification,
    justificationTags: tags,
  };
}

/**
 * Parses AI response JSON with fallback handling
 * Attempts to extract JSON from response text if direct parsing fails
 */
function parseAIResponse(responseText: string): AIServiceResponse {
  // Try direct JSON parsing
  try {
    const parsed = JSON.parse(responseText);
    return validateAndNormalizeResponse(parsed);
  } catch {
    // Try to extract JSON from text
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateAndNormalizeResponse(parsed);
      } catch {
        // Fall through to default
      }
    }
  }

  // Fallback to default values
  console.error("Failed to parse AI response, using defaults:", responseText);
  return {
    suggestedPriority: 2,
    justification: "Nie udało się przeanalizować zadania",
    justificationTags: [],
  };
}

/**
 * Calls OpenRouter API to get AI suggestion
 */
async function callOpenRouter(prompt: string): Promise<AIServiceResponse> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://10x-projekt.local",
        "X-Title": "10x AI Task Manager",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenRouter API");
    }

    return parseAIResponse(content);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI service request timed out");
    }

    throw error;
  }
}

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Verifies that a task exists and belongs to the user via RLS
 *
 * @param supabase - Supabase client instance (with user session)
 * @param taskId - UUID of the task to verify
 * @returns true if task exists and belongs to user, false otherwise
 */
export async function verifyTaskExists(supabase: SupabaseClient, taskId: string): Promise<boolean> {
  const { data, error } = await supabase.from("tasks").select("id").eq("id", taskId).single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === "PGRST116") {
      return false;
    }
    throw error;
  }

  return data !== null;
}

/**
 * Saves AI interaction to the database
 */
async function saveInteraction(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  prompt: string,
  response: AIServiceResponse
): Promise<string> {
  const { data, error } = await supabase
    .from("ai_interactions")
    .insert({
      user_id: userId,
      task_id: taskId,
      model: DEFAULT_MODEL,
      prompt_hash: hashPrompt(prompt),
      suggested_priority: response.suggestedPriority,
      justification: response.justification,
      justification_tags: response.justificationTags,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Database error saving AI interaction:", error);
    throw error;
  }

  return data.id;
}

// =============================================================================
// Exported Service Functions
// =============================================================================

/**
 * Suggests task priority using AI analysis
 *
 * @param supabase - Supabase client instance (with user session)
 * @param userId - UUID of the authenticated user
 * @param command - Command with taskId (optional), title, and description
 * @returns SuggestPriorityResult with AI suggestion or error
 */
export async function suggestPriority(
  supabase: SupabaseClient,
  userId: string,
  command: AISuggestCommand
): Promise<SuggestPriorityResult> {
  // 1. If taskId provided, verify task exists and belongs to user
  if (command.taskId) {
    try {
      const taskExists = await verifyTaskExists(supabase, command.taskId);
      if (!taskExists) {
        return {
          success: false,
          error: "task_not_found",
          message: "Task not found",
        };
      }
    } catch (error) {
      console.error("Database error verifying task:", error);
      return {
        success: false,
        error: "database_error",
        message: "An unexpected error occurred",
      };
    }
  }

  // 2. Build prompt and call AI
  const prompt = buildPrompt(command.title, command.description ?? null);
  let aiResponse: AIServiceResponse;

  try {
    aiResponse = await callOpenRouter(prompt);
  } catch (error) {
    console.error("AI service error:", error);
    return {
      success: false,
      error: "ai_service_error",
      message: "AI service temporarily unavailable",
    };
  }

  // 3. If taskId provided, save interaction to database
  let interactionId: string;
  const createdAt = new Date().toISOString();

  if (command.taskId) {
    try {
      interactionId = await saveInteraction(supabase, userId, command.taskId, prompt, aiResponse);
    } catch {
      return {
        success: false,
        error: "database_error",
        message: "An unexpected error occurred",
      };
    }
  } else {
    // Generate temporary UUID for non-persisted interaction
    interactionId = crypto.randomUUID();
  }

  // 4. Return suggestion DTO
  return {
    success: true,
    data: {
      interactionId,
      suggestedPriority: aiResponse.suggestedPriority,
      justification: aiResponse.justification,
      justificationTags: aiResponse.justificationTags,
      model: DEFAULT_MODEL,
      createdAt,
    },
  };
}

/**
 * Records the user's decision on an AI suggestion
 *
 * @param supabase - Supabase client instance (with user session)
 * @param interactionId - UUID of the AI interaction
 * @param command - Decision command with decision type and conditional fields
 * @returns RecordDecisionResult with updated interaction or error
 */
export async function recordDecision(
  supabase: SupabaseClient,
  interactionId: string,
  command: RecordAIDecisionCommand
): Promise<RecordDecisionResult> {
  // 1. Fetch interaction to verify existence and check if decision already recorded
  // RLS ensures user can only access their own interactions
  const { data: existing, error: fetchError } = await supabase
    .from("ai_interactions")
    .select("*")
    .eq("id", interactionId)
    .single();

  if (fetchError) {
    // PGRST116 = no rows found (not found or RLS blocked)
    if (fetchError.code === "PGRST116") {
      return {
        success: false,
        error: "not_found",
        message: "AI interaction not found",
      };
    }
    console.error("Database error fetching AI interaction:", fetchError);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  // 2. Check if decision already recorded
  if (existing.decision !== null) {
    return {
      success: false,
      error: "already_decided",
      message: "Decision already recorded for this interaction",
    };
  }

  // 3. Build update object based on decision type
  const updateData: {
    decision: number;
    decided_at: string;
    final_priority: number | null;
    rejected_reason: string | null;
  } = {
    decision: command.decision,
    decided_at: new Date().toISOString(),
    final_priority: null,
    rejected_reason: null,
  };

  // Set conditional fields based on decision type
  if (command.decision === 2 && command.finalPriority !== undefined && command.finalPriority !== null) {
    updateData.final_priority = command.finalPriority;
  }

  if (command.decision === 3 && command.rejectedReason !== undefined && command.rejectedReason !== null) {
    updateData.rejected_reason = command.rejectedReason;
  }

  // 4. Update interaction
  const { data: updated, error: updateError } = await supabase
    .from("ai_interactions")
    .update(updateData)
    .eq("id", interactionId)
    .select("*")
    .single();

  if (updateError) {
    console.error("Database error updating AI interaction:", updateError);
    return {
      success: false,
      error: "database_error",
      message: "An unexpected error occurred",
    };
  }

  // 5. Return mapped DTO
  return {
    success: true,
    data: mapEntityToDTO(updated),
  };
}

/**
 * Fetches an AI interaction by ID
 *
 * @param supabase - Supabase client instance (with user session)
 * @param interactionId - UUID of the AI interaction
 * @returns AIInteractionDTO if found, null otherwise
 */
export async function getInteractionById(
  supabase: SupabaseClient,
  interactionId: string
): Promise<AIInteractionDTO | null> {
  const { data, error } = await supabase.from("ai_interactions").select("*").eq("id", interactionId).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return mapEntityToDTO(data);
}

/**
 * Fetches AI interactions for a specific task with pagination
 *
 * @param supabase - Supabase client instance (with user session)
 * @param taskId - UUID of the task
 * @param params - Query parameters for pagination (limit, offset)
 * @returns AIInteractionsResponseDTO with interactions and pagination metadata
 */
export async function getAIInteractionsForTask(
  supabase: SupabaseClient,
  taskId: string,
  params: AIInteractionsQueryParams
): Promise<AIInteractionsResponseDTO> {
  const limit = params.limit ?? 10;
  const offset = params.offset ?? 0;

  // Fetch interactions with pagination and count
  const { data, error, count } = await supabase
    .from("ai_interactions")
    .select("*", { count: "exact" })
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Database error fetching AI interactions:", error);
    throw new Error("Failed to fetch AI interactions");
  }

  const interactions: AIInteractionDTO[] = (data ?? []).map(mapEntityToDTO);

  return {
    data: interactions,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  };
}
