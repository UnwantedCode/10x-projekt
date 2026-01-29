# API Endpoint Implementation Plan: GET /api/tasks/:id

## 1. Przegląd punktu koncowego

Endpoint `GET /api/tasks/:id` umozliwia pobranie pojedynczego zadania na podstawie jego unikalnego identyfikatora UUID. Zadanie jest zwracane tylko wtedy, gdy nalezy do zalogowanego uzytkownika - weryfikacja wlasnosci odbywa sie automatycznie dzieki Row Level Security (RLS) w Supabase.

## 2. Szczegoly zadania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/tasks/[id]`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID zadania do pobrania
  - **Opcjonalne:** brak
- **Request Body:** brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejace typy z `src/types.ts`:

```typescript
// DTO odpowiedzi - linia 129-140
interface TaskDTO {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  priority: number;
  status: number;
  sortOrder: number;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Standardowy format bledu - linia 35-39
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowy schemat walidacji Zod (do utworzenia w serwisie):

```typescript
const taskIdParamSchema = z.object({
  id: z.string().uuid("Invalid task ID format"),
});
```

## 4. Szczegoly odpowiedzi

### Sukces (200 OK):
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "description": "string | null",
  "priority": 1,
  "status": 1,
  "sortOrder": 1,
  "doneAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Bledy:

| Kod | Opis | Przyklad odpowiedzi |
|-----|------|---------------------|
| 400 | Nieprawidlowy format UUID | `{"error": "Bad Request", "message": "Invalid task ID format"}` |
| 401 | Brak autoryzacji | `{"error": "Unauthorized", "message": "Authentication required"}` |
| 404 | Zadanie nie znalezione | `{"error": "Not Found", "message": "Task not found"}` |
| 500 | Blad serwera | `{"error": "Internal Server Error", "message": "An unexpected error occurred"}` |

## 5. Przeplyw danych

```
[Klient]
    |
    v
[GET /api/tasks/:id]
    |
    v
[Middleware] --> Ustawia context.locals.supabase
    |
    v
[API Handler]
    |
    +---> [1] Walidacja parametru id (Zod UUID)
    |         |
    |         +--> Blad walidacji? --> 400 Bad Request
    |
    +---> [2] Sprawdzenie sesji uzytkownika
    |         |
    |         +--> Brak sesji? --> 401 Unauthorized
    |
    +---> [3] Pobranie zadania z Supabase
    |         |
    |         +--> [Supabase RLS] Automatyczne filtrowanie po user_id
    |         |
    |         +--> Blad DB? --> 500 Internal Server Error
    |         |
    |         +--> Brak wyniku? --> 404 Not Found
    |
    +---> [4] Mapowanie TaskEntity --> TaskDTO
    |
    v
[Odpowiedz 200 OK z TaskDTO]
```

## 6. Wzgledy bezpieczenstwa

### 6.1 Autentykacja
- Weryfikacja sesji uzytkownika poprzez `supabase.auth.getUser()`
- Sprawdzenie obecnosci tokena JWT w naglowkach zadania

### 6.2 Autoryzacja
- **Row Level Security (RLS)** w Supabase automatycznie filtruje zadania
- Policy: `using (user_id = auth.uid())` zapewnia dostep tylko do wlasnych zadan
- Nie jest wymagane jawne sprawdzanie `user_id` w kodzie aplikacji

### 6.3 Walidacja danych
- Walidacja UUID za pomoca Zod przed zapytaniem do bazy
- Zapobiega SQL injection i nieprawidlowym zapytaniom

### 6.4 Ukrywanie informacji
- Blad 404 zwracany zarowno gdy zadanie nie istnieje, jak i gdy nie nalezy do uzytkownika
- Zapobiega enumeracji zadan innych uzytkownikow

## 7. Obsluga bledow

| Scenariusz | Kod HTTP | Typ bledu | Komunikat |
|------------|----------|-----------|-----------|
| Nieprawidlowy format UUID | 400 | Bad Request | "Invalid task ID format" |
| Brak naglowka Authorization | 401 | Unauthorized | "Authentication required" |
| Nieważny token JWT | 401 | Unauthorized | "Invalid or expired token" |
| Zadanie nie istnieje | 404 | Not Found | "Task not found" |
| Zadanie nalezy do innego uzytkownika | 404 | Not Found | "Task not found" |
| Blad polaczenia z baza | 500 | Internal Server Error | "An unexpected error occurred" |
| Nieoczekiwany wyjatek | 500 | Internal Server Error | "An unexpected error occurred" |

### Logowanie bledow
- Bledy 500 powinny byc logowane po stronie serwera z pelnym stack trace
- Bledy 4xx moga byc logowane na poziomie debug/info
- Nie logowac wrażliwych danych (tokeny, dane uzytkownika)

## 8. Rozważania dotyczace wydajnosci

### 8.1 Zapytanie do bazy
- Pojedyncze zapytanie `SELECT` po kluczu glownym (UUID) - O(1)
- Indeks PK na `tasks.id` zapewnia optymalna wydajnosc
- RLS nie wymaga dodatkowych joinow dzieki schematowi owner-only

### 8.2 Optymalizacje
- Wybieranie tylko potrzebnych kolumn (bez `search_text`)
- Brak potrzeby cache'owania dla pojedynczych rekordow w MVP

### 8.3 Rozmiar odpowiedzi
- Odpowiedz zawiera tylko jedno zadanie - minimalny transfer danych
- Brak paginacji wymaganej dla tego endpointu

## 9. Etapy wdrozenia

### Krok 1: Utworzenie struktury katalogow
Utworzyc katalogi jesli nie istnieja:
- `src/lib/services/` - dla logiki biznesowej
- `src/pages/api/tasks/` - dla endpointu API

### Krok 2: Implementacja serwisu TaskService
Utworzyc plik `src/lib/services/task.service.ts`:

```typescript
import { z } from "zod";
import type { SupabaseClient } from "../../db/supabase.client";
import type { TaskDTO } from "../../types";

// Schema walidacji UUID
export const taskIdSchema = z.string().uuid("Invalid task ID format");

// Typ wyniku serwisu
export type TaskServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: number; message: string } };

// Funkcja mapujaca encje na DTO
function mapTaskEntityToDTO(entity: Database["public"]["Tables"]["tasks"]["Row"]): TaskDTO {
  return {
    id: entity.id,
    listId: entity.list_id,
    title: entity.title,
    description: entity.description,
    priority: entity.priority,
    status: entity.status,
    sortOrder: entity.sort_order,
    doneAt: entity.done_at,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

// Glowna funkcja serwisu
export async function getTaskById(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskServiceResult<TaskDTO>> {
  // Implementacja w kroku 2
}
```

### Krok 3: Implementacja logiki getTaskById
Uzupelnic funkcje `getTaskById`:

1. Walidacja UUID za pomoca Zod
2. Zapytanie do Supabase z wyborem kolumn (bez `user_id` i `search_text`)
3. Obsluga bledu `.single()` gdy brak wynikow
4. Mapowanie encji na DTO
5. Zwrot wyniku lub bledu

### Krok 4: Utworzenie endpointu API
Utworzyc plik `src/pages/api/tasks/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { getTaskById, taskIdSchema } from "../../../lib/services/task.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Pobranie i walidacja parametru id
  // 2. Sprawdzenie autentykacji
  // 3. Wywolanie serwisu
  // 4. Zwrot odpowiedzi
};
```

### Krok 5: Implementacja handlera GET
W handlerze `GET`:

1. Walidacja `params.id` za pomoca `taskIdSchema.safeParse()`
2. Pobranie sesji: `locals.supabase.auth.getUser()`
3. Wywolanie `getTaskById(locals.supabase, params.id)`
4. Mapowanie wyniku na odpowiednia odpowiedz HTTP

### Krok 6: Dodanie typu SupabaseClient do kontekstu Astro
Zaktualizowac `src/env.d.ts` (jesli potrzeba) o deklaracje typu dla `locals.supabase`.

### Krok 7: Testy manualne
Przetestowac endpoint:

```bash
# Test bez autoryzacji
curl -i http://localhost:3000/api/tasks/123e4567-e89b-12d3-a456-426614174000

# Test z nieprawidlowym UUID
curl -i -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tasks/invalid-uuid

# Test z prawidlowym UUID
curl -i -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tasks/<valid-task-id>
```

### Krok 8: Dokumentacja
Zaktualizowac dokumentacje API o nowy endpoint (jesli istnieje).