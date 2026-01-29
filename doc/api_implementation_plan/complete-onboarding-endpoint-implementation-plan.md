# API Endpoint Implementation Plan: POST /api/profile/onboarding/complete

## 1. Przegląd punktu końcowego

Endpoint `POST /api/profile/onboarding/complete` oznacza onboarding jako ukończony dla aktualnie zalogowanego użytkownika. Aktualizuje pola `onboarding_completed_at` (ustawia bieżący timestamp) oraz `onboarding_version` (ustawia podaną wersję) w tabeli `public.profiles`.

Jest to endpoint wymagający uwierzytelnienia, który przyjmuje numer wersji onboardingu i zwraca zaktualizowany profil użytkownika w formacie DTO.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/profile/onboarding/complete`
- **Parametry:**
  - Wymagane: Brak (parametry URL)
  - Opcjonalne: Brak
- **Request Body:**
  ```json
  {
    "version": 1
  }
  ```
- **Nagłówki:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` lub cookie sesji Supabase

### Walidacja Request Body:

| Pole | Typ | Wymagane | Walidacja |
|------|-----|----------|-----------|
| `version` | number | Tak | Musi być liczbą całkowitą > 0 i <= 32767 (smallint) |

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Command model dla żądania
interface CompleteOnboardingCommand {
  version: number;
}

// DTO odpowiedzi
interface ProfileDTO {
  id: string;                              // UUID użytkownika
  activeListId: string | null;             // UUID aktywnej listy lub null
  onboardingCompletedAt: string | null;    // ISO8601 timestamp (zostanie ustawiony)
  onboardingVersion: number;               // Wersja onboardingu (z requestu)
  createdAt: string;                       // ISO8601 timestamp
  updatedAt: string;                       // ISO8601 timestamp
}

// Standardowa odpowiedź błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Zod Schema do walidacji (do utworzenia):

```typescript
import { z } from "zod";

const completeOnboardingSchema = z.object({
  version: z
    .number({ required_error: "Version is required", invalid_type_error: "Version must be a number" })
    .int("Version must be an integer")
    .positive("Version must be greater than 0")
    .max(32767, "Version must be at most 32767"),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "activeListId": "660e8400-e29b-41d4-a716-446655440001",
  "onboardingCompletedAt": "2024-01-15T10:30:00.000Z",
  "onboardingVersion": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Błędy

| Kod | Typ błędu | Opis |
|-----|-----------|------|
| 400 | Bad Request | Nieprawidłowe dane wejściowe (version <= 0, brak pola, zły typ) |
| 401 | Unauthorized | Użytkownik nie jest zalogowany |
| 404 | Not Found | Profil nie istnieje (edge case) |
| 500 | Internal Server Error | Błąd serwera/bazy danych |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Klient    │────▶│      API Endpoint        │────▶│ Profile Service  │────▶│   Supabase   │
│             │     │ /api/profile/onboarding  │     │                  │     │   Database   │
└─────────────┘     │      /complete           │     └──────────────────┘     └──────────────┘
      │             └──────────────────────────┘              │                       │
      │ 1. POST z { version: 1 }                              │                       │
      │────────────────────────▶│                             │                       │
      │                         │ 2. Walidacja Zod            │                       │
      │                         │    (version > 0)            │                       │
      │                         │─────────────────────────────│                       │
      │                         │ 3. Pobierz sesję            │                       │
      │                         │    (context.locals)         │                       │
      │                         │────────────────────────────▶│                       │
      │                         │                             │ 4. UPDATE profiles    │
      │                         │                             │    SET onboarding_*   │
      │                         │                             │    WHERE id = uid     │
      │                         │                             │    RETURNING *        │
      │                         │                             │──────────────────────▶│
      │                         │                             │◀──────────────────────│
      │                         │                             │ 5. ProfileEntity      │
      │                         │◀────────────────────────────│                       │
      │                         │ 6. Map to ProfileDTO        │                       │
      │◀────────────────────────│                             │                       │
      │ 7. Response (JSON)      │                             │                       │
```

### Szczegółowy przepływ:

1. Klient wysyła żądanie POST z `{ "version": 1 }` na `/api/profile/onboarding/complete`
2. Endpoint parsuje JSON body
3. Walidacja Zod: sprawdza czy `version` jest liczbą całkowitą > 0 i <= 32767
4. Jeśli walidacja nie przejdzie → zwróć 400 z opisem błędu
5. Sprawdź sesję użytkownika przez `context.locals.supabase.auth.getUser()`
6. Jeśli brak sesji → zwróć 401
7. Profile Service wykonuje UPDATE z RLS (Row Level Security)
8. RLS automatycznie filtruje do `id = auth.uid()`
9. Jeśli profil nie istnieje (brak zaktualizowanych wierszy) → zwróć 404
10. Mapowanie ProfileEntity → ProfileDTO (snake_case → camelCase)
11. Zwróć odpowiedź 200 z ProfileDTO

## 6. Względy bezpieczeństwa

### Uwierzytelnianie
- Wymagana aktywna sesja Supabase Auth
- Token weryfikowany przez Supabase SDK
- Sesja dostępna przez `context.locals.supabase.auth.getUser()`

### Autoryzacja
- RLS (Row Level Security) na tabeli `profiles` zapewnia dostęp tylko do własnego profilu
- Policy dla UPDATE: `using (id = auth.uid())`
- Brak możliwości modyfikacji profilu innego użytkownika

### Walidacja danych wejściowych
- Zod schema waliduje strukturę i typy danych
- `version` musi być liczbą całkowitą > 0 (zgodnie z CHECK constraint w bazie)
- `version` musi być <= 32767 (zakres smallint)
- Odrzucenie dodatkowych pól z request body (`.strict()` lub ignorowanie)

### Ochrona przed atakami
- Walidacja zapobiega SQL injection (parametryzowane zapytania Supabase)
- Limit rozmiaru `version` zapobiega integer overflow
- RLS zapobiega IDOR (Insecure Direct Object Reference)

### Ochrona danych
- Nie ujawniać szczegółów wewnętrznych błędów w odpowiedzi
- Nie logować wrażliwych danych użytkownika
- Używać HTTPS (konfiguracja serwera)

## 7. Obsługa błędów

### Scenariusze błędów i odpowiedzi:

| Scenariusz | Kod | Response Body |
|------------|-----|---------------|
| Brak body lub nieprawidłowy JSON | 400 | `{ "error": "Bad Request", "message": "Invalid JSON body" }` |
| Brak pola `version` | 400 | `{ "error": "Bad Request", "message": "Validation failed", "details": { "version": "Version is required" } }` |
| `version` nie jest liczbą | 400 | `{ "error": "Bad Request", "message": "Validation failed", "details": { "version": "Version must be a number" } }` |
| `version` <= 0 | 400 | `{ "error": "Bad Request", "message": "Validation failed", "details": { "version": "Version must be greater than 0" } }` |
| `version` > 32767 | 400 | `{ "error": "Bad Request", "message": "Validation failed", "details": { "version": "Version must be at most 32767" } }` |
| `version` nie jest integer | 400 | `{ "error": "Bad Request", "message": "Validation failed", "details": { "version": "Version must be an integer" } }` |
| Brak nagłówka Authorization | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Nieprawidłowy/wygasły token | 401 | `{ "error": "Unauthorized", "message": "Invalid or expired session" }` |
| Profil nie istnieje | 404 | `{ "error": "Not Found", "message": "Profile not found" }` |
| Błąd połączenia z bazą | 500 | `{ "error": "Internal Server Error", "message": "Unable to update profile" }` |
| Nieoczekiwany błąd | 500 | `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }` |

### Logowanie błędów:
- Błędy 500: logować pełny stack trace do konsoli serwera
- Błędy 400: logować na poziomie debug (opcjonalnie)
- Błędy 401: logować na poziomie info (bez wrażliwych danych)

## 8. Rozważania dotyczące wydajności

### Optymalizacje:
- **Pojedyncze zapytanie**: UPDATE z RETURNING eliminuje potrzebę dodatkowego SELECT
- **RLS**: Minimalne narzuty dzięki prostej policy `id = auth.uid()`
- **Brak JOIN-ów**: Endpoint modyfikuje tylko tabelę profiles
- **Trigger**: `updated_at` aktualizowany automatycznie przez trigger `trg_profiles_updated_at`

### Potencjalne wąskie gardła:
- Weryfikacja sesji przez Supabase Auth (minimalne opóźnienie)
- Połączenie z bazą danych (connection pooling w Supabase)

### Rekomendacje:
- Brak potrzeby cache'owania (operacja mutująca)
- Endpoint nie wymaga dodatkowych optymalizacji dla MVP

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie Profile Service

Dodać do pliku `src/lib/services/profile.service.ts` funkcję `completeOnboarding`:

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { ProfileDTO } from "../types";
import type { Database } from "../db/database.types";

// Typ wyniku operacji (rozszerzyć istniejący lub dodać nowy)
type CompleteOnboardingResult =
  | { success: true; data: ProfileDTO }
  | { success: false; error: "not_found" | "database_error"; message: string };

// Mapper Entity → DTO (jeśli nie istnieje, dodać)
function mapProfileEntityToDTO(
  entity: Database["public"]["Tables"]["profiles"]["Row"]
): ProfileDTO {
  return {
    id: entity.id,
    activeListId: entity.active_list_id,
    onboardingCompletedAt: entity.onboarding_completed_at,
    onboardingVersion: entity.onboarding_version,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

// Funkcja oznaczania onboardingu jako ukończonego
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  version: number
): Promise<CompleteOnboardingResult> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: version,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "not_found", message: "Profile not found" };
    }
    console.error("Database error completing onboarding:", error);
    return { success: false, error: "database_error", message: "Unable to update profile" };
  }

  return { success: true, data: mapProfileEntityToDTO(data) };
}
```

### Krok 2: Utworzenie Zod Schema

Utworzyć plik `src/lib/schemas/profile.schema.ts` (lub dodać do istniejącego):

```typescript
import { z } from "zod";

export const completeOnboardingSchema = z.object({
  version: z
    .number({
      required_error: "Version is required",
      invalid_type_error: "Version must be a number",
    })
    .int("Version must be an integer")
    .positive("Version must be greater than 0")
    .max(32767, "Version must be at most 32767"),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
```

### Krok 3: Utworzenie API Endpoint

Utworzyć plik `src/pages/api/profile/onboarding/complete.ts`:

```typescript
import type { APIRoute } from "astro";
import { completeOnboarding } from "../../../../lib/services/profile.service";
import { completeOnboardingSchema } from "../../../../lib/schemas/profile.schema";
import type { ProfileDTO, ErrorResponseDTO } from "../../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Parsowanie JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Walidacja danych wejściowych
  const validationResult = completeOnboardingSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Validation failed",
      details,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { version } = validationResult.data;

  // 3. Sprawdź sesję użytkownika
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ErrorResponseDTO = {
      error: "Unauthorized",
      message: "Authentication required",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Wykonaj operację przez service
  const result = await completeOnboarding(locals.supabase, user.id, version);

  // 5. Obsłuż wynik
  if (!result.success) {
    const status = result.error === "not_found" ? 404 : 500;
    const errorResponse: ErrorResponseDTO = {
      error: result.error === "not_found" ? "Not Found" : "Internal Server Error",
      message: result.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 6. Zwróć zaktualizowany profil
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Krok 4: Eksport typu SupabaseClient

Upewnić się, że `src/db/supabase.client.ts` eksportuje typ klienta:

```typescript
import { createClient, type SupabaseClient as BaseSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Eksport typu dla użycia w services
export type SupabaseClient = BaseSupabaseClient<Database>;
```

### Krok 5: Struktura katalogów

Upewnić się, że istnieją następujące katalogi:
- `src/lib/services/` - dla service layer
- `src/lib/schemas/` - dla Zod schemas
- `src/pages/api/profile/onboarding/` - dla endpointu

### Krok 6: Testowanie

1. **Test walidacji:**
   - POST bez body → oczekuj 400 "Invalid JSON body"
   - POST z `{}` → oczekuj 400 "Version is required"
   - POST z `{ "version": "abc" }` → oczekuj 400 "Version must be a number"
   - POST z `{ "version": 0 }` → oczekuj 400 "Version must be greater than 0"
   - POST z `{ "version": -1 }` → oczekuj 400 "Version must be greater than 0"
   - POST z `{ "version": 1.5 }` → oczekuj 400 "Version must be an integer"
   - POST z `{ "version": 99999 }` → oczekuj 400 "Version must be at most 32767"

2. **Test uwierzytelnienia:**
   - POST bez tokena → oczekuj 401
   - POST z nieprawidłowym tokenem → oczekuj 401

3. **Test sukcesu:**
   - Zaloguj się jako użytkownik z profilem gdzie `onboarding_completed_at = null`
   - POST z `{ "version": 1 }` → oczekuj 200 z ProfileDTO
   - Sprawdź że `onboardingCompletedAt` nie jest null
   - Sprawdź że `onboardingVersion` = 1
   - Sprawdź że `updatedAt` został zaktualizowany

4. **Test idempotentności:**
   - Wywołaj endpoint ponownie dla tego samego użytkownika
   - Sprawdź że `onboardingCompletedAt` został zaktualizowany
   - Sprawdź że `onboardingVersion` można zmienić na wyższą wersję

5. **Test błędu bazy:**
   - Mockuj błąd Supabase w teście jednostkowym
   - Oczekuj 500 bez ujawniania szczegółów

### Krok 7: Dokumentacja

1. Zaktualizować dokumentację API (jeśli istnieje)
2. Dodać komentarze JSDoc do funkcji service
3. Opisać endpoint w README projektu (opcjonalnie)