# API Endpoint Implementation Plan: GET /api/lists/:id

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania szczegółów pojedynczej listy zadań na podstawie jej identyfikatora UUID. Wymaga uwierzytelnienia użytkownika i zwraca dane listy tylko jeśli należy ona do zalogowanego użytkownika. Row Level Security (RLS) w Supabase automatycznie filtruje wyniki według `user_id`.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/lists/:id`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID listy do pobrania
  - **Opcjonalne:** brak
- **Request Body:** brak (metoda GET)
- **Headers:**
  - `Authorization: Bearer <token>` lub cookie sesji Supabase

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Response DTO (linie 80-85)
interface ListDTO {
  id: string;           // UUID listy
  name: string;         // Nazwa listy (1-100 znaków)
  createdAt: string;    // ISO8601 timestamp
  updatedAt: string;    // ISO8601 timestamp
}

// Error response (linie 35-39)
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowy schema walidacji Zod:

```typescript
// src/lib/schemas/list.schema.ts
import { z } from "zod";

export const getListByIdParamsSchema = z.object({
  id: z.string().uuid("Invalid list ID format")
});

export type GetListByIdParams = z.infer<typeof getListByIdParamsSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Moja lista zadań",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T14:45:00.000Z"
}
```

### Błąd 401 Unauthorized:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Błąd 404 Not Found:
```json
{
  "error": "Not Found",
  "message": "List not found"
}
```

### Błąd 400 Bad Request (opcjonalnie):
```json
{
  "error": "Bad Request",
  "message": "Invalid list ID format",
  "details": {
    "id": "Invalid list ID format"
  }
}
```

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Klient    │────▶│  API Route   │────▶│  List Service   │────▶│   Supabase   │
│  (Request)  │     │ /api/lists/  │     │  getListById()  │     │  (RLS+Query) │
└─────────────┘     │     :id      │     └─────────────────┘     └──────────────┘
                    └──────────────┘              │                      │
                           │                      │                      │
                    ┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐
                    │ 1. Auth     │        │ 3. Query DB │        │ 4. RLS      │
                    │    Check    │        │    via      │        │    Filter   │
                    └─────────────┘        │    Supabase │        │    user_id  │
                           │               └─────────────┘        └─────────────┘
                    ┌──────▼──────┐                                      │
                    │ 2. Validate │                               ┌──────▼──────┐
                    │    UUID     │                               │ 5. Map to   │
                    └─────────────┘                               │    ListDTO  │
                                                                  └─────────────┘
```

### Szczegółowy przepływ:

1. **Walidacja sesji** - Middleware sprawdza `context.locals.user`
2. **Walidacja parametru** - Zod waliduje format UUID
3. **Zapytanie do bazy** - Service wykonuje SELECT przez Supabase client
4. **Filtrowanie RLS** - Supabase automatycznie filtruje po `user_id = auth.uid()`
5. **Mapowanie odpowiedzi** - Konwersja snake_case → camelCase

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:
- Sprawdzenie `context.locals.user` przed przetwarzaniem żądania
- Brak użytkownika → natychmiastowy return 401

### Autoryzacja:
- RLS policy na tabeli `lists`: `using (user_id = auth.uid())`
- Automatyczne filtrowanie - użytkownik nie może pobrać cudzej listy
- Brak listy w wyniku zapytania → 404 (nie ujawniamy czy lista istnieje)

### Walidacja danych:
- Walidacja UUID zapobiega SQL injection
- Zod schema z dokładnym typem `uuid`

### Ochrona przed atakami:
- **IDOR:** RLS zapewnia, że użytkownik widzi tylko swoje zasoby
- **Information Disclosure:** 404 dla nieistniejących i cudzych list (identyczna odpowiedź)

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Typ błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak sesji użytkownika | 401 | Unauthorized | Authentication required |
| Nieprawidłowy format UUID | 400 | Bad Request | Invalid list ID format |
| Lista nie istnieje | 404 | Not Found | List not found |
| Lista należy do innego użytkownika | 404 | Not Found | List not found |
| Błąd bazy danych | 500 | Internal Server Error | Internal server error |

### Strategia obsługi:
```typescript
// Kolejność sprawdzania w endpoint handler:
1. if (!user) → 401
2. if (!validUUID) → 400 (opcjonalnie można pominąć i zwrócić 404)
3. if (!list) → 404
4. catch (error) → 500 + console.error
```

## 8. Rozważania dotyczące wydajności

### Obecna optymalizacja:
- **Indeks:** `lists_user_id_idx` na `lists(user_id)` wspiera filtrowanie RLS
- **Primary Key:** `id` ma automatyczny indeks B-tree
- **Pojedyncze zapytanie:** SELECT z WHERE id + RLS

### Potencjalne optymalizacje (przyszłość):
- Cache warstwy aplikacji dla często odczytywanych list
- HTTP caching headers (ETag, Cache-Control) dla klientów

### Złożoność zapytania:
- O(1) - lookup po primary key z filtrem RLS
- Bardzo wydajne dla pojedynczego rekordu

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/list.schema.ts`

```typescript
import { z } from "zod";

export const getListByIdParamsSchema = z.object({
  id: z.string().uuid("Invalid list ID format")
});

export type GetListByIdParams = z.infer<typeof getListByIdParamsSchema>;
```

### Krok 2: Implementacja funkcji serwisowej

**Plik:** `src/lib/services/list.service.ts`

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { ListDTO } from "../../types";

export async function getListById(
  supabase: SupabaseClient,
  listId: string
): Promise<ListDTO | null> {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, created_at, updated_at")
    .eq("id", listId)
    .single();

  if (error) {
    // PGRST116 = no rows found (expected for 404)
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
```

### Krok 3: Implementacja endpointu API

**Plik:** `src/pages/api/lists/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { getListByIdParamsSchema } from "../../../lib/schemas/list.schema";
import { getListById } from "../../../lib/services/list.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Sprawdzenie uwierzytelnienia
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required"
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Walidacja parametru ID
  const validation = getListByIdParamsSchema.safeParse({ id: params.id });
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid list ID format",
        details: validation.error.flatten().fieldErrors
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 3. Pobranie listy z bazy
    const list = await getListById(locals.supabase, validation.data.id);

    // 4. Sprawdzenie czy lista istnieje
    if (!list) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "List not found"
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Zwrócenie listy
    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching list:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Internal server error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Krok 4: Weryfikacja middleware uwierzytelniania

**Plik:** `src/middleware/index.ts`

Upewnić się, że middleware:
- Ustawia `context.locals.user` z sesji Supabase
- Ustawia `context.locals.supabase` z klientem Supabase
- Działa dla ścieżek `/api/*`

### Krok 5: Testy manualne

1. **Test 401:** Wywołanie bez tokenu autoryzacji
   ```bash
   curl -X GET http://localhost:3000/api/lists/550e8400-e29b-41d4-a716-446655440000
   ```

2. **Test 400:** Wywołanie z nieprawidłowym UUID
   ```bash
   curl -X GET http://localhost:3000/api/lists/invalid-uuid \
     -H "Authorization: Bearer <token>"
   ```

3. **Test 404:** Wywołanie z nieistniejącym UUID
   ```bash
   curl -X GET http://localhost:3000/api/lists/550e8400-e29b-41d4-a716-446655440000 \
     -H "Authorization: Bearer <token>"
   ```

4. **Test 200:** Wywołanie z istniejącą listą użytkownika
   ```bash
   curl -X GET http://localhost:3000/api/lists/<valid-list-id> \
     -H "Authorization: Bearer <token>"
   ```

### Krok 6: Przegląd kodu i dokumentacja

- Code review pod kątem zgodności z regułami projektu
- Sprawdzenie obsługi błędów
- Weryfikacja typów TypeScript
- Aktualizacja dokumentacji API (jeśli wymagana)