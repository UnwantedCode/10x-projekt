# API Endpoint Implementation Plan: GET /api/lists/:listId/tasks

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania listy zadań dla określonej listy zadań użytkownika. Obsługuje filtrowanie po statusie i priorytecie, wyszukiwanie tekstowe w tytule i opisie, sortowanie oraz paginację. Endpoint jest chroniony autentykacją i zwraca tylko zadania należące do zalogowanego użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/lists/:listId/tasks`
- **Parametry**:
  - **Path Parameters**:
    - `listId` (wymagany): UUID listy zadań
  - **Query Parameters (opcjonalne)**:
    | Parametr | Typ | Domyślnie | Opis |
    |----------|-----|-----------|------|
    | `status` | integer | 1 | Filtr statusu: 1 (todo), 2 (done) |
    | `priority` | integer | - | Filtr priorytetu: 1 (low), 2 (medium), 3 (high) |
    | `search` | string | - | Wyszukiwanie w tytule i opisie (ILIKE) |
    | `sort` | string | "priority" | Pole sortowania: priority, sort_order, created_at |
    | `order` | string | "desc" | Kierunek sortowania: asc, desc |
    | `limit` | integer | 100 | Maksymalna liczba wyników (max: 500) |
    | `offset` | integer | 0 | Offset paginacji |

- **Request Body**: Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTOs
interface TaskDTO {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  priority: number;
  status: number;
  sortOrder: number;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponseDTO {
  data: TaskDTO[];
  pagination: PaginationDTO;
}

interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}

interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}

// Query Parameters
interface TasksQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sort?: TaskSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

// Value types
type TaskStatus = 1 | 2;
type TaskPriority = 1 | 2 | 3;
type TaskSortField = "priority" | "sort_order" | "created_at";
type SortOrder = "asc" | "desc";
```

### Schemat walidacji Zod (do utworzenia):

```typescript
// src/lib/schemas/task.schema.ts

const listIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID format"),
});

const getTasksQuerySchema = z.object({
  status: z.coerce.number().int().min(1).max(2).optional().default(1),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["priority", "sort_order", "created_at"]).optional().default("priority"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "listId": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Task title",
      "description": "Task description or null",
      "priority": 2,
      "status": 1,
      "sortOrder": 1,
      "doneAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

### Błędy:

**400 Bad Request** - Nieprawidłowe parametry:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": {
    "listId": "Invalid UUID format",
    "status": "Must be 1 or 2"
  }
}
```

**401 Unauthorized** - Brak autentykacji:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**404 Not Found** - Lista nie istnieje lub nie należy do użytkownika:

```json
{
  "error": "NOT_FOUND",
  "message": "List not found"
}
```

**500 Internal Server Error** - Błąd serwera:

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. HTTP Request                                                 │
│     GET /api/lists/:listId/tasks?status=1&sort=priority         │
│                           │                                      │
│                           ▼                                      │
│  2. Astro Middleware (src/middleware/index.ts)                  │
│     - Weryfikacja sesji Supabase                                │
│     - Ustawienie context.locals.user                            │
│     - Ustawienie context.locals.supabase                        │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │ user === null?          │                        │
│              └────────────┬────────────┘                        │
│                    YES    │    NO                               │
│                     ▼     │     ▼                               │
│              Return 401   │                                      │
│                           │                                      │
│  3. API Route Handler (src/pages/api/lists/[listId]/tasks.ts)  │
│     a) Parsowanie path param: listId                            │
│     b) Parsowanie query params                                   │
│     c) Walidacja Zod (path + query)                             │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │ Validation failed?      │                        │
│              └────────────┬────────────┘                        │
│                    YES    │    NO                               │
│                     ▼     │     ▼                               │
│              Return 400   │                                      │
│                           │                                      │
│  4. TaskService.getTasksByListId(supabase, userId, listId, params)│
│     a) Weryfikacja własności listy                              │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │ List not found/owned?   │                        │
│              └────────────┬────────────┘                        │
│                    YES    │    NO                               │
│                     ▼     │     ▼                               │
│              Return 404   │                                      │
│                           │                                      │
│     b) Budowanie zapytania Supabase                             │
│        - SELECT z tabeli tasks                                   │
│        - WHERE list_id = :listId                                │
│        - WHERE status = :status (jeśli podany)                  │
│        - WHERE priority = :priority (jeśli podany)              │
│        - WHERE search_text ILIKE '%:search%' (jeśli podany)     │
│        - ORDER BY :sort :order                                  │
│        - LIMIT :limit OFFSET :offset                            │
│                           │                                      │
│     c) Wykonanie zapytania count (dla total)                    │
│     d) Wykonanie głównego zapytania                             │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │ Database error?         │                        │
│              └────────────┬────────────┘                        │
│                    YES    │    NO                               │
│                     ▼     │     ▼                               │
│              Return 500   │                                      │
│                           │                                      │
│  5. Mapowanie wyników                                           │
│     - TaskEntity[] → TaskDTO[]                                  │
│     - Budowanie PaginationDTO                                   │
│                           │                                      │
│                           ▼                                      │
│  6. Return 200 OK                                               │
│     { data: TaskDTO[], pagination: PaginationDTO }              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- Endpoint wymaga zalogowanego użytkownika
- Weryfikacja sesji przez middleware Astro z wykorzystaniem Supabase Auth
- Brak sesji → 401 Unauthorized

### 6.2 Autoryzacja

- Użytkownik może pobierać zadania tylko ze swoich list
- Weryfikacja własności listy przed pobraniem zadań
- RLS (Row Level Security) w Supabase jako dodatkowa warstwa zabezpieczeń
- Lista nie należąca do użytkownika → 404 Not Found (nie 403, aby nie ujawniać istnienia zasobów)

### 6.3 Walidacja danych wejściowych

- Walidacja UUID dla `listId` (zapobieganie SQL injection)
- Walidacja typów i zakresów dla wszystkich query params
- Ograniczenie długości parametru `search` do 200 znaków
- Ograniczenie `limit` do maksymalnie 500 (zapobieganie DoS)
- Sanityzacja parametru `search` przed użyciem w ILIKE

### 6.4 Ochrona przed atakami

- **ILIKE Injection**: Escapowanie znaków specjalnych (%, \_, \) w parametrze search
- **DoS**: Limit maksymalnej liczby zwracanych rekordów (500)
- **Information Disclosure**: Zwracanie 404 zamiast 403 dla nieistniejących/nieautoryzowanych zasobów

## 7. Obsługa błędów

| Scenariusz                      | Kod HTTP | Error Code       | Komunikat                                        |
| ------------------------------- | -------- | ---------------- | ------------------------------------------------ |
| Brak sesji/tokenu               | 401      | UNAUTHORIZED     | Authentication required                          |
| Nieprawidłowy format listId     | 400      | VALIDATION_ERROR | Invalid list ID format                           |
| Nieprawidłowa wartość status    | 400      | VALIDATION_ERROR | Status must be 1 or 2                            |
| Nieprawidłowa wartość priority  | 400      | VALIDATION_ERROR | Priority must be 1, 2, or 3                      |
| Nieprawidłowa wartość sort      | 400      | VALIDATION_ERROR | Sort must be priority, sort_order, or created_at |
| Nieprawidłowa wartość order     | 400      | VALIDATION_ERROR | Order must be asc or desc                        |
| limit poza zakresem             | 400      | VALIDATION_ERROR | Limit must be between 1 and 500                  |
| offset ujemny                   | 400      | VALIDATION_ERROR | Offset must be non-negative                      |
| Lista nie istnieje              | 404      | NOT_FOUND        | List not found                                   |
| Lista nie należy do użytkownika | 404      | NOT_FOUND        | List not found                                   |
| Błąd bazy danych                | 500      | INTERNAL_ERROR   | An unexpected error occurred                     |

### Logowanie błędów:

- Błędy 5xx powinny być logowane z pełnym stack trace
- Błędy 4xx logowane na poziomie debug/info
- Nie logować wrażliwych danych użytkownika

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazodanowe (już istniejące w db-plan.md)

- `tasks_list_id_idx` na `tasks(list_id)` - wspiera filtrowanie po liście
- `tasks_list_status_priority_sort_idx` na `tasks(list_id, status, priority, sort_order)` - wspiera główny przypadek użycia (aktywna lista + TODO + sortowanie)
- `tasks_search_text_trgm_gin` (GIN trigram) na `tasks(search_text)` - wspiera wyszukiwanie ILIKE

### 8.2 Optymalizacja zapytań

- Użycie kolumny wygenerowanej `search_text` zamiast konkatenacji w zapytaniu
- Wykonanie count z tymi samymi filtrami co główne zapytanie
- Rozważenie użycia `count: 'exact'` w Supabase dla małych zbiorów danych

### 8.3 Paginacja

- Domyślny limit 100 rekordów
- Maksymalny limit 500 rekordów
- Offset-based pagination (wystarczająca dla MVP)

### 8.4 Potencjalne optymalizacje (poza MVP)

- Cursor-based pagination dla dużych zbiorów
- Caching wyników dla często odpytywanych list
- Partial response (wybór pól do zwrócenia)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

Utworzyć plik `src/lib/schemas/task.schema.ts`:

```typescript
import { z } from "zod";

export const listIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID format"),
});

export const getTasksQuerySchema = z.object({
  status: z.coerce.number().int().min(1).max(2).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["priority", "sort_order", "created_at"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type GetTasksQueryInput = z.infer<typeof getTasksQuerySchema>;
```

### Krok 2: Utworzenie TaskService

Utworzyć plik `src/lib/services/task.service.ts`:

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { TaskDTO, TasksResponseDTO, TasksQueryParams } from "../../types";

// Domyślne wartości parametrów
const DEFAULT_STATUS = 1;
const DEFAULT_SORT = "priority";
const DEFAULT_ORDER = "desc";
const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;

// Mapowanie nazw pól sort na kolumny bazy danych
const SORT_FIELD_MAP: Record<string, string> = {
  priority: "priority",
  sort_order: "sort_order",
  created_at: "created_at",
};

export class TaskService {
  /**
   * Weryfikuje czy lista istnieje i należy do użytkownika
   */
  static async verifyListOwnership(supabase: SupabaseClient, userId: string, listId: string): Promise<boolean> {
    const { data, error } = await supabase.from("lists").select("id").eq("id", listId).eq("user_id", userId).single();

    return !error && data !== null;
  }

  /**
   * Pobiera zadania dla listy z filtrowaniem, wyszukiwaniem i paginacją
   */
  static async getTasksByListId(
    supabase: SupabaseClient,
    userId: string,
    listId: string,
    params: TasksQueryParams
  ): Promise<TasksResponseDTO> {
    // Zastosowanie domyślnych wartości
    const status = params.status ?? DEFAULT_STATUS;
    const sort = params.sort ?? DEFAULT_SORT;
    const order = params.order ?? DEFAULT_ORDER;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const offset = params.offset ?? DEFAULT_OFFSET;

    // Budowanie bazowego zapytania
    let query = supabase.from("tasks").select("*", { count: "exact" }).eq("list_id", listId).eq("user_id", userId);

    // Filtr statusu (domyślnie tylko TODO)
    query = query.eq("status", status);

    // Opcjonalny filtr priorytetu
    if (params.priority !== undefined) {
      query = query.eq("priority", params.priority);
    }

    // Opcjonalne wyszukiwanie tekstowe
    if (params.search) {
      const escapedSearch = this.escapeILikePattern(params.search);
      query = query.ilike("search_text", `%${escapedSearch}%`);
    }

    // Sortowanie
    const sortColumn = SORT_FIELD_MAP[sort];
    const ascending = order === "asc";
    query = query.order(sortColumn, { ascending });

    // Dodatkowe sortowanie po sort_order dla stabilności
    if (sort !== "sort_order") {
      query = query.order("sort_order", { ascending: true });
    }

    // Paginacja
    query = query.range(offset, offset + limit - 1);

    // Wykonanie zapytania
    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Mapowanie do DTO
    const tasks: TaskDTO[] = (data || []).map(this.mapToTaskDTO);

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
   * Mapuje encję bazy danych na TaskDTO
   */
  private static mapToTaskDTO(entity: Record<string, unknown>): TaskDTO {
    return {
      id: entity.id as string,
      listId: entity.list_id as string,
      title: entity.title as string,
      description: entity.description as string | null,
      priority: entity.priority as number,
      status: entity.status as number,
      sortOrder: entity.sort_order as number,
      doneAt: entity.done_at as string | null,
      createdAt: entity.created_at as string,
      updatedAt: entity.updated_at as string,
    };
  }

  /**
   * Escapuje znaki specjalne dla wzorca ILIKE
   */
  private static escapeILikePattern(pattern: string): string {
    return pattern.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }
}
```

### Krok 3: Utworzenie API Route Handler

Utworzyć plik `src/pages/api/lists/[listId]/tasks.ts`:

```typescript
import type { APIRoute } from "astro";
import { TaskService } from "../../../../lib/services/task.service";
import { listIdParamSchema, getTasksQuerySchema } from "../../../../lib/schemas/task.schema";
import type { TasksResponseDTO, ErrorResponseDTO } from "../../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Sprawdzenie autentykacji
    const user = locals.user;
    if (!user) {
      const errorResponse: ErrorResponseDTO = {
        error: "UNAUTHORIZED",
        message: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Walidacja path param
    const pathResult = listIdParamSchema.safeParse({ listId: params.listId });
    if (!pathResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: { listId: "Invalid list ID format" },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { listId } = pathResult.data;

    // 3. Walidacja query params
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const queryResult = getTasksQuerySchema.safeParse(queryParams);

    if (!queryResult.success) {
      const details: Record<string, string> = {};
      for (const error of queryResult.error.errors) {
        const field = error.path.join(".");
        details[field] = error.message;
      }
      const errorResponse: ErrorResponseDTO = {
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Weryfikacja własności listy
    const supabase = locals.supabase;
    const listExists = await TaskService.verifyListOwnership(supabase, user.id, listId);

    if (!listExists) {
      const errorResponse: ErrorResponseDTO = {
        error: "NOT_FOUND",
        message: "List not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Pobranie zadań
    const response: TasksResponseDTO = await TaskService.getTasksByListId(supabase, user.id, listId, queryResult.data);

    // 6. Zwrócenie odpowiedzi
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Logowanie błędu (w produkcji użyć właściwego loggera)
    console.error("Error fetching tasks:", error);

    const errorResponse: ErrorResponseDTO = {
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 4: Aktualizacja middleware (jeśli potrzebna)

Upewnić się, że middleware w `src/middleware/index.ts` poprawnie ustawia `locals.user` i `locals.supabase` dla tras API.

### Krok 5: Testy manualne

Przetestować endpoint z różnymi kombinacjami parametrów:

```bash
# Podstawowe żądanie (domyślne filtry)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/<listId>/tasks"

# Z filtrowaniem statusu
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/<listId>/tasks?status=2"

# Z wyszukiwaniem
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/<listId>/tasks?search=important"

# Z sortowaniem i paginacją
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/<listId>/tasks?sort=created_at&order=asc&limit=10&offset=0"

# Testy błędów
curl "http://localhost:3000/api/lists/<listId>/tasks"  # 401
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/invalid-uuid/tasks"  # 400
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/lists/<non-existent-id>/tasks"  # 404
```

### Krok 6: Code review i refaktoryzacja

- Sprawdzić zgodność z regułami ESLint/Prettier
- Upewnić się, że typy są poprawnie użyte
- Zweryfikować obsługę błędów
- Sprawdzić pokrycie edge cases
