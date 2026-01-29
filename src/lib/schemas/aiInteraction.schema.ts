import { z } from "zod";

// =============================================================================
// POST /api/ai/suggest - AI Suggest Schemas
// =============================================================================

/**
 * Schema for AI suggest endpoint request body
 * POST /api/ai/suggest
 */
export const aiSuggestSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format").nullable(),
  title: z
    .string({ required_error: "Title is required" })
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .trim(),
  description: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || null),
});

export type AISuggestInput = z.infer<typeof aiSuggestSchema>;

// =============================================================================
// PATCH /api/ai-interactions/:id - Record Decision Schemas
// =============================================================================

/**
 * Schema for AI interaction ID path parameter
 * PATCH /api/ai-interactions/:id
 */
export const aiInteractionIdParamSchema = z.object({
  id: z.string().uuid("Invalid interaction ID format"),
});

export type AIInteractionIdParam = z.infer<typeof aiInteractionIdParamSchema>;

/**
 * Schema for recording AI decision
 * Uses discriminated union to enforce decision field consistency rules:
 * - decision=1 (accepted): finalPriority and rejectedReason must be null
 * - decision=2 (modified): finalPriority required (1-3), rejectedReason must be null
 * - decision=3 (rejected): rejectedReason required (max 300 chars), finalPriority must be null
 */
export const recordAIDecisionSchema = z.discriminatedUnion("decision", [
  // Decision 1: Accepted - no additional fields allowed
  z.object({
    decision: z.literal(1),
    finalPriority: z.null().optional(),
    rejectedReason: z.null().optional(),
  }),
  // Decision 2: Modified - finalPriority required
  z.object({
    decision: z.literal(2),
    finalPriority: z.union([z.literal(1), z.literal(2), z.literal(3)], {
      errorMap: () => ({ message: "Final priority must be 1, 2, or 3" }),
    }),
    rejectedReason: z.null().optional(),
  }),
  // Decision 3: Rejected - rejectedReason required
  z.object({
    decision: z.literal(3),
    finalPriority: z.null().optional(),
    rejectedReason: z
      .string({ required_error: "Rejected reason is required when decision is rejected" })
      .min(1, "Rejected reason is required when decision is rejected")
      .max(300, "Rejected reason must not exceed 300 characters"),
  }),
]);

export type RecordAIDecisionInput = z.infer<typeof recordAIDecisionSchema>;

// =============================================================================
// GET /api/tasks/:taskId/ai-interactions - Get AI Interactions Schemas
// =============================================================================

/**
 * Schema for taskId path parameter
 * GET /api/tasks/:taskId/ai-interactions
 */
export const taskIdPathParamSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format"),
});

export type TaskIdPathParam = z.infer<typeof taskIdPathParamSchema>;

/**
 * Schema for AI interactions query parameters
 * Supports pagination with limit and offset
 */
export const aiInteractionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type AIInteractionsQueryInput = z.infer<typeof aiInteractionsQuerySchema>;
