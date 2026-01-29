# API Endpoint Implementation Plan: PATCH /api/profile

## 1. Przegląd punktu końcowego

Endpoint służy do aktualizacji profilu bieżącego uwierzytelnionego użytkownika. W MVP jedynym modyfikowalnym polem jest `activeListId`, które wskazuje na aktualnie wybraną listę zadań użytkownika. Endpoint wymaga uwierzytelnienia i waliduje, czy wskazana lista należy do użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/profile`
- **Parametry URL:** brak
- **Nagłówki wymagane:**
  - Cookie z sesją Supabase Auth (automatycznie zarządzane przez middleware)
- **Request Body:**

```json
{
  "activeListId": "uuid | null"
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `activeListId` | `string \| null` | Tak | UUID aktywnej listy lub null do wyczyszczenia |

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// Command - dane wejściowe
interface UpdateProfileCommand {
  activeListId: string | null;
}

// DTO - dane wyjściowe
interface ProfileDTO {
  id: string;
  activeListId: string | null;
  onboardingCompletedAt: string | null;
  onboardingVersion: number;
  createdAt: string;
  updatedAt: string;
}

// Błąd
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "uuid",
  "activeListId": "uuid | null",
  "onboardingCompletedAt": "ISO8601 | null",
  "onboardingVersion": 1,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Błędy

| Kod | Scenariusz | Przykładowa odpowiedź |
|-----|------------|----------------------|
| 400 | Nieprawidłowy format UUID | `{ "error": "VALIDATION_ERROR", "message": "Invalid request body", "details": { "activeListId": "Invalid UUID format" } }` |
| 400 | Lista nie istnieje lub nie należy do użytkownika | `{ "error": "INVALID_LIST", "message": "List not found or doesn't belong to user" }` |
| 401 | Brak uwierzytelnienia | `{ "error": "UNAUTHORIZED", "message": "User not authenticated" }` |
| 500 | Błąd serwera | `{ "error": "INTERNAL_ERROR", "message": "Internal server error" }` |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Client    │────▶│  Middleware  │────▶│  PATCH Handler  │────▶│   Service    │
│             │     │  (Auth)      │     │  /api/profile   │     │              │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                                                │                        │
                                                ▼                        ▼
                                         ┌─────────────┐          ┌──────────────┐
                                         │  Zod Valid. │          │   Supabase   │
                                         └─────────────┘          │   (RLS)      │
                                                                  └──────────────┘
```

1. **Request** przychodzi do middleware Astro
2. **Middleware** weryfikuje sesję Supabase i ustawia `context.locals.supabase` oraz `context.locals.user`
3. **Handler** sprawdza obecność użytkownika (401 jeśli brak)
4. **Handler** parsuje body i waliduje przez Zod (400 jeśli błąd)
5. **Service** sprawdza istnienie listy (jeśli activeListId nie jest null)
6. **Service** wykonuje UPDATE na tabeli profiles
7. **Handler** zwraca zaktualizowany profil jako ProfileDTO

## 6. Względy bezpieczeństwa

### Uwierzytelnienie
- Wymagana aktywna sesja Supabase Auth
- Sesja weryfikowana w middleware przed dotarciem do handlera
- Użytkownik dostępny przez `context.locals.user`

### Autoryzacja
- RLS (Row Level Security) w Supabase zapewnia, że użytkownik może modyfikować tylko swój profil
- Policy: `using (id = auth.uid())` na tabeli `profiles`
- FK constraint `(active_list_id, id) → lists(id, user_id)` zapobiega ustawieniu listy innego użytkownika

### Walidacja danych
- Zod schema waliduje format UUID
- Dodatkowe sprawdzenie istnienia listy przed UPDATE (dla lepszego UX i komunikatów błędów)

### Ochrona przed atakami
- **IDOR:** Zabezpieczone przez RLS i FK constraint
- **SQL Injection:** Zabezpieczone przez Supabase SDK (parameterized queries)
- **Mass Assignment:** Tylko `activeListId` jest akceptowane w command

## 7. Obsługa błędów

### Tabela błędów

| Błąd | Kod HTTP | Error Code | Logowanie |
|------|----------|------------|-----------|
| Brak sesji | 401 | UNAUTHORIZED | Nie (normalne zachowanie) |
| Błąd walidacji Zod | 400 | VALIDATION_ERROR | Nie |
| Lista nie istnieje | 400 | INVALID_LIST | Nie |
| Lista nie należy do użytkownika | 400 | INVALID_LIST | Tak (potencjalna próba IDOR) |
| Błąd bazy danych | 500 | INTERNAL_ERROR | Tak |
| FK constraint violation | 400 | INVALID_LIST | Nie |

### Mapowanie błędów Supabase

```typescript
// Błąd FK constraint (23503) → 400 INVALID_LIST
if (error.code === '23503') {
  return { error: 'INVALID_LIST', message: 'List not found or doesn\'t belong to user' };
}
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje
- **Pojedynczy UPDATE:** Aktualizacja profilu w jednym zapytaniu SQL
- **Walidacja listy:** Można pominąć osobne SELECT jeśli polegamy na FK constraint (mniej zapytań)
- **RLS:** Wykorzystanie wbudowanych mechanizmów Supabase zamiast dodatkowych zapytań

### Potencjalne wąskie gardła
- Brak - endpoint operuje na pojedynczym wierszu z PK lookup

### Indeksy wykorzystywane
- `profiles.id` (PK) - lookup profilu użytkownika
- `lists(id, user_id)` (UNIQUE) - walidacja FK

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik:** `src/lib/schemas/profileSchemas.ts`

```typescript
import { z } from 'zod';

export const updateProfileSchema = z.object({
  activeListId: z.string().uuid().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

### Krok 2: Utworzenie serwisu profilu

**Plik:** `src/lib/services/profileService.ts`

```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type { ProfileDTO, UpdateProfileCommand } from '@/types';

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileDTO> {
    // 1. Jeśli activeListId nie jest null, sprawdź czy lista istnieje i należy do użytkownika
    if (command.activeListId !== null) {
      const { data: list, error: listError } = await this.supabase
        .from('lists')
        .select('id')
        .eq('id', command.activeListId)
        .eq('user_id', userId)
        .single();

      if (listError || !list) {
        throw new InvalidListError('List not found or doesn\'t belong to user');
      }
    }

    // 2. Aktualizuj profil
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ active_list_id: command.activeListId })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(error.message, error.code);
    }

    // 3. Mapuj na DTO
    return this.mapToDTO(data);
  }

  private mapToDTO(entity: ProfileEntity): ProfileDTO {
    return {
      id: entity.id,
      activeListId: entity.active_list_id,
      onboardingCompletedAt: entity.onboarding_completed_at,
      onboardingVersion: entity.onboarding_version,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }
}
```

### Krok 3: Utworzenie klas błędów

**Plik:** `src/lib/errors.ts` (lub rozszerzenie istniejącego)

```typescript
export class InvalidListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidListError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

### Krok 4: Implementacja endpointu API

**Plik:** `src/pages/api/profile.ts`

```typescript
import type { APIRoute } from 'astro';
import { updateProfileSchema } from '@/lib/schemas/profileSchemas';
import { ProfileService } from '@/lib/services/profileService';
import { InvalidListError, DatabaseError } from '@/lib/errors';
import type { ErrorResponseDTO } from '@/types';

export const prerender = false;

export const PATCH: APIRoute = async ({ locals, request }) => {
  // 1. Sprawdź uwierzytelnienie
  const user = locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      } satisfies ErrorResponseDTO),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Parsuj i waliduj body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Invalid JSON body',
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const parseResult = updateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    const details = parseResult.error.flatten().fieldErrors;
    return new Response(
      JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: Object.fromEntries(
          Object.entries(details).map(([key, value]) => [key, value?.join(', ') ?? ''])
        ),
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Wywołaj serwis
  try {
    const profileService = new ProfileService(locals.supabase);
    const profile = await profileService.updateProfile(user.id, parseResult.data);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof InvalidListError) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_LIST',
          message: error.message,
        } satisfies ErrorResponseDTO),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Profile update error:', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Krok 5: Testy jednostkowe i integracyjne

**Scenariusze testowe:**

1. **Happy path:** Aktualizacja z prawidłowym activeListId
2. **Happy path:** Ustawienie activeListId na null
3. **Error:** Brak sesji → 401
4. **Error:** Nieprawidłowy format UUID → 400 VALIDATION_ERROR
5. **Error:** Lista nie istnieje → 400 INVALID_LIST
6. **Error:** Lista należy do innego użytkownika → 400 INVALID_LIST
7. **Error:** Nieprawidłowy JSON body → 400 VALIDATION_ERROR

### Krok 6: Weryfikacja typów i linting

```bash
npm run lint:fix
npm run build
```

## 10. Checklist przed wdrożeniem

- [ ] Schemat Zod utworzony i eksportowany
- [ ] ProfileService zaimplementowany z obsługą błędów
- [ ] Endpoint PATCH /api/profile zaimplementowany
- [ ] Wszystkie scenariusze błędów obsłużone
- [ ] Typy zgodne z src/types.ts
- [ ] Brak błędów TypeScript
- [ ] Linting przechodzi bez błędów
- [ ] RLS policies działają poprawnie
- [ ] Testy pokrywają główne scenariusze