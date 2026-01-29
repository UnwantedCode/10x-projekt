# API Endpoint Implementation Plan: GET /api/lists

## 1. Endpoint Overview

This endpoint retrieves all task lists belonging to the authenticated user with pagination support. It serves as a core endpoint for the task management application, enabling users to view and navigate their lists.

**Route:** `GET /api/lists`
**File location:** `src/pages/api/lists/index.ts`

## 2. Request Details

### HTTP Method

`GET`

### URL Structure

`/api/lists?limit={limit}&offset={offset}`

### Query Parameters

| Parameter | Type    | Required | Default | Constraints | Description             |
| --------- | ------- | -------- | ------- | ----------- | ----------------------- |
| `limit`   | integer | No       | 50      | 1-100       | Maximum items to return |
| `offset`  | integer | No       | 0       | >= 0        | Number of items to skip |

### Request Body

None (GET request)

### Headers

- `Authorization`: Bearer token (handled by Supabase auth)
- `Cookie`: Session cookie (alternative auth method)

## 3. Utilized Types

### Existing Types (from `src/types.ts`)

```typescript
// Response DTO for individual list
interface ListDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Full response structure
interface ListsResponseDTO {
  data: ListDTO[];
  pagination: PaginationDTO;
}

// Pagination metadata
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}

// Query parameters type
interface ListsQueryParams {
  limit?: number;
  offset?: number;
}
```

### New Zod Schema (to create in `src/lib/schemas/listSchemas.ts`)

```typescript
import { z } from "zod";

export const listsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListsQueryInput = z.infer<typeof listsQuerySchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Tasks",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Error Responses

| Status Code | Condition                | Response Body                                            |
| ----------- | ------------------------ | -------------------------------------------------------- |
| 400         | Invalid query parameters | `{ "error": "Bad Request", "message": "..." }`           |
| 401         | User not authenticated   | `{ "error": "Unauthorized", "message": "..." }`          |
| 500         | Server/database error    | `{ "error": "Internal Server Error", "message": "..." }` |

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Request Flow                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. HTTP Request                                                         │
│     GET /api/lists?limit=50&offset=0                                    │
│                    │                                                     │
│                    ▼                                                     │
│  2. Astro Middleware (src/middleware/index.ts)                          │
│     - Attaches supabase client to context.locals                        │
│     - Attaches user session to context.locals                           │
│                    │                                                     │
│                    ▼                                                     │
│  3. API Route Handler (src/pages/api/lists/index.ts)                    │
│     - Check authentication (context.locals.user)                        │
│     - Validate query params with Zod schema                             │
│     - Call listService.getLists()                                       │
│                    │                                                     │
│                    ▼                                                     │
│  4. Service Layer (src/lib/services/listService.ts)                     │
│     - Query database via supabase client                                │
│     - Get total count for pagination                                    │
│     - Map entities to DTOs                                              │
│                    │                                                     │
│                    ▼                                                     │
│  5. Database (Supabase PostgreSQL)                                      │
│     - RLS policy filters by auth.uid()                                  │
│     - Returns lists for current user                                    │
│                    │                                                     │
│                    ▼                                                     │
│  6. Response                                                             │
│     - Return ListsResponseDTO with 200 OK                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Query

```sql
-- Main query (handled by Supabase client)
SELECT id, name, created_at, updated_at
FROM public.lists
WHERE user_id = auth.uid()  -- RLS handles this automatically
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- Count query for pagination
SELECT COUNT(*)
FROM public.lists
WHERE user_id = auth.uid();  -- RLS handles this automatically
```

## 6. Security Considerations

### Authentication

- Verify user is authenticated via `context.locals.user`
- Return 401 immediately if no authenticated user
- Use Supabase client from `context.locals.supabase` (never import directly)

### Authorization

- RLS policy on `public.lists` ensures users only see their own lists
- Policy: `user_id = auth.uid()` for SELECT operations
- No additional authorization logic needed in application code

### Input Validation

- Validate all query parameters with Zod schema
- Coerce string query params to integers
- Apply min/max constraints to prevent abuse
- Reject invalid input with 400 Bad Request

### Data Exposure

- `user_id` is excluded from `ListDTO` (not exposed to client)
- Only necessary fields returned in response

## 7. Error Handling

### Error Scenarios and Responses

| Scenario                     | Status | Error Type     | Message Example                         |
| ---------------------------- | ------ | -------------- | --------------------------------------- |
| Missing/invalid auth session | 401    | Unauthorized   | "Authentication required"               |
| Invalid limit (not a number) | 400    | Bad Request    | "limit must be a valid integer"         |
| limit out of range           | 400    | Bad Request    | "limit must be between 1 and 100"       |
| Invalid offset (negative)    | 400    | Bad Request    | "offset must be a non-negative integer" |
| Database connection error    | 500    | Internal Error | "Failed to retrieve lists"              |
| Unexpected error             | 500    | Internal Error | "An unexpected error occurred"          |

### Error Response Format

```typescript
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Error Handling Strategy

1. Check authentication first (early return with 401)
2. Validate input with Zod (early return with 400 on failure)
3. Wrap database operations in try-catch
4. Log errors server-side for debugging
5. Return generic error messages to client (avoid leaking internals)

## 8. Performance Considerations

### Database Optimization

- Index `lists_user_id_idx` on `public.lists(user_id)` supports the query
- Pagination limits result set size
- Default limit of 50 balances UX and performance

### Query Optimization

- Use single query with `.range()` for data + count via Supabase
- Supabase returns count in headers when using `{ count: 'exact' }`

### Caching Considerations

- No caching in MVP (data changes frequently)
- Future: Consider short TTL cache if needed

### Pagination Strategy

- Offset-based pagination (simple, sufficient for MVP)
- Max limit of 100 prevents excessive data transfer
- Future: Consider cursor-based pagination for large datasets

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/listSchemas.ts`

```typescript
import { z } from "zod";

export const listsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int({ message: "limit must be an integer" })
    .min(1, { message: "limit must be at least 1" })
    .max(100, { message: "limit must be at most 100" })
    .default(50),
  offset: z.coerce
    .number()
    .int({ message: "offset must be an integer" })
    .min(0, { message: "offset must be non-negative" })
    .default(0),
});

export type ListsQueryInput = z.infer<typeof listsQuerySchema>;
```

### Step 2: Create List Service

**File:** `src/lib/services/listService.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { ListDTO, ListsResponseDTO } from "@/types";

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
```

### Step 3: Create API Endpoint

**File:** `src/pages/api/lists/index.ts`

```typescript
import type { APIRoute } from "astro";
import { listsQuerySchema } from "@/lib/schemas/listSchemas";
import { getLists } from "@/lib/services/listService";

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  // 1. Check authentication
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const parseResult = listsQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    const errors = parseResult.error.flatten().fieldErrors;
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid query parameters",
        details: errors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { limit, offset } = parseResult.data;

  // 3. Fetch lists from database
  try {
    const response = await getLists(locals.supabase, { limit, offset });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching lists:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to retrieve lists",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Step 4: Verify Middleware Configuration

Ensure `src/middleware/index.ts` properly attaches:

- `locals.supabase`: Supabase client instance
- `locals.user`: Authenticated user object (or null)

### Step 5: Testing Checklist

#### Unit Tests

- [ ] Zod schema validates correct inputs
- [ ] Zod schema rejects invalid limit values
- [ ] Zod schema rejects invalid offset values
- [ ] Service maps database entities to DTOs correctly

#### Integration Tests

- [ ] Returns 401 when not authenticated
- [ ] Returns 400 for invalid query params
- [ ] Returns 200 with empty array when no lists exist
- [ ] Returns 200 with lists and correct pagination
- [ ] Respects limit parameter
- [ ] Respects offset parameter
- [ ] Only returns lists owned by authenticated user

#### Manual Testing

- [ ] Test with Postman/curl without auth token
- [ ] Test with valid auth token
- [ ] Test pagination with multiple lists
- [ ] Test edge cases (limit=1, limit=100, large offset)

### Implementation Order

1. Create `src/lib/schemas/listSchemas.ts` (validation schema)
2. Create `src/lib/services/listService.ts` (business logic)
3. Create `src/pages/api/lists/index.ts` (API endpoint)
4. Verify middleware provides required locals
5. Test the endpoint manually
6. Add automated tests
