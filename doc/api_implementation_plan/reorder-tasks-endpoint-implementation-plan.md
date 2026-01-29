# API Endpoint Implementation Plan: Reorder Tasks

## 1. Endpoint Overview

The `POST /api/lists/:listId/tasks/reorder` endpoint enables bulk reordering of tasks within a specific list. This endpoint supports drag-and-drop functionality in the UI by allowing clients to submit a complete or partial reordering of tasks with their new `sortOrder` values.

The operation is atomic - either all task orders are updated successfully, or none are (transaction rollback on failure).

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/lists/:listId/tasks/reorder`
- **Parameters**:
  - **Required URL Parameter**:
    - `listId` (UUID) - The identifier of the list containing tasks to reorder
  - **Required Body Fields**:
    - `taskOrders` (array) - Array of task order items, each containing:
      - `id` (string/UUID) - Task identifier
      - `sortOrder` (number) - New sort order position (must be > 0)

**Request Body Example:**

```json
{
  "taskOrders": [
    { "id": "550e8400-e29b-41d4-a716-446655440001", "sortOrder": 1 },
    { "id": "550e8400-e29b-41d4-a716-446655440002", "sortOrder": 2 },
    { "id": "550e8400-e29b-41d4-a716-446655440003", "sortOrder": 3 }
  ]
}
```

## 3. Types Used

### Existing Types (from `src/types.ts`)

```typescript
// Single task order entry for reordering
export interface TaskOrderItem {
  id: string;
  sortOrder: number;
}

// Command for bulk reordering tasks
export interface ReorderTasksCommand {
  taskOrders: TaskOrderItem[];
}

// Response for reorder operation
export interface ReorderTasksResponseDTO {
  success: boolean;
  updatedCount: number;
}
```

### Zod Validation Schema (to be created)

```typescript
// In src/lib/schemas/task.schema.ts

import { z } from "zod";

export const taskOrderItemSchema = z.object({
  id: z.string().uuid("Invalid task ID format"),
  sortOrder: z.number().int().positive("Sort order must be a positive integer"),
});

export const reorderTasksSchema = z.object({
  taskOrders: z
    .array(taskOrderItemSchema)
    .min(1, "At least one task order is required")
    .refine(
      (items) => {
        const ids = items.map((item) => item.id);
        return new Set(ids).size === ids.length;
      },
      { message: "Duplicate task IDs are not allowed" }
    )
    .refine(
      (items) => {
        const orders = items.map((item) => item.sortOrder);
        return new Set(orders).size === orders.length;
      },
      { message: "Duplicate sort orders are not allowed" }
    ),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "success": true,
  "updatedCount": 3
}
```

### Error Responses

| Status Code | Error Type   | Response Example                                                                           |
| ----------- | ------------ | ------------------------------------------------------------------------------------------ |
| 400         | Bad Request  | `{ "error": "Bad Request", "message": "Duplicate sort orders are not allowed" }`           |
| 401         | Unauthorized | `{ "error": "Unauthorized", "message": "User not authenticated" }`                         |
| 404         | Not Found    | `{ "error": "Not Found", "message": "List not found" }`                                    |
| 404         | Not Found    | `{ "error": "Not Found", "message": "One or more tasks not found in the specified list" }` |
| 409         | Conflict     | `{ "error": "Conflict", "message": "Sort order conflict detected" }`                       |
| 500         | Server Error | `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }`          |

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client Request                                                           │
│     POST /api/lists/:listId/tasks/reorder                                   │
│     Body: { taskOrders: [...] }                                             │
│                         │                                                    │
│                         ▼                                                    │
│  2. Astro Middleware                                                         │
│     - Extract Supabase client from context                                  │
│     - Verify user authentication                                             │
│                         │                                                    │
│                         ▼                                                    │
│  3. API Route Handler (src/pages/api/lists/[listId]/tasks/reorder.ts)       │
│     - Extract listId from params                                            │
│     - Parse and validate request body with Zod                              │
│     - Return 400 if validation fails                                        │
│                         │                                                    │
│                         ▼                                                    │
│  4. Task Service (src/lib/services/task.service.ts)                         │
│     - Verify list exists and belongs to user                                │
│     - Verify all tasks exist and belong to the list                         │
│     - Update sort orders in a transaction                                    │
│                         │                                                    │
│                         ▼                                                    │
│  5. Database (Supabase/PostgreSQL)                                          │
│     - RLS policies enforce user ownership                                   │
│     - UNIQUE constraint on (list_id, sort_order)                            │
│     - Update tasks.sort_order for each task                                 │
│                         │                                                    │
│                         ▼                                                    │
│  6. Response                                                                 │
│     { success: true, updatedCount: N }                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Interaction Strategy

Due to the `UNIQUE(list_id, sort_order)` constraint, the update must be performed carefully to avoid constraint violations. Two approaches:

**Approach A: Temporary NULL values (Recommended)**

1. Set `sort_order = NULL` for all affected tasks (temporarily)
2. Update each task with the new `sort_order` value
3. All within a single transaction

**Approach B: Use negative values as intermediates**

1. Set `sort_order = -sort_order` for all affected tasks
2. Update to final positive values
3. Constraint allows negative during transition

**Note**: Approach A requires modifying the `sort_order` column to allow NULL temporarily or using Approach B with negative integers.

## 6. Security Considerations

### Authentication

- User must be authenticated via Supabase Auth
- Authentication is verified by middleware which sets `context.locals.user`
- Return 401 if `context.locals.user` is null

### Authorization

- RLS policies on `tasks` table ensure users can only modify their own tasks
- Composite FK `(list_id, user_id)` guarantees task belongs to user's list
- Service layer verifies list ownership before processing

### Input Validation

- All UUIDs validated for correct format
- `sortOrder` must be positive integers
- Array must be non-empty
- No duplicate IDs or sort orders allowed
- Use Zod for schema validation

### Data Integrity

- Transaction ensures atomic updates
- Database constraints prevent invalid states
- RLS prevents cross-user data access

## 7. Error Handling

### Validation Errors (400)

| Condition                  | Error Message                           |
| -------------------------- | --------------------------------------- |
| Missing `taskOrders` field | "taskOrders is required"                |
| Empty `taskOrders` array   | "At least one task order is required"   |
| Invalid UUID format        | "Invalid task ID format"                |
| Invalid `sortOrder` type   | "Sort order must be a positive integer" |
| `sortOrder` <= 0           | "Sort order must be a positive integer" |
| Duplicate task IDs         | "Duplicate task IDs are not allowed"    |
| Duplicate sort orders      | "Duplicate sort orders are not allowed" |
| Invalid `listId` format    | "Invalid list ID format"                |

### Authorization Errors (401)

| Condition               | Error Message            |
| ----------------------- | ------------------------ |
| No authentication token | "User not authenticated" |
| Invalid/expired token   | "User not authenticated" |

### Not Found Errors (404)

| Condition                    | Error Message                                       |
| ---------------------------- | --------------------------------------------------- |
| List does not exist          | "List not found"                                    |
| List belongs to another user | "List not found" (same message for security)        |
| Task ID not in list          | "One or more tasks not found in the specified list" |

### Conflict Errors (409)

| Condition                       | Error Message                  |
| ------------------------------- | ------------------------------ |
| Sort order constraint violation | "Sort order conflict detected" |

### Server Errors (500)

| Condition                   | Error Message                  |
| --------------------------- | ------------------------------ |
| Database connection failure | "An unexpected error occurred" |
| Transaction failure         | "An unexpected error occurred" |

## 8. Performance Considerations

### Potential Bottlenecks

1. **Large number of tasks**: Reordering many tasks in a single request
2. **Constraint checking**: UNIQUE constraint validation for each update
3. **Transaction locks**: Row-level locks during update

### Optimization Strategies

1. **Batch Updates**: Use a single SQL statement with CASE/WHEN for bulk updates

   ```sql
   UPDATE tasks
   SET sort_order = CASE id
     WHEN 'uuid1' THEN 1
     WHEN 'uuid2' THEN 2
     WHEN 'uuid3' THEN 3
   END,
   updated_at = now()
   WHERE id IN ('uuid1', 'uuid2', 'uuid3')
     AND list_id = :listId;
   ```

2. **Limit Array Size**: Consider limiting `taskOrders` array to reasonable size (e.g., 1000 items)

3. **Efficient Constraint Handling**: Use the two-phase update approach to avoid constraint violations efficiently

4. **Index Usage**: The existing `UNIQUE(list_id, sort_order)` index supports the constraint check

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File**: `src/lib/schemas/task.schema.ts`

Create or extend the task schema file with validation for reorder command:

- `taskOrderItemSchema` - validates individual task order items
- `reorderTasksSchema` - validates the complete command with refinements for duplicates
- `listIdParamSchema` - validates the listId URL parameter

### Step 2: Create/Extend Task Service

**File**: `src/lib/services/task.service.ts`

Create a service function `reorderTasks` that:

1. Accepts `supabase` client, `listId`, `userId`, and `taskOrders` array
2. Verifies list exists and belongs to user (single query)
3. Verifies all task IDs exist and belong to the list (single query)
4. Performs bulk update using efficient SQL with CASE/WHEN
5. Returns the count of updated tasks
6. Handles and throws appropriate errors

```typescript
interface ReorderTasksParams {
  supabase: SupabaseClient;
  listId: string;
  userId: string;
  taskOrders: TaskOrderItem[];
}

async function reorderTasks(params: ReorderTasksParams): Promise<number>;
```

### Step 3: Create API Route Handler

**File**: `src/pages/api/lists/[listId]/tasks/reorder.ts`

Implement the POST handler:

1. Export `prerender = false`
2. Extract `listId` from `Astro.params`
3. Validate `listId` format
4. Check authentication from `context.locals.user`
5. Parse and validate request body with Zod schema
6. Call task service `reorderTasks` function
7. Return appropriate response based on result

### Step 4: Implement Error Handling

In the service and route handler:

1. Create custom error types or use error codes for different scenarios
2. Map service errors to appropriate HTTP status codes
3. Log errors for debugging (use console.error or logging service)
4. Return user-friendly error messages without exposing internals

### Step 5: Handle Database Constraints

Implement the two-phase update strategy in the service:

1. Build SQL query using Supabase's `.rpc()` or raw SQL for complex update
2. Alternatively, use Supabase's batch update capabilities
3. Handle constraint violations gracefully (catch and return 409)

### Step 6: Testing Considerations

Test cases to implement:

1. **Happy path**: Valid reorder request returns 200 with correct count
2. **Empty array**: Returns 400
3. **Invalid UUID**: Returns 400
4. **Duplicate IDs**: Returns 400
5. **Duplicate sort orders**: Returns 400
6. **Unauthenticated**: Returns 401
7. **Non-existent list**: Returns 404
8. **Tasks not in list**: Returns 404
9. **Partial tasks in list**: Returns 404
10. **Concurrent updates**: Properly handles race conditions

### Step 7: API Route File Structure

```
src/pages/api/lists/[listId]/tasks/
├── index.ts          # GET (list tasks), POST (create task)
└── reorder.ts        # POST (reorder tasks) <- NEW FILE
```

### Implementation Checklist

- [ ] Create `src/lib/schemas/task.schema.ts` with Zod schemas
- [ ] Create `src/lib/services/task.service.ts` with `reorderTasks` function
- [ ] Create `src/pages/api/lists/[listId]/tasks/reorder.ts` route handler
- [ ] Implement validation for listId URL parameter
- [ ] Implement request body validation
- [ ] Implement authentication check
- [ ] Implement list ownership verification
- [ ] Implement task existence verification
- [ ] Implement bulk sort order update with constraint handling
- [ ] Implement error responses for all scenarios
- [ ] Add appropriate error logging
- [ ] Test all success and error scenarios
