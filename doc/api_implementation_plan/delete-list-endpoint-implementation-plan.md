# API Endpoint Implementation Plan: DELETE /api/lists/:id

## 1. Przegląd punktu końcowego

Endpoint służy do trwałego usunięcia listy zadań użytkownika wraz ze wszystkimi powiązanymi danymi. Dzięki kaskadowym kluczom obcym w bazie danych, usunięcie listy automatycznie usuwa:

- Wszystkie zadania przypisane do listy (`tasks`)
- Wszystkie interakcje AI powiązane z tymi zadaniami (`ai_interactions`)
- Automatycznie czyści `active_list_id` w profilu użytkownika, jeśli usuwana lista była aktywna

## 2. Szczegóły żądania

- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/lists/:id`
- **Parametry**:
  - **Wymagane**:
    - `id` (parametr ścieżki) - UUID listy do usunięcia
  - **Opcjonalne**: brak
- **Request Body**: brak (metoda DELETE)
- **Nagłówki wymagane**:
  - Cookie z sesją Supabase Auth (obsługiwane przez middleware)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Odpowiedź sukcesu
interface SuccessResponseDTO {
  success: boolean;
}

// Odpowiedź błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Schema walidacji (do utworzenia):

```typescript
// Zod schema dla parametru id
const deleteListParamsSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
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
  "message": "List not found or doesn't belong to user"
}
```

### Błąd 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid list ID format",
  "details": {
    "id": "Invalid list ID format"
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
│                        DELETE /api/lists/:id                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Middleware sprawdza sesję i ustawia context.locals.supabase │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Endpoint pobiera user z context.locals.user                  │
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
│  4. ListService.deleteList(supabase, listId, userId)            │
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

1. `DELETE FROM lists WHERE id = :id AND user_id = :userId`
2. Automatycznie (przez FK CASCADE):
   - Usunięcie wszystkich `tasks` gdzie `list_id = :id`
   - Usunięcie wszystkich `ai_interactions` powiązanych z usuniętymi taskami
3. Automatycznie (przez FK SET NULL):
   - `profiles.active_list_id = NULL` jeśli wskazywało na usuniętą listę

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymaga aktywnej sesji Supabase Auth
- Sesja weryfikowana przez middleware przed dotarciem do endpointu
- Brak sesji → natychmiastowy zwrot 401

### Autoryzacja

- Row Level Security (RLS) w Supabase zapewnia, że użytkownik może usunąć tylko własne listy
- Policy: `user_id = auth.uid()` na operacji DELETE
- Próba usunięcia cudzej listy skutkuje 0 affected rows → 404

### Walidacja danych wejściowych

- UUID walidowany przez Zod przed przekazaniem do bazy danych
- Zapobiega SQL injection i nieprawidłowym zapytaniom

### Ochrona przed IDOR

- RLS automatycznie filtruje po `user_id`
- Użytkownik nie może manipulować zapytaniem, aby usunąć cudze dane

## 7. Obsługa błędów

| Scenariusz                         | Kod HTTP | Typ błędu             | Komunikat                                |
| ---------------------------------- | -------- | --------------------- | ---------------------------------------- |
| Brak sesji użytkownika             | 401      | Unauthorized          | User not authenticated                   |
| Nieprawidłowy format UUID          | 400      | Bad Request           | Invalid list ID format                   |
| Lista nie istnieje                 | 404      | Not Found             | List not found or doesn't belong to user |
| Lista należy do innego użytkownika | 404      | Not Found             | List not found or doesn't belong to user |
| Błąd połączenia z bazą             | 500      | Internal Server Error | An unexpected error occurred             |
| Nieoczekiwany wyjątek              | 500      | Internal Server Error | An unexpected error occurred             |

### Logowanie błędów

- Błędy 500 logowane do konsoli serwera z pełnym stack trace
- Błędy 4xx logowane z poziomem warn (opcjonalnie)
- Nie ujawniać szczegółów wewnętrznych błędów klientowi

## 8. Rozważania dotyczące wydajności

### Optymalizacje

- Pojedyncze zapytanie DELETE (kaskady obsługiwane przez bazę danych)
- RLS eliminuje potrzebę dodatkowego zapytania sprawdzającego własność
- Indeks na `lists.user_id` wspiera filtrowanie RLS

### Potencjalne wąskie gardła

- Duża liczba zadań w liście → dłuższy czas kaskadowego usuwania
- Wiele ai_interactions na zadanie → dodatkowy czas usuwania

### Mitygacja

- Operacja DELETE jest atomowa (transakcja w PostgreSQL)
- Timeout na poziomie Astro/Supabase zapewnia przerwanie zbyt długich operacji
- W przyszłości: rozważyć soft delete dla bardzo dużych list

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji

Utworzyć plik `src/lib/schemas/list.schema.ts` (jeśli nie istnieje) z:

```typescript
import { z } from "zod";

export const deleteListParamsSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
});

export type DeleteListParams = z.infer<typeof deleteListParamsSchema>;
```

### Krok 2: Utworzenie/rozszerzenie serwisu list

Utworzyć lub rozszerzyć `src/lib/services/list.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";

export class ListService {
  /**
   * Deletes a list belonging to the user.
   * Cascades to tasks and ai_interactions.
   * @throws Error if list not found or deletion fails
   */
  static async deleteList(supabase: SupabaseClient, listId: string, userId: string): Promise<void> {
    const { error, count } = await supabase
      .from("lists")
      .delete({ count: "exact" })
      .eq("id", listId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete list:", error);
      throw new Error("Database error during list deletion");
    }

    if (count === 0) {
      throw new ListNotFoundError(listId);
    }
  }
}

export class ListNotFoundError extends Error {
  constructor(listId: string) {
    super(`List not found: ${listId}`);
    this.name = "ListNotFoundError";
  }
}
```

### Krok 3: Utworzenie endpointu API

Utworzyć plik `src/pages/api/lists/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { deleteListParamsSchema } from "@/lib/schemas/list.schema";
import { ListService, ListNotFoundError } from "@/lib/services/list.service";
import type { SuccessResponseDTO, ErrorResponseDTO } from "@/types";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Check authentication
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "User not authenticated",
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Validate path parameter
  const validation = deleteListParamsSchema.safeParse({ id: params.id });
  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid list ID format",
        details: { id: fieldErrors.id?.[0] ?? "Invalid format" },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id: listId } = validation.data;

  // 3. Delete list via service
  try {
    await ListService.deleteList(locals.supabase, listId, user.id);

    return new Response(JSON.stringify({ success: true } satisfies SuccessResponseDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 4. Handle known errors
    if (error instanceof ListNotFoundError) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "List not found or doesn't belong to user",
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Handle unexpected errors
    console.error("Unexpected error deleting list:", error);
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

### Krok 4: Weryfikacja typów i importów

Upewnić się, że:

- `SupabaseClient` importowany z `@/db/supabase.client`
- `locals.user` i `locals.supabase` dostępne (ustawiane przez middleware)
- Aliasy ścieżek (`@/`) skonfigurowane w `tsconfig.json`

### Krok 5: Testy manualne

Przetestować scenariusze:

1. ✅ Usunięcie własnej listy → 200 + success: true
2. ✅ Usunięcie nieistniejącej listy → 404
3. ✅ Próba bez autoryzacji → 401
4. ✅ Nieprawidłowy UUID → 400
5. ✅ Sprawdzenie kaskadowego usunięcia tasks
6. ✅ Sprawdzenie wyczyszczenia active_list_id w profiles

### Krok 6: Integracja z istniejącymi endpointami

Jeśli plik `src/pages/api/lists/[id].ts` już istnieje z innymi metodami (GET, PATCH), dodać eksport `DELETE` do istniejącego pliku zamiast tworzenia nowego.
