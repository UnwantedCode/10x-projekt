# API Endpoint Implementation Plan: POST /api/lists

## 1. Przegląd punktu końcowego

Endpoint `POST /api/lists` umożliwia zalogowanemu użytkownikowi utworzenie nowej listy zadań. Lista jest przypisana do użytkownika na podstawie jego sesji uwierzytelnienia. Endpoint zwraca utworzoną listę z wygenerowanym UUID oraz timestampami utworzenia i aktualizacji.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/lists`
- **Parametry:**
  - **Wymagane:** brak (parametry URL)
  - **Opcjonalne:** brak
- **Request Body:**
  ```json
  {
    "name": "string"
  }
  ```
- **Walidacja body:**
  - `name`: wymagany, string, 1-100 znaków

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Command model dla żądania
interface CreateListCommand {
  name: string;
}

// DTO dla odpowiedzi
interface ListDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// DTO dla błędów
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowy Zod schema (do utworzenia w `src/lib/schemas/list.schema.ts`):

```typescript
import { z } from "zod";

export const createListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Task List",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Błąd walidacji (400 Bad Request):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "details": {
    "name": "Name is required"
  }
}
```

### Duplikat nazwy (400 Bad Request):
```json
{
  "error": "DUPLICATE_NAME",
  "message": "A list with this name already exists"
}
```

### Brak autoryzacji (401 Unauthorized):
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### Błąd serwera (500 Internal Server Error):
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Client    │────▶│  API Route   │────▶│  List Service   │────▶│   Supabase   │
│             │     │ /api/lists   │     │                 │     │  (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
      │                    │                     │                       │
      │  POST /api/lists   │                     │                       │
      │  { name: "..." }   │                     │                       │
      │───────────────────▶│                     │                       │
      │                    │  1. Sprawdź sesję   │                       │
      │                    │     (middleware)    │                       │
      │                    │                     │                       │
      │                    │  2. Waliduj body    │                       │
      │                    │     (Zod schema)    │                       │
      │                    │                     │                       │
      │                    │  3. createList()    │                       │
      │                    │────────────────────▶│                       │
      │                    │                     │  4. INSERT INTO lists │
      │                    │                     │────────────────────▶│
      │                    │                     │                       │
      │                    │                     │  5. Return row        │
      │                    │                     │◀────────────────────│
      │                    │  6. Return ListDTO  │                       │
      │                    │◀────────────────────│                       │
      │  201 Created       │                     │                       │
      │  { id, name, ... } │                     │                       │
      │◀───────────────────│                     │                       │
```

### Szczegółowy przepływ:

1. **Middleware** (`src/middleware/index.ts`):
   - Sprawdza obecność sesji Supabase
   - Ustawia `context.locals.supabase` i `context.locals.user`

2. **API Route** (`src/pages/api/lists.ts`):
   - Weryfikuje czy użytkownik jest zalogowany (`context.locals.user`)
   - Parsuje i waliduje body żądania używając Zod schema
   - Wywołuje `ListService.createList()`
   - Mapuje wynik na `ListDTO` i zwraca odpowiedź

3. **List Service** (`src/lib/services/list.service.ts`):
   - Wykonuje INSERT do tabeli `lists`
   - Obsługuje błędy unikalności nazwy
   - Zwraca utworzony rekord

4. **Supabase/PostgreSQL**:
   - RLS automatycznie weryfikuje `user_id = auth.uid()`
   - Constraint `UNIQUE(user_id, lower(name))` zapobiega duplikatom
   - Trigger `trg_lists_updated_at` ustawia `updated_at`

## 6. Względy bezpieczeństwa

### Uwierzytelnienie:
- Wymagana aktywna sesja Supabase
- Użytkownik identyfikowany przez `auth.uid()` z tokenu JWT
- Brak sesji = 401 Unauthorized

### Autoryzacja:
- RLS policy na tabeli `lists`: `user_id = auth.uid()`
- Użytkownik może tworzyć listy tylko dla siebie
- `user_id` ustawiany automatycznie z sesji, nie z request body

### Walidacja danych:
- Zod schema waliduje strukturę i typy
- Constraint DB `CHECK (char_length(name) BETWEEN 1 AND 100)` jako dodatkowa warstwa
- `trim()` na nazwie usuwa białe znaki na początku/końcu

### Ochrona przed atakami:
- **SQL Injection:** Supabase SDK używa parametryzowanych zapytań
- **XSS:** Dane nie są renderowane jako HTML; nazwa przechowywana as-is
- **Mass Assignment:** Tylko pole `name` akceptowane z body

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Kod błędu | Wiadomość |
|------------|----------|-----------|-----------|
| Brak body w żądaniu | 400 | VALIDATION_ERROR | Invalid request data |
| Pusta nazwa (po trim) | 400 | VALIDATION_ERROR | Name is required |
| Nazwa > 100 znaków | 400 | VALIDATION_ERROR | Name must be at most 100 characters |
| Duplikat nazwy (case-insensitive) | 400 | DUPLICATE_NAME | A list with this name already exists |
| Brak sesji/tokenu | 401 | UNAUTHORIZED | Authentication required |
| Błąd bazy danych | 500 | INTERNAL_ERROR | An unexpected error occurred |

### Mapowanie błędów Supabase:

```typescript
// Unique constraint violation (PostgreSQL error code 23505)
if (error.code === "23505") {
  return { error: "DUPLICATE_NAME", status: 400 };
}
```

## 8. Rozważania dotyczące wydajności

### Indeksy:
- `lists_user_id_idx` na `lists(user_id)` - wspiera RLS
- Unique index na `(user_id, lower(name))` - wspiera sprawdzanie duplikatów

### Optymalizacje:
- Pojedyncze zapytanie INSERT z RETURNING - brak dodatkowego SELECT
- RLS wykonywane na poziomie bazy, nie w aplikacji
- Brak N+1 queries - operacja atomowa

### Potencjalne wąskie gardła:
- Przy bardzo dużej liczbie list per użytkownik: sprawdzenie unikalności może być wolniejsze
- Mitygacja: indeks na `(user_id, lower(name))` zapewnia O(log n) lookup

## 9. Etapy wdrożenia

### Krok 1: Utworzenie Zod schema

**Plik:** `src/lib/schemas/list.schema.ts`

```typescript
import { z } from "zod";

export const createListSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
```

### Krok 2: Utworzenie List Service

**Plik:** `src/lib/services/list.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { ListDTO } from "@/types";
import type { CreateListInput } from "@/lib/schemas/list.schema";

interface CreateListResult {
  data: ListDTO | null;
  error: { code: string; message: string } | null;
}

export async function createList(
  supabase: SupabaseClient,
  userId: string,
  input: CreateListInput
): Promise<CreateListResult> {
  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: userId,
      name: input.name,
    })
    .select("id, name, created_at, updated_at")
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      return {
        data: null,
        error: {
          code: "DUPLICATE_NAME",
          message: "A list with this name already exists",
        },
      };
    }

    console.error("Failed to create list:", error);
    return {
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }

  return {
    data: {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    error: null,
  };
}
```

### Krok 3: Utworzenie API Route

**Plik:** `src/pages/api/lists.ts`

```typescript
import type { APIRoute } from "astro";
import { createListSchema } from "@/lib/schemas/list.schema";
import { createList } from "@/lib/services/list.service";
import type { ListDTO, ErrorResponseDTO } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Check authentication
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

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResponse: ErrorResponseDTO = {
      error: "VALIDATION_ERROR",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationResult = createListSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    const errorResponse: ErrorResponseDTO = {
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Create list via service
  const supabase = locals.supabase;
  const result = await createList(supabase, user.id, validationResult.data);

  if (result.error) {
    const status = result.error.code === "DUPLICATE_NAME" ? 400 : 500;
    const errorResponse: ErrorResponseDTO = {
      error: result.error.code,
      message: result.error.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Return created list
  return new Response(JSON.stringify(result.data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Krok 4: Weryfikacja middleware

Upewnij się, że `src/middleware/index.ts` ustawia:
- `context.locals.supabase` - klient Supabase
- `context.locals.user` - obiekt użytkownika z sesji (lub `null`)

### Krok 5: Testowanie

**Scenariusze do przetestowania:**

1. ✅ Sukces - utworzenie listy z poprawną nazwą
2. ✅ Błąd 400 - pusta nazwa
3. ✅ Błąd 400 - nazwa > 100 znaków
4. ✅ Błąd 400 - duplikat nazwy (case-insensitive)
5. ✅ Błąd 401 - brak tokenu/sesji
6. ✅ Błąd 400 - nieprawidłowy JSON

**Przykładowe curl:**

```bash
# Sukces
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "My Tasks"}'

# Błąd walidacji - pusta nazwa
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": ""}'

# Błąd - brak autoryzacji
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```