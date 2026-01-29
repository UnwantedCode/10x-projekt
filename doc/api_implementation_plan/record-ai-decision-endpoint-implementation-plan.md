# API Endpoint Implementation Plan: Record AI Decision

## 1. Endpoint Overview

This endpoint allows users to record their decision on an AI-generated priority suggestion for a task. Users can accept, modify, or reject the AI suggestion, with appropriate metadata stored for analytics and feedback purposes.

**Route**: `PATCH /api/ai-interactions/:id`

**Purpose**: Records the user's decision (accepted/modified/rejected) on an AI suggestion, updating the `ai_interactions` table with the decision outcome.

## 2. Request Details

### HTTP Method

`PATCH`

### URL Structure

`/api/ai-interactions/{id}`

### Parameters

**Path Parameters (Required)**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The unique identifier of the AI interaction |

**Request Body**:

```json
{
  "decision": 1,
  "finalPriority": 2,
  "rejectedReason": "string | null"
}
```

### Field Validation Rules

| Field            | Type           | Required    | Constraints                                                   |
| ---------------- | -------------- | ----------- | ------------------------------------------------------------- |
| `decision`       | number         | Yes         | Must be 1, 2, or 3                                            |
| `finalPriority`  | number \| null | Conditional | Required if decision=2, must be null otherwise. Values: 1-3   |
| `rejectedReason` | string \| null | Conditional | Required if decision=3, must be null otherwise. Max 300 chars |

### Decision Field Consistency Rules

| Decision Value | Meaning  | finalPriority  | rejectedReason           |
| -------------- | -------- | -------------- | ------------------------ |
| 1              | Accepted | Must be null   | Must be null             |
| 2              | Modified | Required (1-3) | Must be null             |
| 3              | Rejected | Must be null   | Required (max 300 chars) |

## 3. Utilized Types

### Existing Types from `src/types.ts`

```typescript
// Command model for request validation
interface RecordAIDecisionCommand {
  decision: AIDecision;
  finalPriority?: TaskPriority | null;
  rejectedReason?: string | null;
}

// Response DTO
interface AIInteractionDTO {
  id: string;
  taskId: string;
  model: string;
  suggestedPriority: number;
  justification: string | null;
  justificationTags: string[];
  decision: number | null;
  decidedAt: string | null;
  finalPriority: number | null;
  rejectedReason: string | null;
  createdAt: string;
}

// Type aliases
type AIDecision = 1 | 2 | 3;
type TaskPriority = 1 | 2 | 3;
```

### Zod Schemas to Create

```typescript
// Path parameter schema
const pathParamsSchema = z.object({
  id: z.string().uuid("Invalid interaction ID format"),
});

// Request body schema with discriminated union for decision consistency
const recordAIDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal(1),
    finalPriority: z.null().optional(),
    rejectedReason: z.null().optional(),
  }),
  z.object({
    decision: z.literal(2),
    finalPriority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    rejectedReason: z.null().optional(),
  }),
  z.object({
    decision: z.literal(3),
    finalPriority: z.null().optional(),
    rejectedReason: z.string().min(1).max(300),
  }),
]);
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "uuid",
  "taskId": "uuid",
  "model": "string",
  "suggestedPriority": 2,
  "justification": "string",
  "justificationTags": ["tag1", "tag2"],
  "decision": 1,
  "decidedAt": "2024-01-15T10:30:00Z",
  "finalPriority": null,
  "rejectedReason": null,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Error Responses

| Status Code | Condition                 | Response Body                                                                          |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------- |
| 400         | Invalid input data        | `{ "error": "Bad Request", "message": "...", "details": {...} }`                       |
| 401         | User not authenticated    | `{ "error": "Unauthorized", "message": "Authentication required" }`                    |
| 404         | Interaction not found     | `{ "error": "Not Found", "message": "AI interaction not found" }`                      |
| 409         | Decision already recorded | `{ "error": "Conflict", "message": "Decision already recorded for this interaction" }` |

## 5. Data Flow

```
┌─────────────────┐
│  Client Request │
│  PATCH /api/    │
│  ai-interactions│
│  /:id           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Middleware    │
│  (Auth Check)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Endpoint   │
│  (Route Handler)│
│                 │
│ 1. Parse params │
│ 2. Validate body│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   AIInteraction Service │
│                         │
│ 1. Find interaction     │
│ 2. Check decision null  │
│ 3. Update with decision │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │
│   (with RLS)    │
│                 │
│ - SELECT query  │
│ - UPDATE query  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Map to DTO &   │
│  Return Response│
└─────────────────┘
```

### Service Layer Operations

1. **Find Interaction**: Query `ai_interactions` table by ID (RLS enforces ownership)
2. **Check Decision Status**: Verify `decision` field is NULL (not yet decided)
3. **Update Interaction**: Set `decision`, `decided_at`, and conditional fields

## 6. Security Considerations

### Authentication

- User must be authenticated via Supabase Auth
- Access token validated by middleware
- `context.locals.user` populated with authenticated user

### Authorization

- RLS policy on `ai_interactions` table: `using (user_id = auth.uid())`
- User can only access their own interactions
- Attempting to access another user's interaction returns 404 (not 403, to prevent enumeration)

### Input Validation

- UUID format validation for path parameter
- Zod schema validation for request body
- Decision field consistency enforcement
- String length limits for `rejectedReason` (max 300 chars)

### Data Protection

- No sensitive data exposed in error messages
- Use parameterized queries via Supabase client (SQL injection prevention)
- Database CHECK constraint provides additional validation layer

## 7. Error Handling

### Error Scenarios and Responses

| Scenario                            | HTTP Status | Error Type            | Message                                        |
| ----------------------------------- | ----------- | --------------------- | ---------------------------------------------- |
| Invalid UUID format                 | 400         | Bad Request           | Invalid interaction ID format                  |
| Missing decision field              | 400         | Bad Request           | Decision is required                           |
| Invalid decision value              | 400         | Bad Request           | Decision must be 1, 2, or 3                    |
| Inconsistent decision fields        | 400         | Bad Request           | [Specific field requirement message]           |
| rejectedReason exceeds 300 chars    | 400         | Bad Request           | Rejected reason must not exceed 300 characters |
| User not authenticated              | 401         | Unauthorized          | Authentication required                        |
| Interaction not found               | 404         | Not Found             | AI interaction not found                       |
| Interaction belongs to another user | 404         | Not Found             | AI interaction not found                       |
| Decision already recorded           | 409         | Conflict              | Decision already recorded for this interaction |
| Database error                      | 500         | Internal Server Error | An unexpected error occurred                   |

### Error Response Format

```typescript
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

## 8. Performance Considerations

### Database Queries

- Single SELECT query to fetch and verify interaction (indexed by PK)
- Single UPDATE query to record decision
- Both queries benefit from RLS filter on `user_id` (indexed)

### Indexes Used

- Primary key index on `ai_interactions.id`
- Index on `ai_interactions.user_id` (for RLS filtering)

### Optimization Notes

- No N+1 queries - single fetch + single update pattern
- Minimal data transfer - only update changed fields
- Consider transaction if future requirements add related updates

## 9. Implementation Steps

### Step 1: Create Zod Validation Schemas

Create `src/lib/schemas/aiInteraction.schema.ts`:

- Path parameter schema for UUID validation
- Request body schema with discriminated union for decision consistency
- Export schemas for use in endpoint

### Step 2: Create AI Interaction Service

Create `src/lib/services/aiInteraction.service.ts`:

- `recordDecision(supabase, interactionId, command)` method
- Handle finding interaction (with null check for 404)
- Check if decision already exists (for 409)
- Update interaction with decision data
- Map database row to DTO

### Step 3: Create DTO Mapper

Add to service or create `src/lib/mappers/aiInteraction.mapper.ts`:

- `toAIInteractionDTO(entity)` function
- Handle camelCase transformation
- Parse `justification_tags` JSONB to string array

### Step 4: Create API Endpoint

Create `src/pages/api/ai-interactions/[id].ts`:

- Export `PATCH` handler function
- Export `prerender = false`
- Implement authentication check
- Parse and validate path parameters
- Parse and validate request body
- Call service method
- Return appropriate response

### Step 5: Implement Error Handling

In the endpoint handler:

- Use try-catch for unexpected errors
- Return proper status codes based on service results
- Format error responses consistently

### Step 6: Testing Checklist

Manual testing scenarios:

- [ ] Valid accepted decision (decision=1)
- [ ] Valid modified decision (decision=2, finalPriority set)
- [ ] Valid rejected decision (decision=3, rejectedReason set)
- [ ] Invalid UUID format → 400
- [ ] Missing decision field → 400
- [ ] Inconsistent fields (e.g., decision=1 with finalPriority) → 400
- [ ] rejectedReason > 300 chars → 400
- [ ] Unauthenticated request → 401
- [ ] Non-existent interaction ID → 404
- [ ] Another user's interaction ID → 404
- [ ] Already decided interaction → 409

---

## File Structure Summary

```
src/
├── pages/
│   └── api/
│       └── ai-interactions/
│           └── [id].ts          # PATCH endpoint handler
├── lib/
│   ├── schemas/
│   │   └── aiInteraction.schema.ts  # Zod validation schemas
│   └── services/
│       └── aiInteraction.service.ts # Business logic
└── types.ts                     # Existing types (no changes needed)
```
