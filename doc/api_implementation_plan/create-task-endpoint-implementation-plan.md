# API Endpoint Implementation Plan: Create Task

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowego zadania w określonej liście zadań. Zadanie jest przypisywane do listy identyfikowanej przez `listId` w ścieżce URL. Nowe zadanie otrzymuje automatycznie:

- status = 1 (TODO)
- sort_order = następna wartość w sekwencji dla danej listy
- done_at = null
- user_id = ID zalogowanego użytkownika

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/lists/:listId/tasks`
- **Parametry ścieżki:**
  - `listId` (uuid, wymagany) - identyfikator listy, do której dodawane jest zadanie

- **Request Body:**

```json
{
  "title": "string",
  "description": "string | null",
  "priority": 1 | 2 | 3
}
```

- **Nagłówki:**
  - `Content-Type: application/json`
  - `Cookie: sb-*` (sesja Supabase)

## 3. Wykorzystywane typy

### Istniejące typy (z `src/types.ts`):

```typescript
// Command model dla żądania
interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority: TaskPriority; // 1 | 2 | 3
}

// DTO odpowiedzi
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

// Błędy
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowy schemat walidacji Zod (do utworzenia):

```typescript
// W pliku: src/lib/schemas/task.schema.ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(1, "Priority must be at least 1").max(3, "Priority must be at most 3"),
});

export const listIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID format"),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created):

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
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Błędy:

| Kod | Scenariusz           | Przykładowa odpowiedź                                                                                     |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| 400 | Błąd walidacji       | `{ "error": "Bad Request", "message": "Validation failed", "details": { "title": "Title is required" } }` |
| 401 | Brak autentykacji    | `{ "error": "Unauthorized", "message": "Authentication required" }`                                       |
| 404 | Lista nie znaleziona | `{ "error": "Not Found", "message": "List not found" }`                                                   |
| 500 | Błąd serwera         | `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }`                         |

## 5. Przepływ danych

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Klient    │────▶│  API Endpoint   │────▶│  TaskService    │────▶│   Supabase   │
│             │     │  (Astro Route)  │     │                 │     │   Database   │
└─────────────┘     └─────────────────┘     └─────────────────┘     └──────────────┘
                           │                        │
                           ▼                        ▼
                    1. Walidacja             3. Sprawdź listę
                       parametrów               (SELECT lists)
                           │                        │
                           ▼                        ▼
                    2. Walidacja             4. Oblicz sort_order
                       body (Zod)               (SELECT MAX)
                                                    │
                                                    ▼
                                             5. INSERT task
                                                    │
                                                    ▼
                                             6. Mapuj na DTO
```

### Szczegółowy przepływ:

1. **Middleware Astro** - weryfikuje sesję użytkownika z `context.locals.supabase`
2. **Endpoint API** - parsuje `listId` z URL i waliduje przez Zod
3. **Endpoint API** - parsuje body i waliduje przez Zod (`createTaskSchema`)
4. **TaskService.createTask():**
   - Sprawdza czy lista istnieje i należy do użytkownika (SELECT z RLS)
   - Pobiera MAX(sort_order) dla listy i oblicza nowy
   - Wykonuje INSERT z automatycznym user_id
   - Zwraca utworzone zadanie
5. **Endpoint API** - mapuje encję na TaskDTO i zwraca 201

## 6. Względy bezpieczeństwa

### Autentykacja

- Weryfikacja sesji przez `context.locals.supabase.auth.getUser()`
- Brak sesji = 401 Unauthorized

### Autoryzacja

- RLS (Row Level Security) na tabeli `tasks` zapewnia dostęp tylko do własnych danych
- Dodatkowa walidacja: sprawdzenie czy `listId` należy do użytkownika przed INSERT
- FK constraint `(list_id, user_id) → lists(id, user_id)` gwarantuje spójność

### Walidacja danych

- Wszystkie dane wejściowe walidowane przez Zod przed użyciem
- UUID format sprawdzany dla `listId`
- Długość `title` ograniczona (1-200 znaków)
- `priority` ściśle typowany jako 1 | 2 | 3
- `description` może być null lub string

### Ochrona przed atakami

- **SQL Injection:** Supabase używa prepared statements
- **XSS:** Dane przechowywane jako tekst, escapowanie po stronie klienta
- **IDOR:** RLS + walidacja właściciela listy

## 7. Obsługa błędów

### Hierarchia błędów:

```typescript
// Kolejność sprawdzania:
1. Autentykacja (401) - brak/nieprawidłowa sesja
2. Walidacja listId (400) - nieprawidłowy format UUID
3. Walidacja body (400) - błędy w title/description/priority
4. Istnienie listy (404) - lista nie istnieje lub nie należy do użytkownika
5. Błąd bazy danych (500) - nieoczekiwane błędy
```

### Mapowanie błędów Supabase:

| Kod Supabase             | HTTP Status | Akcja                     |
| ------------------------ | ----------- | ------------------------- |
| PGRST116 (no rows)       | 404         | List not found            |
| 23503 (FK violation)     | 404         | List not found            |
| 23505 (unique violation) | 500         | Retry with new sort_order |
| Inne                     | 500         | Internal server error     |

### Logowanie błędów:

- Błędy 500 logowane z pełnym stack trace
- Błędy 400/401/404 logowane na poziomie info/warn
- Nie logować wrażliwych danych (tokeny, hasła)

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- Pojedyncze zapytanie do sprawdzenia listy i pobrania MAX(sort_order) przez CTE lub subquery
- Indeks `tasks_list_id_idx` przyspiesza wyszukiwanie
- Indeks unikalny `(list_id, sort_order)` wspiera constraint

### Potencjalne wąskie gardła:

- **Konflikt sort_order:** Przy równoczesnych insertach może wystąpić konflikt unikalności
  - Rozwiązanie: retry z nowym sort_order lub użycie `ON CONFLICT`
- **Duże listy:** MAX(sort_order) może być wolne dla bardzo dużych list
  - Rozwiązanie: cache lub fractional indexing (poza MVP)

### Sugerowane zapytanie (optymalizowane):

```sql
WITH list_check AS (
  SELECT id, user_id
  FROM public.lists
  WHERE id = $1 AND user_id = $2
),
next_order AS (
  SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort
  FROM public.tasks
  WHERE list_id = $1
)
INSERT INTO public.tasks (list_id, user_id, title, description, priority, status, sort_order)
SELECT
  lc.id,
  lc.user_id,
  $3, -- title
  $4, -- description
  $5, -- priority
  1,  -- status (TODO)
  no.next_sort
FROM list_check lc, next_order no
RETURNING *;
```

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/task.schema.ts`

```typescript
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(1, "Priority must be at least 1").max(3, "Priority must be at most 3") as z.ZodType<
    1 | 2 | 3
  >,
});

export const listIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID format"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

### Krok 2: Utworzenie TaskService

**Plik:** `src/lib/services/task.service.ts`

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { TaskDTO, CreateTaskCommand } from "../../types";

export class TaskService {
  constructor(private supabase: SupabaseClient) {}

  async createTask(listId: string, userId: string, command: CreateTaskCommand): Promise<TaskDTO> {
    // 1. Sprawdź czy lista istnieje i należy do użytkownika
    const { data: list, error: listError } = await this.supabase
      .from("lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", userId)
      .single();

    if (listError || !list) {
      throw new NotFoundError("List not found");
    }

    // 2. Pobierz następny sort_order
    const { data: maxOrder } = await this.supabase
      .from("tasks")
      .select("sort_order")
      .eq("list_id", listId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxOrder?.sort_order ?? 0) + 1;

    // 3. Utwórz zadanie
    const { data: task, error: insertError } = await this.supabase
      .from("tasks")
      .insert({
        list_id: listId,
        user_id: userId,
        title: command.title,
        description: command.description ?? null,
        priority: command.priority,
        status: 1,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (insertError || !task) {
      throw new DatabaseError("Failed to create task");
    }

    // 4. Mapuj na DTO
    return this.mapToDTO(task);
  }

  private mapToDTO(entity: TaskEntity): TaskDTO {
    return {
      id: entity.id,
      listId: entity.list_id,
      title: entity.title,
      description: entity.description,
      priority: entity.priority,
      status: entity.status,
      sortOrder: entity.sort_order,
      doneAt: entity.done_at,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }
}
```

### Krok 3: Utworzenie klas błędów

**Plik:** `src/lib/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    public details?: Record<string, string>
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}
```

### Krok 4: Utworzenie endpointu API

**Plik:** `src/pages/api/lists/[listId]/tasks.ts`

```typescript
import type { APIRoute } from "astro";
import { createTaskSchema, listIdParamSchema } from "../../../../lib/schemas/task.schema";
import { TaskService } from "../../../../lib/services/task.service";
import { NotFoundError, ValidationError, UnauthorizedError } from "../../../../lib/errors";
import type { TaskDTO, ErrorResponseDTO } from "../../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Sprawdź autentykację
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        } satisfies ErrorResponseDTO),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Waliduj parametr listId
    const paramResult = listIdParamSchema.safeParse({ listId: params.listId });

    if (!paramResult.success) {
      const details = paramResult.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid list ID format",
          details: Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v?.[0] ?? "Invalid"])),
        } satisfies ErrorResponseDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Waliduj body żądania
    const body = await request.json();
    const bodyResult = createTaskSchema.safeParse(body);

    if (!bodyResult.success) {
      const details = bodyResult.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Validation failed",
          details: Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v?.[0] ?? "Invalid"])),
        } satisfies ErrorResponseDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Utwórz zadanie przez serwis
    const taskService = new TaskService(locals.supabase);
    const task = await taskService.createTask(paramResult.data.listId, user.id, bodyResult.data);

    // 5. Zwróć sukces
    return new Response(JSON.stringify(task), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa znanych błędów
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: error.message,
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: error.message,
          details: error.details,
        } satisfies ErrorResponseDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Nieoczekiwane błędy
    console.error("Unexpected error in POST /api/lists/:listId/tasks:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Krok 5: Testy jednostkowe (opcjonalne)

**Plik:** `src/lib/services/__tests__/task.service.test.ts`

Scenariusze do przetestowania:

1. Pomyślne utworzenie zadania
2. Lista nie istnieje - zwraca NotFoundError
3. Lista należy do innego użytkownika - zwraca NotFoundError
4. Błąd bazy danych - zwraca DatabaseError
5. Prawidłowe obliczenie sort_order dla pustej listy (1)
6. Prawidłowe obliczenie sort_order dla listy z zadaniami (MAX + 1)

### Krok 6: Testy integracyjne (opcjonalne)

Scenariusze E2E:

1. POST bez autentykacji → 401
2. POST z nieprawidłowym listId → 400
3. POST z pustym title → 400
4. POST z priority = 0 → 400
5. POST z nieistniejącą listą → 404
6. POST poprawny → 201 + TaskDTO

## 10. Checklist przed wdrożeniem

- [ ] Schemat Zod utworzony i eksportowany
- [ ] TaskService zaimplementowany z metodą createTask
- [ ] Klasy błędów utworzone (NotFoundError, ValidationError, etc.)
- [ ] Endpoint API utworzony w `src/pages/api/lists/[listId]/tasks.ts`
- [ ] RLS włączone na tabeli tasks (już w migracji)
- [ ] Testy jednostkowe dla TaskService
- [ ] Testy integracyjne dla endpointu
- [ ] Linting przechodzi (`npm run lint`)
- [ ] Build przechodzi (`npm run build`)
