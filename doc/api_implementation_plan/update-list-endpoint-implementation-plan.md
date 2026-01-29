# API Endpoint Implementation Plan: Update List

## 1. Przegląd punktu końcowego

Endpoint PATCH /api/lists/:id umożliwia zalogowanemu użytkownikowi aktualizację nazwy istniejącej listy zadań. Endpoint wymaga autentykacji i pozwala na modyfikację wyłącznie list należących do zalogowanego użytkownika (owner-only model).

## 2. Szczegóły żądania

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/lists/:id`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID listy do aktualizacji
  - **Opcjonalne:** brak
- **Request Body:**
  ```json
  {
    "name": "string"
  }
  ```
- **Content-Type:** application/json

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

```typescript
// Command do aktualizacji listy
interface UpdateListCommand {
  name: string;
}

// DTO odpowiedzi
interface ListDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// DTO błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowe typy do utworzenia

```typescript
// Zod schema dla walidacji path parametru (src/lib/schemas/list.schema.ts)
const listIdParamSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
});

// Zod schema dla walidacji body
const updateListSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").trim(),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "uuid",
  "name": "Updated List Name",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:45:00.000Z"
}
```

### Błędy

| Kod | Typ błędu             | Opis                                                                           |
| --- | --------------------- | ------------------------------------------------------------------------------ |
| 400 | Bad Request           | Błąd walidacji (niepoprawny UUID, pusta nazwa, nazwa za długa, duplikat nazwy) |
| 401 | Unauthorized          | Użytkownik niezalogowany                                                       |
| 404 | Not Found             | Lista nie istnieje lub nie należy do użytkownika                               |
| 500 | Internal Server Error | Nieoczekiwany błąd serwera                                                     |

### Przykładowa odpowiedź błędu (400)

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {
    "name": "Name must be at most 100 characters"
  }
}
```

### Przykładowa odpowiedź błędu duplikatu nazwy (400)

```json
{
  "error": "Bad Request",
  "message": "A list with this name already exists"
}
```

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│  API Route   │────▶│ ListService │────▶│   Supabase   │
│             │     │  (Astro)     │     │             │     │  (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
      │                    │                    │                    │
      │  PATCH /api/       │                    │                    │
      │  lists/:id         │                    │                    │
      │  {name: "..."}     │                    │                    │
      │───────────────────▶│                    │                    │
      │                    │                    │                    │
      │                    │ 1. Auth check      │                    │
      │                    │    (context.locals │                    │
      │                    │     .user)         │                    │
      │                    │                    │                    │
      │                    │ 2. Validate params │                    │
      │                    │    & body (Zod)    │                    │
      │                    │                    │                    │
      │                    │ 3. Call service    │                    │
      │                    │───────────────────▶│                    │
      │                    │                    │ 4. UPDATE lists    │
      │                    │                    │    SET name = ?    │
      │                    │                    │    WHERE id = ?    │
      │                    │                    │    (RLS enforced)  │
      │                    │                    │───────────────────▶│
      │                    │                    │                    │
      │                    │                    │◀───────────────────│
      │                    │                    │    updated row     │
      │                    │◀───────────────────│                    │
      │                    │   ListDTO          │                    │
      │◀───────────────────│                    │                    │
      │   200 OK + JSON    │                    │                    │
```

### Szczegółowy przepływ:

1. **Request przyjęty** - Astro route handler odbiera żądanie PATCH
2. **Weryfikacja autentykacji** - Sprawdzenie `context.locals.user`
3. **Walidacja path param** - Weryfikacja formatu UUID parametru `id`
4. **Walidacja body** - Walidacja `name` przez Zod schema
5. **Wywołanie serwisu** - `ListService.updateList()`
6. **Operacja bazodanowa** - UPDATE z warunkiem WHERE id = ? (RLS wymusza user_id = auth.uid())
7. **Mapowanie odpowiedzi** - Konwersja row na ListDTO (camelCase)
8. **Zwrot odpowiedzi** - 200 OK z zaktualizowanym obiektem

## 6. Względy bezpieczeństwa

### Autentykacja

- Endpoint wymaga zalogowanego użytkownika
- Weryfikacja przez `context.locals.user` (ustawiane w middleware)
- Brak użytkownika → 401 Unauthorized

### Autoryzacja

- Model owner-only: użytkownik może modyfikować tylko swoje listy
- Wymuszenie przez Supabase RLS policy: `user_id = auth.uid()`
- Próba modyfikacji cudzej listy → brak wyniku → 404 Not Found

### Walidacja danych wejściowych

- UUID format dla `id` - ochrona przed injection
- Sanityzacja `name` - trim whitespace
- Limit długości `name` (1-100) - zgodność z constraint w DB
- Supabase SDK automatycznie escapuje wartości (ochrona przed SQL injection)

### Ochrona przed duplikatami

- Constraint UNIQUE(user_id, lower(name)) w bazie danych
- Obsługa błędu constraint violation → 400 Bad Request

## 7. Obsługa błędów

| Scenariusz                         | Wykrycie                           | Kod HTTP | Odpowiedź                                                                                                          |
| ---------------------------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Brak użytkownika w sesji           | `!context.locals.user`             | 401      | `{ error: "Unauthorized", message: "Authentication required" }`                                                    |
| Niepoprawny format UUID            | Zod validation fail                | 400      | `{ error: "Bad Request", message: "Invalid list ID format" }`                                                      |
| Pusta nazwa                        | Zod validation fail                | 400      | `{ error: "Bad Request", message: "Validation failed", details: { name: "Name is required" } }`                    |
| Nazwa za długa (>100)              | Zod validation fail                | 400      | `{ error: "Bad Request", message: "Validation failed", details: { name: "Name must be at most 100 characters" } }` |
| Duplikat nazwy                     | DB unique constraint (code: 23505) | 400      | `{ error: "Bad Request", message: "A list with this name already exists" }`                                        |
| Lista nie istnieje                 | Supabase returns null/empty        | 404      | `{ error: "Not Found", message: "List not found" }`                                                                |
| Lista należy do innego użytkownika | RLS blocks, returns null           | 404      | `{ error: "Not Found", message: "List not found" }`                                                                |
| Nieoczekiwany błąd DB              | Supabase error                     | 500      | `{ error: "Internal Server Error", message: "An unexpected error occurred" }`                                      |

### Logowanie błędów

- Poziom WARN: błędy walidacji (400)
- Poziom ERROR: błędy bazy danych (500), z pełnym stack trace

## 8. Rozważania dotyczące wydajności

### Optymalizacje

- **Single query** - UPDATE z RETURNING eliminuje potrzebę dodatkowego SELECT
- **Indeks** - `lists_user_id_idx` wspiera RLS check
- **Unique constraint index** - Szybkie sprawdzanie duplikatów nazw

### Potencjalne wąskie gardła

- Brak - operacja UPDATE na pojedynczym rekordzie jest bardzo szybka
- RLS nie powoduje dodatkowego overhead dzięki indeksowi na `user_id`

### Trigger updated_at

- Automatyczna aktualizacja `updated_at` przez trigger `trg_lists_updated_at`
- Nie wymaga jawnego ustawienia w aplikacji

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/list.schema.ts`

```typescript
import { z } from "zod";

export const listIdParamSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
});

export const updateListSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").trim(),
});

export type UpdateListInput = z.infer<typeof updateListSchema>;
```

### Krok 2: Utworzenie/rozszerzenie ListService

**Plik:** `src/lib/services/list.service.ts`

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { ListDTO, UpdateListCommand } from "../../types";

export class ListService {
  constructor(private supabase: SupabaseClient) {}

  async updateList(listId: string, userId: string, command: UpdateListCommand): Promise<ListDTO | null> {
    const { data, error } = await this.supabase
      .from("lists")
      .update({ name: command.name })
      .eq("id", listId)
      .eq("user_id", userId) // dodatkowe zabezpieczenie oprócz RLS
      .select("id, name, created_at, updated_at")
      .single();

    if (error) {
      // Przekaż błąd wyżej do obsługi w route
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
```

### Krok 3: Implementacja API route

**Plik:** `src/pages/api/lists/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { listIdParamSchema, updateListSchema } from "../../../lib/schemas/list.schema";
import { ListService } from "../../../lib/services/list.service";
import type { ListDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Sprawdzenie autentykacji
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Walidacja path parametru
  const paramValidation = listIdParamSchema.safeParse(params);
  if (!paramValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid list ID format",
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const { id: listId } = paramValidation.data;

  // 3. Parsowanie i walidacja body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid JSON body",
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const bodyValidation = updateListSchema.safeParse(body);
  if (!bodyValidation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of bodyValidation.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] = issue.message;
    }
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Validation failed",
        details: fieldErrors,
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Wywołanie serwisu
  const listService = new ListService(locals.supabase);

  try {
    const updatedList = await listService.updateList(listId, user.id, bodyValidation.data);

    // 5. Obsługa przypadku gdy lista nie istnieje
    if (!updatedList) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "List not found",
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Sukces - zwrot zaktualizowanej listy
    return new Response(JSON.stringify(updatedList satisfies ListDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // 7. Obsługa błędu duplikatu nazwy
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "A list with this name already exists",
        } satisfies ErrorResponseDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Logowanie nieoczekiwanego błędu
    console.error("Error updating list:", error);

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

### Krok 4: Rozszerzenie typów dla Astro locals (jeśli nie istnieje)

**Plik:** `src/env.d.ts` (sprawdzić i uzupełnić)

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import("./db/supabase.client").SupabaseClient;
    user: import("@supabase/supabase-js").User | null;
  }
}
```

### Krok 5: Testy manualne

1. **Test 401** - Wywołanie bez tokenu autoryzacji
2. **Test 400 (UUID)** - Wywołanie z niepoprawnym ID: `/api/lists/not-a-uuid`
3. **Test 400 (name)** - Wywołanie z pustą nazwą lub nazwą > 100 znaków
4. **Test 400 (duplicate)** - Wywołanie z nazwą która już istnieje dla użytkownika
5. **Test 404** - Wywołanie z nieistniejącym UUID
6. **Test 404 (other user)** - Wywołanie z ID listy innego użytkownika
7. **Test 200** - Poprawna aktualizacja nazwy listy

### Checklist przed wdrożeniem

- [ ] Schema walidacji Zod utworzona i przetestowana
- [ ] ListService utworzony/rozszerzony z metodą updateList
- [ ] API route zaimplementowany w `src/pages/api/lists/[id].ts`
- [ ] Typy Astro locals skonfigurowane
- [ ] Wszystkie scenariusze błędów obsłużone
- [ ] Testy manualne przeprowadzone
- [ ] Kod przeglądnięty pod kątem bezpieczeństwa
- [ ] Linter i formatter uruchomione (`npm run lint:fix && npm run format`)
