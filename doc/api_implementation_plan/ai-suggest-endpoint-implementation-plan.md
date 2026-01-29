# API Endpoint Implementation Plan: POST /api/ai/suggest

## 1. Przegląd punktu końcowego

Endpoint służy do uzyskiwania sugestii priorytetu zadania od modelu AI. Analizuje tytuł i opcjonalny opis zadania, a następnie zwraca sugerowany priorytet wraz z uzasadnieniem. Może być używany w dwóch scenariuszach:
1. **Z istniejącym zadaniem** (`taskId` podane) - interakcja jest zapisywana w bazie i powiązana z zadaniem
2. **Podczas tworzenia zadania** (`taskId` = null) - sugestia jest zwracana bez zapisu do bazy (interakcja zostanie zapisana gdy użytkownik utworzy zadanie)

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/ai/suggest`
- **Content-Type:** `application/json`

### Parametry (Request Body):

| Pole | Typ | Wymagane | Ograniczenia | Opis |
|------|-----|----------|--------------|------|
| `taskId` | `string \| null` | Nie | UUID format jeśli podane | ID istniejącego zadania |
| `title` | `string` | Tak | 1-200 znaków | Tytuł zadania do analizy |
| `description` | `string \| null` | Nie | Brak limitu | Opis zadania |

### Przykład żądania:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Przygotować prezentację na spotkanie zarządu",
  "description": "Prezentacja wyników Q4, termin do piątku"
}
```

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Command Model - dane wejściowe
interface AISuggestCommand {
  taskId: string | null;
  title: string;
  description?: string | null;
}

// DTO - odpowiedź
interface AISuggestionDTO {
  interactionId: string;          // UUID lub tymczasowe ID dla flow tworzenia
  suggestedPriority: 1 | 2 | 3;   // TaskPriority
  justification: string;          // Uzasadnienie AI
  justificationTags: string[];    // Tagi kategoryzujące uzasadnienie
  model: string;                  // Nazwa modelu AI
  createdAt: string;              // ISO8601
}

// Typy pomocnicze
type TaskPriority = 1 | 2 | 3;  // 1=low, 2=medium, 3=high
```

### Nowe typy do dodania w serwisie:

```typescript
// Wewnętrzny typ odpowiedzi z AI
interface AIServiceResponse {
  suggestedPriority: TaskPriority;
  justification: string;
  justificationTags: string[];
}

// Konfiguracja promptu AI
interface AIPromptConfig {
  title: string;
  description: string | null;
}
```

## 4. Szczegóły odpowiedzi

### Success Response (200 OK):
```json
{
  "interactionId": "550e8400-e29b-41d4-a716-446655440001",
  "suggestedPriority": 3,
  "justification": "Zadanie ma wyraźny deadline (piątek) oraz dotyczy prezentacji dla zarządu, co wskazuje na wysoki priorytet.",
  "justificationTags": ["deadline", "stakeholders"],
  "model": "openai/gpt-4o-mini",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### Kody statusu:

| Kod | Opis | Kiedy |
|-----|------|-------|
| 200 | OK | Sugestia wygenerowana pomyślnie |
| 400 | Bad Request | Nieprawidłowe dane wejściowe |
| 401 | Unauthorized | Brak lub nieprawidłowe uwierzytelnienie |
| 404 | Not Found | Task nie istnieje lub nie należy do użytkownika |
| 503 | Service Unavailable | Błąd serwisu AI |

### Error Response Format:
```json
{
  "error": "BAD_REQUEST",
  "message": "Title is required and must be between 1 and 200 characters",
  "details": {
    "title": "Field is required"
  }
}
```

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│  API Route   │────▶│  AIService  │────▶│  OpenRouter  │
│             │     │  /api/ai/    │     │             │     │     API      │
└─────────────┘     │   suggest    │     └─────────────┘     └──────────────┘
                    └──────────────┘            │
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   Supabase   │◀────│  Supabase   │
                    │    Tasks     │     │    AI       │
                    │   (verify)   │     │ Interactions│
                    └──────────────┘     └─────────────┘
```

### Szczegółowy przepływ:

1. **Walidacja żądania** (API Route)
   - Sprawdzenie uwierzytelnienia użytkownika
   - Walidacja schematu Zod (title, taskId, description)

2. **Weryfikacja zadania** (AIService) - jeśli taskId podane
   - Pobranie zadania z bazy przez Supabase
   - RLS automatycznie weryfikuje właściciela
   - 404 jeśli nie znaleziono

3. **Wywołanie AI** (AIService)
   - Konstrukcja promptu z title i description
   - Wywołanie OpenRouter API
   - Parsowanie odpowiedzi JSON

4. **Zapis interakcji** (AIService) - jeśli taskId podane
   - Utworzenie rekordu w `ai_interactions`
   - Powiązanie z user_id i task_id

5. **Zwrócenie odpowiedzi** (API Route)
   - Mapowanie na AISuggestionDTO
   - Dla taskId=null: interactionId = tymczasowe UUID (bez zapisu)

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnienie
- Weryfikacja sesji przez `context.locals.supabase`
- Pobranie user_id z `supabase.auth.getUser()`
- Zwrot 401 dla braku/nieprawidłowej sesji

### 6.2 Autoryzacja
- RLS na tabeli `tasks` zapewnia dostęp tylko do własnych zadań
- RLS na tabeli `ai_interactions` zapewnia dostęp tylko do własnych interakcji
- Composite FK `(task_id, user_id)` uniemożliwia przypisanie interakcji do cudzego zadania

### 6.3 Walidacja danych
- Zod schema z ścisłą walidacją typów
- Sanityzacja title/description przed wysłaniem do AI (usunięcie potencjalnych instrukcji prompt injection)
- Walidacja formatu UUID dla taskId

### 6.4 Ochrona przed nadużyciami
- Rozważyć rate limiting na poziomie middleware (future enhancement)
- Logowanie wszystkich wywołań AI dla audytu

### 6.5 Bezpieczeństwo API AI
- Klucz API OpenRouter w zmiennych środowiskowych (OPENROUTER_API_KEY)
- Nie eksponowanie szczegółów błędów AI do klienta
- Timeout dla wywołań AI (30s)

## 7. Obsługa błędów

### 7.1 Błędy walidacji (400)

| Scenariusz | Komunikat | Details |
|------------|-----------|---------|
| Brak title | "Title is required" | `{ title: "Required" }` |
| Title za długi | "Title must be at most 200 characters" | `{ title: "Too long" }` |
| Title pusty | "Title must be at least 1 character" | `{ title: "Too short" }` |
| Nieprawidłowy UUID | "Invalid taskId format" | `{ taskId: "Invalid UUID" }` |

### 7.2 Błędy autoryzacji (401)

| Scenariusz | Komunikat |
|------------|-----------|
| Brak sesji | "Authentication required" |
| Sesja wygasła | "Session expired" |

### 7.3 Błędy zasobu (404)

| Scenariusz | Komunikat |
|------------|-----------|
| Task nie istnieje | "Task not found" |
| Task należy do innego użytkownika | "Task not found" |

### 7.4 Błędy serwisu AI (503)

| Scenariusz | Komunikat | Logowanie |
|------------|-----------|-----------|
| Timeout API | "AI service temporarily unavailable" | Pełny błąd + request ID |
| Błąd parsowania odpowiedzi | "AI service error" | Surowa odpowiedź |
| Rate limit OpenRouter | "AI service temporarily unavailable" | Headers + timestamp |
| Nieoczekiwany błąd | "AI service error" | Stack trace |

### 7.5 Błędy wewnętrzne (500)

| Scenariusz | Komunikat | Logowanie |
|------------|-----------|-----------|
| Błąd zapisu do bazy | "Internal server error" | Błąd Supabase |
| Nieoczekiwany wyjątek | "Internal server error" | Stack trace |

## 8. Rozważania dotyczące wydajności

### 8.1 Potencjalne wąskie gardła
- **Wywołanie AI (dominujące)**: 1-5s latencji
- Weryfikacja zadania: <50ms (indeks na tasks.id)
- Zapis interakcji: <50ms

### 8.2 Strategie optymalizacji

1. **Równoległe operacje**
   - Weryfikacja zadania i przygotowanie promptu równolegle (gdy taskId podane)

2. **Timeout management**
   - 30s timeout dla AI z graceful degradation
   - AbortController dla anulowania żądań

3. **Caching (future enhancement)**
   - Rozważyć cache dla identycznych zapytań (hash title+description)
   - TTL: 1 godzina

4. **Model selection**
   - Użycie szybkiego modelu (gpt-4o-mini) dla MVP
   - Możliwość upgrade do lepszego modelu w przyszłości

### 8.3 Monitoring
- Logowanie czasu odpowiedzi AI
- Metryki success/error rate
- Alerty dla wysokiej latencji (>5s)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/ai.schema.ts`

```typescript
import { z } from "zod";

export const aiSuggestSchema = z.object({
  taskId: z.string().uuid().nullable(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().nullable().optional(),
});

export type AISuggestInput = z.infer<typeof aiSuggestSchema>;
```

### Krok 2: Utworzenie serwisu AI

**Plik:** `src/lib/services/ai.service.ts`

Implementacja:
1. Metoda `suggestPriority(command: AISuggestCommand, userId: string, supabase: SupabaseClient)`
2. Prywatna metoda `callOpenRouter(prompt: string): Promise<AIServiceResponse>`
3. Prywatna metoda `buildPrompt(title: string, description: string | null): string`
4. Prywatna metoda `verifyTaskOwnership(taskId: string, supabase: SupabaseClient): Promise<boolean>`
5. Prywatna metoda `saveInteraction(data: {...}, supabase: SupabaseClient): Promise<string>`
6. Metoda `mapToDTO(interaction: AIInteractionEntity | null, response: AIServiceResponse): AISuggestionDTO`

### Krok 3: Implementacja wywołania OpenRouter

**Konfiguracja:**
- Zmienna środowiskowa: `OPENROUTER_API_KEY`
- Model: `openai/gpt-4o-mini` (konfigurowalny)
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`

**Prompt template:**
```
Jesteś asystentem do zarządzania zadaniami. Przeanalizuj poniższe zadanie i zasugeruj priorytet (1=niski, 2=średni, 3=wysoki).

Tytuł: {title}
Opis: {description || "Brak opisu"}

Odpowiedz w formacie JSON:
{
  "priority": <1|2|3>,
  "justification": "<krótkie uzasadnienie po polsku, max 300 znaków>",
  "tags": ["<tag1>", "<tag2>"]
}

Dostępne tagi: deadline, impact, complexity, stakeholders, dependencies, risk
```

### Krok 4: Utworzenie endpointu API

**Plik:** `src/pages/api/ai/suggest.ts`

```typescript
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // 1. Sprawdzenie uwierzytelnienia
  // 2. Parsowanie i walidacja body (Zod)
  // 3. Wywołanie AIService.suggestPriority()
  // 4. Zwrócenie odpowiedzi lub obsługa błędów
};
```

### Krok 5: Implementacja obsługi błędów

1. Custom error classes:
   - `AIServiceError` (503)
   - `TaskNotFoundError` (404)
   - `ValidationError` (400)

2. Error handler w route:
   ```typescript
   try {
     // ... logic
   } catch (error) {
     if (error instanceof ValidationError) {
       return new Response(JSON.stringify({ error: "BAD_REQUEST", ... }), { status: 400 });
     }
     // ... inne przypadki
   }
   ```

### Krok 6: Dodanie zmiennych środowiskowych

**Plik:** `.env.example` (aktualizacja)

```
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

**Plik:** `src/env.d.ts` (aktualizacja typów)

```typescript
interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL?: string;
}
```

### Krok 7: Testy manualne

1. **Test happy path z taskId:**
   ```bash
   curl -X POST http://localhost:3000/api/ai/suggest \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=..." \
     -d '{"taskId": "...", "title": "Test task", "description": "Test"}'
   ```

2. **Test bez taskId (flow tworzenia):**
   ```bash
   curl -X POST http://localhost:3000/api/ai/suggest \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=..." \
     -d '{"taskId": null, "title": "New task"}'
   ```

3. **Testy błędów:**
   - Brak title
   - Nieprawidłowy UUID
   - Nieistniejący task
   - Brak autoryzacji

### Krok 8: Dokumentacja

1. Aktualizacja API docs z przykładami
2. Dodanie informacji o wymaganych zmiennych środowiskowych
3. Opis flow integracji z frontendem

## 10. Uwagi implementacyjne

### 10.1 Obsługa taskId = null

Gdy `taskId` jest null (flow tworzenia zadania):
- Nie zapisujemy interakcji do bazy (brak task_id w ai_interactions jest NOT NULL)
- Generujemy tymczasowe UUID dla `interactionId` w odpowiedzi
- Frontend może później utworzyć zadanie i osobno zapisać decyzję

**Alternatywa (wymaga zmiany schematu DB):**
Jeśli chcemy zapisywać interakcje bez task_id, należy:
1. Zmienić `task_id` na nullable w migracji
2. Zaktualizować FK constraint
3. Dodać logikę łączenia interakcji z zadaniem po jego utworzeniu

### 10.2 Parsowanie odpowiedzi AI

Odpowiedź AI może nie być zawsze poprawnym JSON. Implementacja powinna:
1. Próbować parsować jako JSON
2. Przy błędzie - wyciągnąć JSON z tekstu (regex)
3. Walidować strukturę odpowiedzi
4. Fallback do domyślnych wartości z logowaniem błędu

### 10.3 Prompt injection protection

Sanityzacja inputu przed włączeniem do promptu:
```typescript
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/```/g, '')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .substring(0, 500); // limit dla description
}
```

### 10.4 Haszowanie promptu

Zgodnie z db-plan.md, `prompt_hash` (sha256) może być zapisywany:
```typescript
import { createHash } from 'crypto';

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}
```