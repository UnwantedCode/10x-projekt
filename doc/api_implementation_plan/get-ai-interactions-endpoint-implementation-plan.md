# API Endpoint Implementation Plan: GET /api/tasks/:taskId/ai-interactions

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania historii interakcji AI dla konkretnego zadania. Zwraca paginowaną listę wszystkich sugestii priorytetów wygenerowanych przez AI dla danego taska, wraz z decyzjami użytkownika (jeśli zostały podjęte).

**Cel biznesowy:** Umożliwienie użytkownikowi przeglądania historii sugestii AI dla zadania, co pozwala na analizę trafności rekomendacji i śledzenie podjętych decyzji.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/tasks/:taskId/ai-interactions`
- **Parametry:**
  - **Wymagane:**
    - `taskId` (path parameter) - UUID zadania
  - **Opcjonalne (query parameters):**
    - `limit` - maksymalna liczba zwracanych elementów (domyślnie: 10, max: 50)
    - `offset` - przesunięcie dla paginacji (domyślnie: 0)
- **Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTO odpowiedzi dla pojedynczej interakcji
interface AIInteractionDTO {
  id: string;
  taskId: string;
  model: string;
  suggestedPriority: number;
  justification: string | null;
  justificationTags: string[];
  decision: number | null;
  decidedAt: string | null;
  finalPriority: number | null;
  rejectedReason: string | null;
  createdAt: string;
}

// DTO odpowiedzi z paginacją
interface AIInteractionsResponseDTO {
  data: AIInteractionDTO[];
  pagination: PaginationDTO;
}

// Parametry zapytania
interface AIInteractionsQueryParams {
  limit?: number;
  offset?: number;
}

// Metadane paginacji
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}
```

### Nowe typy do utworzenia w serwisie:

```typescript
// Typ encji z bazy danych (wewnętrzny dla serwisu)
type AIInteractionEntity = Database["public"]["Tables"]["ai_interactions"]["Row"];
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "taskId": "uuid",
      "model": "gpt-4",
      "suggestedPriority": 2,
      "justification": "Task has upcoming deadline",
      "justificationTags": ["deadline", "urgency"],
      "decision": 1,
      "decidedAt": "2024-01-15T10:30:00Z",
      "finalPriority": null,
      "rejectedReason": null,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

### Błędy:

| Kod | Opis                         | Przykład odpowiedzi                                                               |
| --- | ---------------------------- | --------------------------------------------------------------------------------- |
| 400 | Nieprawidłowe dane wejściowe | `{ "error": "Bad Request", "message": "Invalid taskId format" }`                  |
| 401 | Brak autentykacji            | `{ "error": "Unauthorized", "message": "User not authenticated" }`                |
| 404 | Task nie znaleziony          | `{ "error": "Not Found", "message": "Task not found" }`                           |
| 500 | Błąd serwera                 | `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }` |

## 5. Przepływ danych

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Middleware │────▶│   API Endpoint   │────▶│    Service      │
│             │     │  (Auth)     │     │                  │     │                 │
└─────────────┘     └─────────────┘     └──────────────────┘     └────────┬────────┘
                                                                          │
                                                                          ▼
                                                                 ┌─────────────────┐
                                                                 │    Supabase     │
                                                                 │   (PostgreSQL)  │
                                                                 └─────────────────┘
```

### Kroki przepływu:

1. **Request** → Klient wysyła żądanie GET z taskId i opcjonalnymi parametrami paginacji
2. **Middleware** → Weryfikacja autentykacji użytkownika (Supabase Auth)
3. **Walidacja** → Endpoint waliduje parametry wejściowe (Zod)
4. **Weryfikacja taska** → Serwis sprawdza czy task istnieje i należy do użytkownika
5. **Pobranie danych** → Serwis pobiera interakcje AI z bazy z paginacją
6. **Mapowanie** → Encje z bazy są mapowane na DTO
7. **Response** → Zwrócenie odpowiedzi z danymi i metadanymi paginacji

## 6. Względy bezpieczeństwa

### Autentykacja:

- Endpoint wymaga autentykacji użytkownika
- Wykorzystanie `context.locals.supabase` do dostępu do sesji użytkownika
- Sprawdzenie `context.locals.user` przed przetwarzaniem żądania

### Autoryzacja:

- RLS (Row Level Security) na tabeli `ai_interactions` zapewnia dostęp tylko do własnych danych
- Policy: `using (user_id = auth.uid())`
- Dodatkowa weryfikacja istnienia taska przed pobraniem interakcji

### Walidacja danych:

- `taskId` musi być prawidłowym UUID (walidacja Zod)
- `limit` i `offset` muszą być liczbami całkowitymi w dozwolonym zakresie
- Parametry są sanityzowane przed użyciem w zapytaniu

### Ochrona przed atakami:

- Ograniczenie `limit` do max 50 zapobiega nadmiernemu obciążeniu
- Parametryzowane zapytania zapobiegają SQL injection (Supabase SDK)
- RLS zapobiega nieautoryzowanemu dostępowi do danych innych użytkowników

## 7. Obsługa błędów

### Scenariusze błędów:

| Scenariusz                        | Kod HTTP | Komunikat                      | Logowanie |
| --------------------------------- | -------- | ------------------------------ | --------- |
| Brak sesji użytkownika            | 401      | "User not authenticated"       | Info      |
| Nieprawidłowy format taskId       | 400      | "Invalid taskId format"        | Warn      |
| Nieprawidłowe parametry paginacji | 400      | "Invalid query parameters"     | Warn      |
| Task nie istnieje                 | 404      | "Task not found"               | Info      |
| Task należy do innego użytkownika | 404      | "Task not found"               | Warn      |
| Błąd bazy danych                  | 500      | "An unexpected error occurred" | Error     |

### Strategia obsługi błędów:

- Użycie early returns dla warunków błędów
- Konsekwentny format odpowiedzi błędów (`ErrorResponseDTO`)
- Logowanie błędów z odpowiednim poziomem severity
- Nie ujawnianie szczegółów wewnętrznych błędów użytkownikowi

## 8. Rozważania dotyczące wydajności

### Indeksy bazy danych:

- `ai_interactions_task_id_idx` na `task_id` - wspiera filtrowanie po tasku
- `ai_interactions_user_id_idx` na `user_id` - wspiera RLS

### Optymalizacje:

- Paginacja ogranicza ilość danych pobieranych w jednym żądaniu
- Limit max 50 rekordów zapobiega nadmiernemu transferowi danych
- Wykorzystanie COUNT z osobnego zapytania lub window function dla total

### Potencjalne wąskie gardła:

- Dla tasków z dużą liczbą interakcji AI - rozwiązane przez paginację
- Zapytanie COUNT może być kosztowne - można rozważyć cache'owanie lub estymację

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/aiInteractions.schema.ts`

```typescript
import { z } from "zod";

export const aiInteractionsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid("Invalid taskId format"),
});
```

### Krok 2: Utworzenie serwisu AI Interactions

**Plik:** `src/lib/services/aiInteractions.service.ts`

Funkcje do zaimplementowania:

- `getAIInteractionsForTask(supabase, taskId, userId, params)` - pobiera interakcje z paginacją
- `verifyTaskOwnership(supabase, taskId, userId)` - weryfikuje istnienie i własność taska
- `mapEntityToDTO(entity)` - mapuje encję bazy danych na DTO

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { AIInteractionDTO, AIInteractionsResponseDTO, AIInteractionsQueryParams } from "@/types";

export async function getAIInteractionsForTask(
  supabase: SupabaseClient,
  taskId: string,
  params: AIInteractionsQueryParams
): Promise<AIInteractionsResponseDTO> {
  // 1. Pobierz interakcje z paginacją
  // 2. Pobierz total count
  // 3. Mapuj encje na DTO
  // 4. Zwróć odpowiedź z paginacją
}

export async function verifyTaskExists(supabase: SupabaseClient, taskId: string): Promise<boolean> {
  // Sprawdź czy task istnieje (RLS automatycznie filtruje po user_id)
}

function mapEntityToDTO(entity: AIInteractionEntity): AIInteractionDTO {
  return {
    id: entity.id,
    taskId: entity.task_id,
    model: entity.model,
    suggestedPriority: entity.suggested_priority,
    justification: entity.justification,
    justificationTags: entity.justification_tags ?? [],
    decision: entity.decision,
    decidedAt: entity.decided_at,
    finalPriority: entity.final_priority,
    rejectedReason: entity.rejected_reason,
    createdAt: entity.created_at,
  };
}
```

### Krok 3: Utworzenie endpointu API

**Plik:** `src/pages/api/tasks/[taskId]/ai-interactions.ts`

```typescript
import type { APIRoute } from "astro";
import { aiInteractionsQuerySchema, taskIdParamSchema } from "@/lib/schemas/aiInteractions.schema";
import { getAIInteractionsForTask, verifyTaskExists } from "@/lib/services/aiInteractions.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  // 1. Sprawdź autentykację
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized", message: "User not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Waliduj taskId
  const pathValidation = taskIdParamSchema.safeParse(params);
  if (!pathValidation.success) {
    return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid taskId format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { taskId } = pathValidation.data;

  // 3. Waliduj query params
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams);
  const queryValidation = aiInteractionsQuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid query parameters",
        details: queryValidation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Sprawdź czy task istnieje
  const supabase = locals.supabase;
  const taskExists = await verifyTaskExists(supabase, taskId);
  if (!taskExists) {
    return new Response(JSON.stringify({ error: "Not Found", message: "Task not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Pobierz interakcje
  try {
    const result = await getAIInteractionsForTask(supabase, taskId, queryValidation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching AI interactions:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: "An unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 4: Testy manualne

Scenariusze do przetestowania:

1. ✅ Poprawne żądanie z istniejącym taskiem - zwraca 200 z danymi
2. ✅ Żądanie bez autentykacji - zwraca 401
3. ✅ Żądanie z nieistniejącym taskId - zwraca 404
4. ✅ Żądanie z nieprawidłowym formatem taskId - zwraca 400
5. ✅ Żądanie z nieprawidłowymi parametrami paginacji - zwraca 400
6. ✅ Żądanie z limit > 50 - zwraca 400
7. ✅ Żądanie dla taska innego użytkownika - zwraca 404 (RLS)
8. ✅ Paginacja działa poprawnie - różne wartości limit/offset

### Krok 5: Weryfikacja integracji

- Sprawdzenie poprawności mapowania pól z bazy danych na DTO
- Weryfikacja działania RLS dla różnych użytkowników
- Testowanie edge cases (pusty wynik, duża liczba rekordów)
- Weryfikacja poprawności metadanych paginacji (total, limit, offset)
