# API Endpoint Implementation Plan: GET /api/profile

## 1. Przegląd punktu końcowego

Endpoint `GET /api/profile` służy do pobierania profilu aktualnie zalogowanego użytkownika. Jest to podstawowy endpoint wymagający uwierzytelnienia, który zwraca dane profilu z tabeli `public.profiles` w formacie DTO z nazwami pól w camelCase.

Profil użytkownika jest tworzony automatycznie podczas rejestracji (przez trigger w Supabase), więc dla zalogowanego użytkownika profil powinien zawsze istnieć.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/profile`
- **Parametry:**
  - Wymagane: Brak
  - Opcjonalne: Brak
- **Request Body:** Brak (metoda GET)
- **Nagłówki:**
  - `Authorization: Bearer <token>` lub cookie sesji Supabase

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTO odpowiedzi
interface ProfileDTO {
  id: string; // UUID użytkownika
  activeListId: string | null; // UUID aktywnej listy lub null
  onboardingCompletedAt: string | null; // ISO8601 timestamp lub null
  onboardingVersion: number; // Wersja onboardingu (domyślnie 1)
  createdAt: string; // ISO8601 timestamp
  updatedAt: string; // ISO8601 timestamp
}

// Standardowa odpowiedź błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Entity z bazy danych (snake_case):

```typescript
// Automatycznie generowany typ z Supabase
type ProfileEntity = Database["public"]["Tables"]["profiles"]["Row"];
// Pola: id, active_list_id, onboarding_completed_at, onboarding_version, created_at, updated_at
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

| Kod | Typ błędu             | Opis                            |
| --- | --------------------- | ------------------------------- |
| 401 | Unauthorized          | Użytkownik nie jest zalogowany  |
| 404 | Not Found             | Profil nie istnieje (edge case) |
| 500 | Internal Server Error | Błąd serwera/bazy danych        |

## 5. Przepływ danych

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Klient    │────▶│  API Endpoint   │────▶│ Profile Service  │────▶│   Supabase   │
│             │     │  /api/profile   │     │                  │     │   Database   │
└─────────────┘     └─────────────────┘     └──────────────────┘     └──────────────┘
      │                     │                       │                       │
      │ 1. GET /api/profile │                       │                       │
      │────────────────────▶│                       │                       │
      │                     │ 2. Pobierz sesję      │                       │
      │                     │    (context.locals)   │                       │
      │                     │──────────────────────▶│                       │
      │                     │                       │ 3. SELECT * FROM      │
      │                     │                       │    profiles           │
      │                     │                       │    WHERE id = uid     │
      │                     │                       │──────────────────────▶│
      │                     │                       │◀──────────────────────│
      │                     │                       │ 4. ProfileEntity      │
      │                     │◀──────────────────────│                       │
      │                     │ 5. Map to ProfileDTO  │                       │
      │◀────────────────────│                       │                       │
      │ 6. Response (JSON)  │                       │                       │
```

### Szczegółowy przepływ:

1. Klient wysyła żądanie GET na `/api/profile`
2. Middleware/endpoint sprawdza sesję użytkownika przez `context.locals.supabase`
3. Jeśli brak sesji → zwróć 401
4. Profile Service wykonuje zapytanie do bazy z RLS (Row Level Security)
5. RLS automatycznie filtruje do `id = auth.uid()`
6. Jeśli profil nie istnieje → zwróć 404
7. Mapowanie ProfileEntity → ProfileDTO (snake_case → camelCase)
8. Zwróć odpowiedź 200 z ProfileDTO

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymagana aktywna sesja Supabase Auth
- Token weryfikowany przez Supabase SDK
- Sesja dostępna przez `context.locals.supabase.auth.getUser()`

### Autoryzacja

- RLS (Row Level Security) na tabeli `profiles` zapewnia dostęp tylko do własnego profilu
- Policy: `using (id = auth.uid())`
- Brak możliwości dostępu do profilu innego użytkownika

### Walidacja

- Brak danych wejściowych do walidacji
- UUID użytkownika pochodzi z zaufanego źródła (sesja Supabase)

### Ochrona danych

- Nie ujawniać szczegółów wewnętrznych błędów w odpowiedzi
- Nie logować wrażliwych danych użytkownika
- Używać HTTPS (konfiguracja serwera)

## 7. Obsługa błędów

### Scenariusze błędów i odpowiedzi:

| Scenariusz                  | Kod | Response Body                                                                     |
| --------------------------- | --- | --------------------------------------------------------------------------------- |
| Brak nagłówka Authorization | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }`               |
| Nieprawidłowy/wygasły token | 401 | `{ "error": "Unauthorized", "message": "Invalid or expired session" }`            |
| Profil nie istnieje         | 404 | `{ "error": "Not Found", "message": "Profile not found" }`                        |
| Błąd połączenia z bazą      | 500 | `{ "error": "Internal Server Error", "message": "Unable to fetch profile" }`      |
| Nieoczekiwany błąd          | 500 | `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }` |

### Logowanie błędów:

- Błędy 500: logować pełny stack trace do konsoli serwera
- Błędy 401/404: logować na poziomie info/warn (bez wrażliwych danych)

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- **Proste zapytanie**: SELECT pojedynczego rekordu po PRIMARY KEY - bardzo szybkie
- **RLS**: Minimalne narzuty dzięki prostej policy `id = auth.uid()`
- **Brak JOIN-ów**: Endpoint zwraca tylko dane z tabeli profiles

### Potencjalne wąskie gardła:

- Weryfikacja sesji przez Supabase Auth (minimalne opóźnienie)
- Połączenie z bazą danych (connection pooling w Supabase)

### Rekomendacje:

- Brak potrzeby cache'owania (dane zawsze aktualne)
- Rozważyć cache sesji w middleware dla wielu requestów

## 9. Etapy wdrożenia

### Krok 1: Utworzenie Profile Service

Utworzyć plik `src/lib/services/profile.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDTO } from "@/types";

// Typ wyniku operacji
type ProfileResult =
  | { success: true; data: ProfileDTO }
  | { success: false; error: "not_found" | "database_error"; message: string };

// Mapper Entity → DTO
function mapProfileEntityToDTO(entity: Database["public"]["Tables"]["profiles"]["Row"]): ProfileDTO {
  return {
    id: entity.id,
    activeListId: entity.active_list_id,
    onboardingCompletedAt: entity.onboarding_completed_at,
    onboardingVersion: entity.onboarding_version,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

// Główna funkcja service
export async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "not_found", message: "Profile not found" };
    }
    console.error("Database error fetching profile:", error);
    return { success: false, error: "database_error", message: "Unable to fetch profile" };
  }

  return { success: true, data: mapProfileEntityToDTO(data) };
}
```

### Krok 2: Utworzenie API Endpoint

Utworzyć plik `src/pages/api/profile.ts`:

```typescript
import type { APIRoute } from "astro";
import { getProfile } from "@/lib/services/profile.service";
import type { ProfileDTO, ErrorResponseDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // 1. Sprawdź sesję użytkownika
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

  // 2. Pobierz profil przez service
  const result = await getProfile(locals.supabase, user.id);

  // 3. Obsłuż wynik
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

  // 4. Zwróć profil
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Krok 3: Weryfikacja typów i importów

1. Sprawdzić czy `SupabaseClient` jest eksportowany z `src/db/supabase.client.ts`
2. Upewnić się że typy Database są dostępne w `src/db/database.types.ts`
3. Zweryfikować aliasy ścieżek (`@/`) w `tsconfig.json`

### Krok 4: Testowanie

1. **Test uwierzytelnienia:**
   - Wywołaj endpoint bez tokena → oczekuj 401
   - Wywołaj z nieprawidłowym tokenem → oczekuj 401

2. **Test sukcesu:**
   - Zaloguj się jako użytkownik z profilem
   - Wywołaj GET /api/profile → oczekuj 200 z danymi ProfileDTO
   - Sprawdź format pól (camelCase)
   - Sprawdź typy danych (UUID, ISO8601, number)

3. **Test edge case (404):**
   - Symuluj brak profilu (trudne z triggerem) lub mockuj service
   - Oczekuj 404 z odpowiednim komunikatem

4. **Test błędu bazy:**
   - Mockuj błąd Supabase
   - Oczekuj 500 bez ujawniania szczegółów

### Krok 5: Dokumentacja

1. Zaktualizować dokumentację API (jeśli istnieje)
2. Dodać komentarze JSDoc do funkcji service
3. Opisać endpoint w README projektu (opcjonalnie)
