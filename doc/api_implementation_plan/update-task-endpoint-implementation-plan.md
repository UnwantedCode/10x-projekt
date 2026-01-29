# API Endpoint Implementation Plan: Update Task (PATCH /api/tasks/:id)

## 1. Przegląd punktu końcowego

Endpoint umożliwia częściową aktualizację istniejącego zadania. Użytkownik może zaktualizować dowolną kombinację pól: tytuł, opis, priorytet, status lub kolejność sortowania. Endpoint wymaga uwierzytelnienia i weryfikuje, że zadanie należy do zalogowanego użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/tasks/:id`
- **Parametry ścieżki:**
  - `id` (wymagany): UUID zadania do aktualizacji
- **Request Body (wszystkie pola opcjonalne):**

```json
{
  "title": "string",
  "description": "string | null",
  "priority": 1 | 2 | 3,
  "status": 1 | 2,
  "sortOrder": number
}
```

### Walidacja parametrów

| Pole          | Typ            | Walidacja                     |
| ------------- | -------------- | ----------------------------- |
| `id`          | UUID           | Format UUID v4                |
| `title`       | string         | 1-200 znaków                  |
| `description` | string \| null | Opcjonalny, może być null     |
| `priority`    | number         | 1 (low), 2 (medium), 3 (high) |
| `status`      | number         | 1 (todo), 2 (done)            |
| `sortOrder`   | number         | Liczba całkowita > 0          |

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`

```typescript
// Command model dla żądania
interface UpdateTaskCommand {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  sortOrder?: number;
}

// DTO dla odpowiedzi
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

// Typy pomocnicze
type TaskPriority = 1 | 2 | 3;
type TaskStatus = 1 | 2;

// Odpowiedź błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowy schemat Zod do walidacji

```typescript
// src/lib/schemas/task.schema.ts

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  status: z.union([z.literal(1), z.literal(2)]).optional(),
  sortOrder: z.number().int().positive().optional(),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "Updated task title",
  "description": "Updated description or null",
  "priority": 2,
  "status": 1,
  "sortOrder": 5,
  "doneAt": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:45:00Z"
}
```

### Błędy

| Kod | Sytuacja              | Przykładowa odpowiedź                                                                                                                    |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 400 | Błąd walidacji        | `{ "error": "VALIDATION_ERROR", "message": "Invalid input data", "details": { "title": "Title must be between 1 and 200 characters" } }` |
| 401 | Brak uwierzytelnienia | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                                                      |
| 404 | Zadanie nie istnieje  | `{ "error": "NOT_FOUND", "message": "Task not found" }`                                                                                  |
| 409 | Konflikt sortOrder    | `{ "error": "CONFLICT", "message": "Sort order already exists in this list" }`                                                           |
| 500 | Błąd serwera          | `{ "error": "INTERNAL_ERROR", "message": "An unexpected error occurred" }`                                                               |

## 5. Przepływ danych

```
┌─────────────────┐
│  Klient HTTP    │
│  PATCH request  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  API Route Handler                  │
│  src/pages/api/tasks/[id].ts        │
│  1. Sprawdź metodę HTTP (PATCH)     │
│  2. Pobierz user z context.locals   │
│  3. Walidacja UUID z params         │
│  4. Walidacja body (Zod)            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  TaskService                        │
│  src/lib/services/task.service.ts   │
│  1. Pobierz zadanie (getTaskById)   │
│  2. Sprawdź konflikt sortOrder      │
│  3. Wykonaj UPDATE (updateTask)     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Supabase (PostgreSQL + RLS)        │
│  1. RLS sprawdza user_id = auth.uid │
│  2. Trigger aktualizuje updated_at  │
│  3. Trigger obsługuje done_at       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Response                           │
│  Mapper: Entity → TaskDTO           │
│  Return 200 OK z TaskDTO            │
└─────────────────────────────────────┘
```

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- Użytkownik musi być zalogowany (sprawdzane przez `context.locals.user`)
- Token sesji walidowany przez Supabase Auth

### Autoryzacja

- RLS policy na tabeli `tasks` wymusza `user_id = auth.uid()`
- Dodatkowe sprawdzenie w serwisie przed aktualizacją

### Walidacja danych wejściowych

- Zod schema waliduje wszystkie pola
- UUID format sprawdzany regex'em
- Długość title ograniczona do 200 znaków
- Priority i status ograniczone do dozwolonych wartości
- sortOrder musi być dodatnią liczbą całkowitą

### Ochrona przed atakami

- SQL injection: Supabase SDK używa parametryzowanych zapytań
- Mass assignment: Tylko zdefiniowane pola są akceptowane (Zod schema)

## 7. Obsługa błędów

### Scenariusze błędów

| Scenariusz                           | Kod | Obsługa                            |
| ------------------------------------ | --- | ---------------------------------- |
| Brak tokenu sesji                    | 401 | Zwróć błąd przed przetwarzaniem    |
| Nieprawidłowy UUID                   | 400 | Walidacja Zod na etapie parsowania |
| Title za długi (>200)                | 400 | Walidacja Zod                      |
| Nieprawidłowy priority (np. 5)       | 400 | Walidacja Zod                      |
| Nieprawidłowy status (np. 0)         | 400 | Walidacja Zod                      |
| sortOrder <= 0                       | 400 | Walidacja Zod                      |
| Zadanie nie istnieje                 | 404 | Sprawdzenie w serwisie             |
| Zadanie należy do innego użytkownika | 404 | RLS zwróci pusty wynik             |
| sortOrder zajęty w liście            | 409 | Sprawdzenie przed UPDATE           |
| Błąd połączenia z DB                 | 500 | Try-catch z logowaniem             |

### Strategia logowania błędów

```typescript
// Błędy walidacji - nie logować (oczekiwane)
// Błędy 404 - logować na poziomie debug
// Błędy 409 - logować na poziomie info
// Błędy 500 - logować na poziomie error z pełnym stack trace
console.error("[TaskService.updateTask] Unexpected error:", error);
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje

- Jedno zapytanie SELECT do pobrania zadania i weryfikacji własności
- Warunkowe sprawdzanie sortOrder tylko gdy pole jest podane
- Jedno zapytanie UPDATE z RETURNING dla wyniku

### Indeksy wykorzystywane

- `tasks_pkey` (id) - dla WHERE id = ?
- `tasks_user_id_idx` - wspiera RLS
- `UNIQUE (list_id, sort_order)` - dla sprawdzania konfliktów

### Triggery bazy danych

- `trg_tasks_updated_at` - automatycznie aktualizuje `updated_at`
- `trg_tasks_done_at` - automatycznie ustawia/czyści `done_at` przy zmianie statusu

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/task.schema.ts`

```typescript
import { z } from "zod";

export const taskIdSchema = z.string().uuid();

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters").optional(),
  description: z.string().nullable().optional(),
  priority: z
    .union([z.literal(1), z.literal(2), z.literal(3)], {
      errorMap: () => ({ message: "Priority must be 1, 2, or 3" }),
    })
    .optional(),
  status: z
    .union([z.literal(1), z.literal(2)], {
      errorMap: () => ({ message: "Status must be 1 or 2" }),
    })
    .optional(),
  sortOrder: z.number().int().positive("Sort order must be a positive integer").optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

### Krok 2: Utworzenie/rozszerzenie TaskService

**Plik:** `src/lib/services/task.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { TaskDTO, UpdateTaskCommand } from "@/types";

export class TaskService {
  constructor(private supabase: SupabaseClient) {}

  async getTaskById(taskId: string): Promise<TaskEntity | null> {
    const { data, error } = await this.supabase.from("tasks").select("*").eq("id", taskId).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async checkSortOrderConflict(listId: string, sortOrder: number, excludeTaskId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from("tasks")
      .select("id")
      .eq("list_id", listId)
      .eq("sort_order", sortOrder)
      .neq("id", excludeTaskId)
      .single();

    return data !== null;
  }

  async updateTask(taskId: string, command: UpdateTaskCommand): Promise<TaskDTO> {
    const updateData: Record<string, unknown> = {};

    if (command.title !== undefined) updateData.title = command.title;
    if (command.description !== undefined) updateData.description = command.description;
    if (command.priority !== undefined) updateData.priority = command.priority;
    if (command.status !== undefined) updateData.status = command.status;
    if (command.sortOrder !== undefined) updateData.sort_order = command.sortOrder;

    const { data, error } = await this.supabase.from("tasks").update(updateData).eq("id", taskId).select().single();

    if (error) throw error;
    return this.mapToDTO(data);
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

### Krok 3: Utworzenie API Route Handler

**Plik:** `src/pages/api/tasks/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { TaskService } from "@/lib/services/task.service";
import { taskIdSchema, updateTaskSchema } from "@/lib/schemas/task.schema";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Check authentication
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Validate path parameter
  const idResult = taskIdSchema.safeParse(params.id);
  if (!idResult.success) {
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        message: "Invalid task ID format",
        details: { id: "Must be a valid UUID" },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const taskId = idResult.data;

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        message: "Invalid JSON body",
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const bodyResult = updateTaskSchema.safeParse(body);
  if (!bodyResult.success) {
    const details: Record<string, string> = {};
    bodyResult.error.errors.forEach((err) => {
      const field = err.path.join(".");
      details[field] = err.message;
    });
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        message: "Invalid input data",
        details,
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const command = bodyResult.data;

  // 4. Service operations
  const taskService = new TaskService(locals.supabase);

  try {
    // 4a. Fetch task and verify existence
    const existingTask = await taskService.getTaskById(taskId);
    if (!existingTask) {
      return new Response(
        JSON.stringify({
          error: "NOT_FOUND",
          message: "Task not found",
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4b. Check sort order conflict if sortOrder is being updated
    if (command.sortOrder !== undefined) {
      const hasConflict = await taskService.checkSortOrderConflict(existingTask.list_id, command.sortOrder, taskId);
      if (hasConflict) {
        return new Response(
          JSON.stringify({
            error: "CONFLICT",
            message: "Sort order already exists in this list",
          } satisfies ErrorResponseDTO),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4c. Perform update
    const updatedTask = await taskService.updateTask(taskId, command);

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PATCH /api/tasks/:id] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Krok 4: Testy jednostkowe i integracyjne

**Scenariusze do przetestowania:**

1. **Sukces - aktualizacja pojedynczego pola**
   - PATCH z tylko `title` → 200 OK
   - PATCH z tylko `status` → 200 OK, `done_at` automatycznie ustawiony

2. **Sukces - aktualizacja wielu pól**
   - PATCH z `title`, `description`, `priority` → 200 OK

3. **Błędy walidacji (400)**
   - Nieprawidłowy UUID w ścieżce
   - `title` pusty string
   - `title` > 200 znaków
   - `priority` = 4
   - `status` = 0
   - `sortOrder` = -1

4. **Brak uwierzytelnienia (401)**
   - Request bez tokenu sesji

5. **Nie znaleziono (404)**
   - Nieistniejący UUID
   - UUID zadania innego użytkownika

6. **Konflikt (409)**
   - `sortOrder` już używany przez inne zadanie w tej samej liście

### Krok 5: Aktualizacja dokumentacji API

Dodać endpoint do dokumentacji API projektu z przykładami żądań i odpowiedzi.

---

## Podsumowanie

Implementacja wymaga:

1. Nowego pliku schematu Zod: `src/lib/schemas/task.schema.ts`
2. Nowego/rozszerzonego serwisu: `src/lib/services/task.service.ts`
3. Nowego handlera API: `src/pages/api/tasks/[id].ts`

Kluczowe aspekty:

- Walidacja wejścia przez Zod
- Autoryzacja przez RLS + jawne sprawdzenie w serwisie
- Obsługa konfliktu `sortOrder` przed UPDATE
- Wykorzystanie triggerów bazy danych dla `updated_at` i `done_at`
