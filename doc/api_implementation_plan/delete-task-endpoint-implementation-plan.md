# API Endpoint Implementation Plan: DELETE /api/tasks/:id

## 1. Przegląd punktu końcowego

Endpoint służy do trwałego usunięcia pojedynczego zadania użytkownika. Dzięki kaskadowym kluczom obcym w bazie danych, usunięcie zadania automatycznie usuwa wszystkie powiązane interakcje AI (`ai_interactions`). Operacja jest nieodwracalna (hard delete).

## 2. Szczegóły żądania

- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/tasks/:id`
- **Parametry**:
  - **Wymagane**:
    - `id` (parametr ścieżki) - UUID zadania do usunięcia
  - **Opcjonalne**: brak
- **Request Body**: brak (metoda DELETE)
- **Nagłówki wymagane**:
  - Cookie z sesją Supabase Auth (obsługiwane przez middleware)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Odpowiedź sukcesu (linia 28-30)
interface SuccessResponseDTO {
  success: boolean;
}

// Odpowiedź błędu (linia 35-39)
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Schema walidacji (do utworzenia):

```typescript
// Zod schema dla parametru id
const deleteTaskParamsSchema = z.object({
  id: z.string().uuid("Invalid task ID format")
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)
```json
{
  "success": true
}
```

### Błąd 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "User not authenticated"
}
```

### Błąd 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Task not found or doesn't belong to user"
}
```

### Błąd 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid task ID format",
  "details": {
    "id": "Invalid task ID format"
  }
}
```

### Błąd 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────┐
│                        DELETE /api/tasks/:id                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Middleware sprawdza sesję i ustawia context.locals.supabase │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Endpoint pobiera user z supabase.auth.getUser()             │
│     → Brak user? Zwróć 401                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Walidacja UUID parametru :id (Zod)                          │
│     → Nieprawidłowy format? Zwróć 400                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. TaskService.deleteTask(supabase, taskId, userId)            │
│     → Supabase DELETE z RLS                                      │
│     → 0 affected rows? Zwróć 404                                │
│     → Błąd DB? Zwróć 500                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Zwróć { "success": true } z kodem 200                       │
└─────────────────────────────────────────────────────────────────┘
```

### Kaskadowe operacje w bazie danych:
1. `DELETE FROM tasks WHERE id = :id AND user_id = :userId`
2. Automatycznie (przez FK CASCADE):
   - Usunięcie wszystkich `ai_interactions` gdzie `task_id = :id`

**Uwaga**: RLS policy `user_id = auth.uid()` na tabeli `tasks` zapewnia, że użytkownik może usunąć tylko własne zadania.

## 6. Względy bezpieczeństwa

### Uwierzytelnianie
- Wymaga aktywnej sesji Supabase Auth
- Sesja weryfikowana przez `supabase.auth.getUser()` w endpoincie
- Brak sesji → natychmiastowy zwrot 401

### Autoryzacja
- Row Level Security (RLS) w Supabase zapewnia, że użytkownik może usunąć tylko własne zadania
- Policy: `user_id = auth.uid()` na operacji DELETE
- Próba usunięcia cudzego zadania skutkuje 0 affected rows → 404

### Walidacja danych wejściowych
- UUID walidowany przez Zod przed przekazaniem do bazy danych
- Zapobiega SQL injection i nieprawidłowym zapytaniom

### Ochrona przed IDOR (Insecure Direct Object Reference)
- RLS automatycznie filtruje po `user_id`
- Użytkownik nie może manipulować zapytaniem, aby usunąć cudze dane
- Celowo nie rozróżniamy "nie istnieje" od "nie należy do Ciebie" (oba → 404)

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Typ błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak sesji użytkownika | 401 | Unauthorized | User not authenticated |
| Nieprawidłowy format UUID | 400 | Bad Request | Invalid task ID format |
| Zadanie nie istnieje | 404 | Not Found | Task not found or doesn't belong to user |
| Zadanie należy do innego użytkownika | 404 | Not Found | Task not found or doesn't belong to user |
| Błąd połączenia z bazą | 500 | Internal Server Error | An unexpected error occurred |
| Nieoczekiwany wyjątek | 500 | Internal Server Error | An unexpected error occurred |

### Logowanie błędów
- Błędy 500 logowane do konsoli serwera z pełnym stack trace
- Błędy 4xx logowane z poziomem warn (opcjonalnie)
- Nie ujawniać szczegółów wewnętrznych błędów klientowi

## 8. Rozważania dotyczące wydajności

### Optymalizacje
- Pojedyncze zapytanie DELETE (kaskady obsługiwane przez bazę danych)
- RLS eliminuje potrzebę dodatkowego zapytania sprawdzającego własność
- Indeks `tasks_user_id_idx` na `tasks.user_id` wspiera filtrowanie RLS
- Indeks na `ai_interactions(task_id)` wspiera kaskadowe usuwanie

### Potencjalne wąskie gardła
- Wiele `ai_interactions` na zadanie → dłuższy czas kaskadowego usuwania
- W praktyce MVP: liczba interakcji na zadanie powinna być niewielka

### Mitygacja
- Operacja DELETE jest atomowa (transakcja w PostgreSQL)
- Timeout na poziomie Astro/Supabase zapewnia przerwanie zbyt długich operacji

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji

Utworzyć plik `src/lib/schemas/task.schema.ts` (jeśli nie istnieje) z:

```typescript
import { z } from "zod";

export const deleteTaskParamsSchema = z.object({
  id: z.string().uuid("Invalid task ID format")
});

export type DeleteTaskParams = z.infer<typeof deleteTaskParamsSchema>;
```

### Krok 2: Utworzenie/rozszerzenie serwisu tasks

Utworzyć lub rozszerzyć `src/lib/services/task.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";

export class TaskService {
  /**
   * Deletes a task belonging to the user.
   * Cascades to ai_interactions.
   * @returns true if task was deleted
   * @throws TaskNotFoundError if task not found or doesn't belong to user
   * @throws Error for database errors
   */
  static async deleteTask(
    supabase: SupabaseClient,
    taskId: string,
    userId: string
  ): Promise<void> {
    const { error, count } = await supabase
      .from("tasks")
      .delete({ count: "exact" })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete task:", error);
      throw new Error("Database error during task deletion");
    }

    if (count === 0) {
      throw new TaskNotFoundError(taskId);
    }
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}
```

### Krok 3: Utworzenie endpointu API

Utworzyć plik `src/pages/api/tasks/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { deleteTaskParamsSchema } from "@/lib/schemas/task.schema";
import { TaskService, TaskNotFoundError } from "@/lib/services/task.service";
import type { SuccessResponseDTO, ErrorResponseDTO } from "@/types";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;

  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "User not authenticated"
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Validate path parameter
  const validation = deleteTaskParamsSchema.safeParse({ id: params.id });
  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid task ID format",
        details: { id: fieldErrors.id?.[0] ?? "Invalid format" }
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id: taskId } = validation.data;

  // 3. Delete task via service
  try {
    await TaskService.deleteTask(supabase, taskId, user.id);

    return new Response(
      JSON.stringify({ success: true } satisfies SuccessResponseDTO),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // 4. Handle known errors
    if (error instanceof TaskNotFoundError) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Task not found or doesn't belong to user"
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Handle unexpected errors
    console.error("Unexpected error deleting task:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred"
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Krok 4: Eksport typu SupabaseClient

Upewnić się, że `src/db/supabase.client.ts` eksportuje typ klienta:

```typescript
import { createClient, SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// ... existing code ...

export type SupabaseClient = BaseSupabaseClient<Database>;
```

### Krok 5: Weryfikacja konfiguracji

Upewnić się, że:
- Aliasy ścieżek (`@/`) skonfigurowane w `tsconfig.json`
- Zod zainstalowany jako zależność (`npm install zod`)
- Middleware ustawia `context.locals.supabase`

### Krok 6: Testy manualne

Przetestować scenariusze:
1. ✅ Usunięcie własnego zadania → 200 + `{ "success": true }`
2. ✅ Usunięcie nieistniejącego zadania → 404
3. ✅ Próba usunięcia cudzego zadania → 404 (nie 403, dla bezpieczeństwa)
4. ✅ Próba bez autoryzacji → 401
5. ✅ Nieprawidłowy UUID (np. "abc") → 400
6. ✅ Sprawdzenie kaskadowego usunięcia `ai_interactions`

### Krok 7: Integracja z istniejącymi endpointami

Jeśli plik `src/pages/api/tasks/[id].ts` już istnieje z innymi metodami (GET, PATCH), dodać eksport `DELETE` do istniejącego pliku zamiast tworzenia nowego.

```typescript
// Przykład rozszerzenia istniejącego pliku
export const GET: APIRoute = async ({ params, locals }) => { /* ... */ };
export const PATCH: APIRoute = async ({ params, locals }) => { /* ... */ };
export const DELETE: APIRoute = async ({ params, locals }) => { /* ... */ };
```