# REST API Plan

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Profile | `public.profiles` | User profile extension (active list, onboarding state) |
| List | `public.lists` | Task lists for organizing tasks |
| Task | `public.tasks` | Individual tasks with priority and status |
| AI Interaction | `public.ai_interactions` | AI suggestion history and user decisions |

## 2. Endpoints

### 2.1 Profile

#### GET /api/profile

Retrieves the current user's profile.

**Response Payload:**
```json
{
  "id": "uuid",
  "activeListId": "uuid | null",
  "onboardingCompletedAt": "ISO8601 | null",
  "onboardingVersion": 1,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Profile retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Profile not found (should not happen with proper triggers)

---

#### PATCH /api/profile

Updates the current user's profile.

**Request Payload:**
```json
{
  "activeListId": "uuid | null"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "activeListId": "uuid | null",
  "onboardingCompletedAt": "ISO8601 | null",
  "onboardingVersion": 1,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Profile updated successfully

**Error Codes:**
- `400 Bad Request` - Invalid activeListId (list doesn't exist or doesn't belong to user)
- `401 Unauthorized` - User not authenticated

---

#### POST /api/profile/onboarding/complete

Marks onboarding as completed for the current user.

**Request Payload:**
```json
{
  "version": 1
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "activeListId": "uuid | null",
  "onboardingCompletedAt": "ISO8601",
  "onboardingVersion": 1,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Onboarding marked as complete

**Error Codes:**
- `400 Bad Request` - Invalid version (must be > 0)
- `401 Unauthorized` - User not authenticated

---

### 2.2 Lists

#### GET /api/lists

Retrieves all lists for the current user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return (default: 50, max: 100) |
| `offset` | integer | Pagination offset (default: 0) |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

**Success Codes:**
- `200 OK` - Lists retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated

---

#### GET /api/lists/:id

Retrieves a specific list by ID.

**Response Payload:**
```json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - List retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List not found or doesn't belong to user

---

#### POST /api/lists

Creates a new task list.

**Request Payload:**
```json
{
  "name": "string"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `201 Created` - List created successfully

**Error Codes:**
- `400 Bad Request` - Validation error (name empty, too long, or duplicate)
- `401 Unauthorized` - User not authenticated

---

#### PATCH /api/lists/:id

Updates an existing list.

**Request Payload:**
```json
{
  "name": "string"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - List updated successfully

**Error Codes:**
- `400 Bad Request` - Validation error (name empty, too long, or duplicate)
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List not found or doesn't belong to user

---

#### DELETE /api/lists/:id

Deletes a list and all its tasks (cascade).

**Response Payload:**
```json
{
  "success": true
}
```

**Success Codes:**
- `200 OK` - List deleted successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List not found or doesn't belong to user

---

### 2.3 Tasks

#### GET /api/lists/:listId/tasks

Retrieves tasks for a specific list with filtering and sorting.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | integer | Filter by status: 1 (todo), 2 (done). Default: 1 |
| `priority` | integer | Filter by priority: 1 (low), 2 (medium), 3 (high) |
| `search` | string | Search in title and description (ILIKE) |
| `sort` | string | Sort field: `priority`, `sort_order`, `created_at`. Default: `priority` |
| `order` | string | Sort direction: `asc`, `desc`. Default: `desc` for priority |
| `limit` | integer | Max items to return (default: 100, max: 500) |
| `offset` | integer | Pagination offset (default: 0) |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "listId": "uuid",
      "title": "string",
      "description": "string | null",
      "priority": 1,
      "status": 1,
      "sortOrder": 1,
      "doneAt": "ISO8601 | null",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

**Success Codes:**
- `200 OK` - Tasks retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List not found or doesn't belong to user

---

#### GET /api/tasks/:id

Retrieves a specific task by ID.

**Response Payload:**
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "description": "string | null",
  "priority": 1,
  "status": 1,
  "sortOrder": 1,
  "doneAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Task retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Task not found or doesn't belong to user

---

#### POST /api/lists/:listId/tasks

Creates a new task in the specified list.

**Request Payload:**
```json
{
  "title": "string",
  "description": "string | null",
  "priority": 1
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "description": "string | null",
  "priority": 1,
  "status": 1,
  "sortOrder": 1,
  "doneAt": null,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `201 Created` - Task created successfully

**Error Codes:**
- `400 Bad Request` - Validation error (title empty/too long, invalid priority)
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List not found or doesn't belong to user

---

#### PATCH /api/tasks/:id

Updates an existing task.

**Request Payload:**
```json
{
  "title": "string",
  "description": "string | null",
  "priority": 1,
  "status": 1,
  "sortOrder": 1
}
```

All fields are optional - only provided fields will be updated.

**Response Payload:**
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "description": "string | null",
  "priority": 1,
  "status": 1,
  "sortOrder": 1,
  "doneAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Task updated successfully

**Error Codes:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Task not found or doesn't belong to user
- `409 Conflict` - Sort order conflict (duplicate in list)

---

#### DELETE /api/tasks/:id

Deletes a task.

**Response Payload:**
```json
{
  "success": true
}
```

**Success Codes:**
- `200 OK` - Task deleted successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Task not found or doesn't belong to user

---

#### POST /api/lists/:listId/tasks/reorder

Bulk reorder tasks within a list (for drag-and-drop).

**Request Payload:**
```json
{
  "taskOrders": [
    { "id": "uuid", "sortOrder": 1 },
    { "id": "uuid", "sortOrder": 2 },
    { "id": "uuid", "sortOrder": 3 }
  ]
}
```

**Response Payload:**
```json
{
  "success": true,
  "updatedCount": 3
}
```

**Success Codes:**
- `200 OK` - Tasks reordered successfully

**Error Codes:**
- `400 Bad Request` - Invalid payload or duplicate sort orders
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - List or tasks not found
- `409 Conflict` - Sort order conflict

---

### 2.4 AI Suggestions

#### POST /api/ai/suggest

Requests an AI priority suggestion for a task.

**Request Payload:**
```json
{
  "taskId": "uuid | null",
  "title": "string",
  "description": "string | null"
}
```

Note: `taskId` is optional. When provided, the interaction will be linked to an existing task. When null, use this endpoint during task creation.

**Response Payload:**
```json
{
  "interactionId": "uuid",
  "suggestedPriority": 2,
  "justification": "string",
  "justificationTags": ["deadline", "impact"],
  "model": "string",
  "createdAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Suggestion generated successfully

**Error Codes:**
- `400 Bad Request` - Invalid payload (title required)
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Task not found (when taskId provided)
- `503 Service Unavailable` - AI service error

---

#### PATCH /api/ai-interactions/:id

Records the user's decision on an AI suggestion.

**Request Payload:**
```json
{
  "decision": 1,
  "finalPriority": 2,
  "rejectedReason": "string | null"
}
```

Decision values:
- `1` - accepted (finalPriority and rejectedReason must be null)
- `2` - modified (finalPriority required, rejectedReason must be null)
- `3` - rejected (rejectedReason required, finalPriority must be null)

**Response Payload:**
```json
{
  "id": "uuid",
  "taskId": "uuid",
  "suggestedPriority": 2,
  "justification": "string",
  "decision": 1,
  "decidedAt": "ISO8601",
  "finalPriority": 2,
  "rejectedReason": null,
  "createdAt": "ISO8601"
}
```

**Success Codes:**
- `200 OK` - Decision recorded successfully

**Error Codes:**
- `400 Bad Request` - Validation error (inconsistent decision fields)
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Interaction not found or doesn't belong to user
- `409 Conflict` - Decision already recorded

---

#### GET /api/tasks/:taskId/ai-interactions

Retrieves AI interaction history for a specific task.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return (default: 10, max: 50) |
| `offset` | integer | Pagination offset (default: 0) |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "taskId": "uuid",
      "model": "string",
      "suggestedPriority": 2,
      "justification": "string",
      "justificationTags": ["deadline"],
      "decision": 1,
      "decidedAt": "ISO8601 | null",
      "finalPriority": null,
      "rejectedReason": null,
      "createdAt": "ISO8601"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

**Success Codes:**
- `200 OK` - Interactions retrieved successfully

**Error Codes:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Task not found or doesn't belong to user

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with JWT tokens.

**Implementation:**
1. Users authenticate via Supabase Auth SDK (email/password or OAuth providers)
2. Supabase issues a JWT token stored in cookies or local storage
3. All API requests include the JWT in the `Authorization` header:
   ```
   Authorization: Bearer <jwt_token>
   ```

### 3.2 Session Management

- Sessions are managed by Supabase Auth
- JWT tokens have configurable expiration (default: 1 hour)
- Refresh tokens allow automatic session renewal
- Server-side middleware validates tokens on each request

### 3.3 Authorization

**Row Level Security (RLS):**
- All database tables have RLS enabled
- Policies enforce `user_id = auth.uid()` for all operations
- Users can only access their own data

**API-Level Authorization:**
1. Middleware extracts user ID from JWT via `context.locals.supabase.auth.getUser()`
2. API handlers include user_id in all queries
3. Foreign key constraints with composite keys prevent cross-user data access

### 3.4 Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired authentication token"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profile
| Field | Validation |
|-------|------------|
| `activeListId` | Must be a valid UUID of a list owned by the user, or null |
| `onboardingVersion` | Must be > 0 |

#### List
| Field | Validation |
|-------|------------|
| `name` | Required, 1-100 characters, unique per user (case-insensitive) |

#### Task
| Field | Validation |
|-------|------------|
| `title` | Required, 1-200 characters |
| `description` | Optional, no limit |
| `priority` | Required, integer 1-3 (1=low, 2=medium, 3=high) |
| `status` | Integer 1-2 (1=todo, 2=done), default: 1 |
| `sortOrder` | Integer > 0, unique within list |

#### AI Interaction Decision
| Field | Validation |
|-------|------------|
| `decision` | Integer 1-3 (1=accepted, 2=modified, 3=rejected) |
| `finalPriority` | Required if decision=2, must be null otherwise |
| `rejectedReason` | Required if decision=3 (max 300 chars), must be null otherwise |

### 4.2 Business Logic Implementation

#### Task Creation
1. Validate title and priority
2. Auto-assign `sort_order` as `MAX(sort_order) + 1` for the list
3. Set `status = 1` (todo) and `user_id` from auth context
4. Create task record

#### Status Change (Todo ↔ Done)
1. Database trigger `trg_tasks_done_at` handles `done_at`:
   - Set to `now()` when status changes to 2 (done)
   - Set to `null` when status changes to 1 (todo)
2. API returns updated task with correct `doneAt` value

#### Task Reordering
1. Validate all task IDs belong to the specified list and user
2. Validate no duplicate sort orders in the request
3. Update all tasks in a single transaction
4. On conflict, return 409 with details

#### AI Suggestion Flow
1. Generate prompt from title and description
2. Call AI service with prompt
3. Store hash of prompt (GDPR compliance, no raw text)
4. Create `ai_interactions` record with:
   - Suggested priority
   - Justification (max 300 chars)
   - Model identifier
   - Timestamp
5. Return interaction ID for decision tracking

#### AI Decision Recording
1. Validate decision consistency:
   - `accepted`: no finalPriority, no rejectedReason
   - `modified`: finalPriority required
   - `rejected`: rejectedReason required
2. Set `decided_at = now()`
3. If decision is `accepted` or `modified`, optionally update task priority

#### List Deletion
1. Cascade delete all tasks (handled by FK constraint)
2. If deleted list was active, set `active_list_id = null` in profile
3. Frontend should handle empty state

#### Default Sorting
Tasks are sorted by:
1. Priority descending (3 → 2 → 1)
2. Sort order ascending within same priority

### 4.3 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field error"
  }
}
```

**Common Error Types:**
- `ValidationError` - Invalid input data
- `NotFoundError` - Resource not found
- `ConflictError` - Duplicate or conflict
- `AuthenticationError` - Invalid credentials
- `ServiceError` - External service failure (AI)