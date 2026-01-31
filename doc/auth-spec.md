# Specyfikacja architektury modułu autentykacji

## 1. Wprowadzenie

### 1.1. Cel dokumentu

Niniejszy dokument definiuje szczegółową architekturę modułu autentykacji dla aplikacji AI Task Manager. Specyfikacja obejmuje rejestrację użytkowników, logowanie, wylogowanie oraz odzyskiwanie hasła, zgodnie z wymaganiami US-001, US-002, US-003 i US-004 z dokumentu PRD.

### 1.2. Zakres funkcjonalności

#### 1.2.1. Funkcjonalności wymagane przez PRD

| Funkcjonalność | User Story | Status obecny |
|----------------|------------|---------------|
| Rejestracja konta | US-001 | Zaimplementowane |
| Logowanie | US-002 | Zaimplementowane |
| Bezpieczny dostęp i autoryzacja | US-003 | Częściowo zaimplementowane |
| Wylogowanie | US-004 | Zaimplementowane |

#### 1.2.2. Funkcjonalności dodatkowe (poza zakresem PRD MVP)

> **Uwaga:** Poniższe funkcjonalności nie są wymagane przez PRD, ale zostały zaimplementowane jako standardowa praktyka UX oraz ze względu na zgodność z RODO (punkt 1.5 PRD). Decyzja o ich włączeniu do MVP powinna być podjęta przez Product Ownera.

| Funkcjonalność | Uzasadnienie | Status obecny |
|----------------|--------------|---------------|
| Odzyskiwanie hasła (forgot-password) | Standardowa praktyka UX, bezpieczeństwo | Zaimplementowane |
| Akceptacja regulaminu przy rejestracji | Zgodność z RODO (PRD 1.5) | Zaimplementowane |

### 1.3. Stack technologiczny

- **Framework**: Astro 5 z SSR (Server-Side Rendering)
- **Interaktywność**: React 19 dla formularzy client-side
- **Autentykacja**: Supabase Auth
- **Typowanie**: TypeScript 5
- **Styling**: Tailwind 4 + Shadcn/ui
- **Adapter**: Node.js (standalone mode)

---

## 2. Architektura interfejsu użytkownika

### 2.1. Struktura stron i layoutów

#### 2.1.1. Strony publiczne (tryb auth)

Strony dostępne dla niezalogowanych użytkowników, renderowane w `AuthLayout`:

| Ścieżka | Strona Astro | Komponent React | Stan | Wymagane przez PRD |
|---------|--------------|-----------------|------|-------------------|
| `/login` | `login.astro` | `LoginForm` | Istnieje | ✅ US-002 |
| `/register` | `register.astro` | `RegisterForm` | Istnieje | ✅ US-001 |
| `/forgot-password` | `forgot-password.astro` | `ForgotPasswordForm` | Istnieje | ❌ Dodatkowe |

#### 2.1.2. Strony chronione (tryb non-auth)

Strony wymagające autoryzacji, renderowane z weryfikacją sesji:

| Ścieżka | Strona Astro | Komponent React | Stan |
|---------|--------------|-----------------|------|
| `/app` | `app.astro` | `Dashboard` | Istnieje |

#### 2.1.3. Strona główna

| Ścieżka | Strona Astro | Komponent | Stan |
|---------|--------------|-----------|------|
| `/` | `index.astro` | `Welcome` | Istnieje (publiczna) |

### 2.2. Layouty

#### 2.2.1. AuthLayout (`src/layouts/AuthLayout.astro`)

Layout dla stron autentykacji z wycentrowanym formularzem.

**Struktura:**
```
┌─────────────────────────────────────────────┐
│              min-h-screen                   │
│         flex items-center justify-center    │
│  ┌───────────────────────────────────────┐  │
│  │          max-w-md px-4 py-8           │  │
│  │        <slot /> (formularz)           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Odpowiedzialności:**
- Minimalny layout z tłem `bg-background`
- Centrowanie zawartości
- Przekazywanie tytułu strony

#### 2.2.2. DashboardLayout (`src/layouts/DashboardLayout.astro`)

Layout dla stron chronionych z nawigacją i sidebarem.

**Struktura:**
```
┌─────────────────────────────────────────────┐
│                  HEADER                     │
├────────────┬────────────────────────────────┤
│   SIDEBAR  │         MAIN CONTENT           │
│   (250px)  │                                │
└────────────┴────────────────────────────────┘
```

**Odpowiedzialności:**
- Skip link dla dostępności
- Sloty: `header`, `sidebar`, `content`
- Landmarks semantyczne (`<header>`, `<aside>`, `<main>`)

### 2.3. Komponenty React (client-side)

#### 2.3.1. Komponenty formularzy autentykacji

**Lokalizacja:** `src/components/auth/`

| Komponent | Hook | Stan | Wymagane przez PRD |
|-----------|------|------|-------------------|
| `LoginForm.tsx` | `useLoginForm.ts` | Istnieje | ✅ US-002 |
| `RegisterForm.tsx` | `useRegisterForm.ts` | Istnieje | ✅ US-001 |
| `ForgotPasswordForm.tsx` | `useForgotPasswordForm.ts` | Istnieje | ❌ Dodatkowe |
| `PasswordStrengthIndicator.tsx` | `usePasswordStrength.ts` | Istnieje | ❌ Dodatkowe (UX) |

#### 2.3.2. Rozdzielenie odpowiedzialności

**Strony Astro (server-side):**
- Weryfikacja sesji przy renderowaniu (`getSession()`)
- Przekierowanie zalogowanych użytkowników z `/login`, `/register`, `/forgot-password` do `/app`
- Przekierowanie niezalogowanych użytkowników z `/app` do `/login`
- Obsługa query parameters (np. `registered=true`, `redirectTo`)
- Renderowanie layoutów i przekazywanie props do komponentów React

**Komponenty React (client-side):**
- Zarządzanie stanem formularza (wartości, błędy, touched)
- Walidacja pól w czasie rzeczywistym (on-blur, on-change)
- Komunikacja z Supabase Auth SDK
- Nawigacja po udanej operacji (`window.location.href`)
- Wyświetlanie komunikatów błędów i stanów ładowania

### 2.4. Szczegółowy opis komponentów

#### 2.4.1. LoginForm

**Pola formularza:**
- `email` - adres email (wymagane)
- `password` - hasło (wymagane, min. 6 znaków)

**Walidacja:**
| Pole | Reguła | Komunikat błędu |
|------|--------|-----------------|
| email | Wymagane | "Adres email jest wymagany" |
| email | Format email | "Nieprawidłowy format adresu email" |
| password | Wymagane | "Hasło jest wymagane" |
| password | Min. 6 znaków | "Hasło musi mieć co najmniej 6 znaków" |

**Mapowanie błędów Supabase:**
| Błąd Supabase | Komunikat UI |
|---------------|--------------|
| `Email not confirmed` | "Adres email nie został potwierdzony. Sprawdź swoją skrzynkę." |
| Inne błędy auth | "Nieprawidłowy email lub hasło" (zapobieganie enumeracji) |
| Błąd sieci | "Błąd połączenia z serwerem. Spróbuj ponownie." |

**Flow:**
1. Użytkownik wypełnia formularz
2. Walidacja on-blur dla każdego pola
3. Submit → walidacja wszystkich pól
4. Wywołanie `supabase.auth.signInWithPassword()`
5. Sukces → przekierowanie do `/app` lub `redirectTo`
6. Błąd → wyświetlenie komunikatu

**Linki nawigacyjne:**
- "Zapomniałeś hasła?" → `/forgot-password`
- "Nie masz jeszcze konta? Zarejestruj się" → `/register`

#### 2.4.2. RegisterForm

**Pola formularza:**
- `email` - adres email (wymagane)
- `password` - hasło (wymagane, min. 8 znaków)
- `confirmPassword` - potwierdzenie hasła (wymagane, musi być identyczne)
- `acceptedTerms` - checkbox akceptacji regulaminu (wymagane)

**Walidacja:**
| Pole | Reguła | Komunikat błędu |
|------|--------|-----------------|
| email | Wymagane | "Email jest wymagany" |
| email | Format email | "Podaj poprawny adres email" |
| password | Wymagane | "Hasło jest wymagane" |
| password | Min. 8 znaków | "Hasło musi mieć minimum 8 znaków" |
| confirmPassword | Wymagane | "Potwierdzenie hasła jest wymagane" |
| confirmPassword | Zgodność | "Hasła muszą być identyczne" |
| acceptedTerms | Zaznaczone | "Musisz zaakceptować regulamin" |

**Mapowanie błędów Supabase:**
| Błąd Supabase | Komunikat UI |
|---------------|--------------|
| `user already registered` / `already exists` | "Konto z tym adresem email już istnieje" |
| `invalid email` | "Podany adres email jest nieprawidłowy" |
| `password weak` | "Hasło jest zbyt słabe" |
| `signups not allowed` / `signup disabled` | "Rejestracja jest obecnie wyłączona" |
| Inne błędy | "Wystąpił błąd podczas rejestracji. Spróbuj ponownie." |
| Błąd sieci | "Brak połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie." |

**Komponenty dodatkowe:**
- `PasswordStrengthIndicator` - wizualny wskaźnik siły hasła

**Flow:**
1. Użytkownik wypełnia formularz
2. Walidacja real-time dla confirmPassword gdy password się zmienia
3. Walidacja on-blur dla pozostałych pól
4. Submit → walidacja wszystkich pól
5. Wywołanie `supabase.auth.signUp()`
6. Sukces → przekierowanie do `/login?registered=true`
7. Błąd → wyświetlenie komunikatu

**Linki nawigacyjne:**
- "Masz już konto? Zaloguj się" → `/login`
- Linki do regulaminu i polityki prywatności (otwierają się w nowej karcie)

#### 2.4.3. ForgotPasswordForm

> **Uwaga:** Ten komponent realizuje funkcjonalność odzyskiwania hasła (dodatkową względem PRD MVP) i jest w pełni zaimplementowany.

**Pola formularza:**
- `email` - adres email (wymagane)

**Walidacja:**
| Pole | Reguła | Komunikat błędu |
|------|--------|-----------------|
| email | Wymagane | "Adres email jest wymagany" |
| email | Format email | "Podaj poprawny adres email" |

**Stany komponentu:**
- `isLoading` - trwa wysyłanie żądania
- `isSubmitted` - formularz został wysłany (pokazuje SuccessMessage)

**SuccessMessage:**
- Zawsze wyświetlany po submit (niezależnie od tego czy email istnieje)
- Tekst: "Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła."
- Zapobiega enumeracji kont

**Flow:**
1. Użytkownik wprowadza email
2. Walidacja on-blur
3. Submit → walidacja
4. Wywołanie `supabase.auth.resetPasswordForEmail()` (redirect obsługiwany przez Supabase)
5. Zawsze wyświetlenie SuccessMessage (ignorowanie błędów API)

**Linki nawigacyjne:**
- "Wróć do logowania" → `/login`

### 2.5. Typy i interfejsy

**Lokalizacja:** `src/components/auth/types.ts`

```typescript
// Login
interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

// Register
interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
  form?: string;
}

// Forgot Password (ZAIMPLEMENTOWANE)
interface ForgotPasswordFormValues {
  email: string;
}

interface ForgotPasswordFormErrors {
  email?: string;
}

interface ForgotPasswordFormState {
  isLoading: boolean;
  isSubmitted: boolean;
}

interface UseForgotPasswordFormReturn {
  values: ForgotPasswordFormValues;
  errors: ForgotPasswordFormErrors;
  isLoading: boolean;
  isSubmitted: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

// Password Strength
type PasswordStrength = "weak" | "fair" | "good" | "strong";

interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  label: string;
}
```

---

## 3. Logika backendowa

### 3.1. Middleware autentykacji

**Lokalizacja:** `src/middleware/index.ts`

#### 3.1.1. Obecny stan

Middleware obecnie tylko ustawia klienta Supabase w `context.locals`:

```typescript
context.locals.supabase = supabaseClient;
```

#### 3.1.2. Wymagane rozszerzenia

**Ochrona tras:**

```typescript
// Trasy publiczne (dostępne bez autoryzacji)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
];

// Trasy API publiczne
const PUBLIC_API_ROUTES = [
  '/api/auth/logout',
];

// Trasy wymagające autoryzacji
const PROTECTED_ROUTES = [
  '/app',
];

// Prefiksy tras API wymagających autoryzacji
const PROTECTED_API_PREFIXES = [
  '/api/lists',
  '/api/tasks',
  '/api/profile',
  '/api/ai',
  '/api/ai-interactions',
];
```

**Logika middleware:**

1. Sprawdzenie czy trasa jest publiczna → jeśli tak, kontynuuj
2. Pobranie sesji z `supabase.auth.getSession()`
3. Ustawienie `context.locals.session` i `context.locals.user`
4. Dla tras chronionych bez sesji → redirect do `/login?redirectTo=<current_path>`
5. Dla tras API bez sesji → zwrot `401 Unauthorized`

#### 3.1.3. Rozszerzenie context.locals

**Lokalizacja:** `src/env.d.ts`

```typescript
declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    session: Session | null;
    user: User | null;
  }
}
```

### 3.2. Endpointy API

#### 3.2.1. Endpoint wylogowania (DO UTWORZENIA)

**Ścieżka:** `POST /api/auth/logout`

**Lokalizacja:** `src/pages/api/auth/logout.ts`

**Request:**
- Metoda: POST
- Body: brak
- Wymaga autoryzacji: Nie (ale sprawdza sesję)

**Response:**
- Sukces: `200 OK` + `{ success: true }`
- Po wylogowaniu redirect do `/login`

**Implementacja:**
1. Pobranie sesji z `context.locals`
2. Wywołanie `supabase.auth.signOut()`
3. Zwrot sukcesu

### 3.3. Walidacja danych wejściowych

#### 3.3.1. Walidacja client-side

Walidacja w hookach React przed wysłaniem do Supabase:
- Regex dla email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Minimalna długość hasła: 8 znaków (rejestracja), 6 znaków (logowanie)
- Zgodność haseł (rejestracja)
- Checkbox regulaminu (rejestracja)

#### 3.3.2. Walidacja server-side

Supabase Auth wykonuje dodatkową walidację:
- Unikalność email
- Siła hasła (konfiguracja w Supabase Dashboard)
- Poprawność tokenów email

### 3.4. Obsługa wyjątków

#### 3.4.1. Klasy błędów

**Lokalizacja:** `src/lib/api/errors.ts`

Istniejące klasy błędów:
- `ApiError` - bazowa klasa
- `UnauthorizedError` (401) - sesja wygasła
- `NotFoundError` (404) - nie znaleziono zasobu
- `ValidationError` (400) - błąd walidacji
- `ConflictError` (409) - konflikt danych
- `ServerError` (500) - błąd serwera
- `NetworkError` - błąd sieci

#### 3.4.2. Obsługa błędów autoryzacji

**Funkcja:** `handleUnauthorizedError(redirectPath)`

**Działanie:**
1. Przekierowanie do `/login?redirectTo=<redirectPath>`
2. Wyświetlenie toast "Sesja wygasła. Zaloguj się ponownie."

### 3.5. Server-side rendering

#### 3.5.1. Konfiguracja Astro

**Lokalizacja:** `astro.config.mjs`

```javascript
export default defineConfig({
  output: "server",  // SSR dla wszystkich stron
  adapter: node({ mode: "standalone" }),
});
```

#### 3.5.2. Renderowanie stron auth

Każda strona auth wykonuje sprawdzenie sesji server-side:

```typescript
// Przykład: login.astro
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  return Astro.redirect("/app");
}
```

#### 3.5.3. Renderowanie stron chronionych

Strony chronione weryfikują sesję i przekierowują:

```typescript
// Przykład: app.astro
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login?redirectTo=/app");
}

const userEmail = session.user.email ?? "";
```

---

## 4. System autentykacji Supabase

### 4.1. Konfiguracja klientów Supabase

#### 4.1.1. Klient server-side

**Lokalizacja:** `src/db/supabase.client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Użycie:** 
- W middleware: `context.locals.supabase = supabaseClient`
- W stronach Astro: `Astro.locals.supabase`
- W endpointach API: `context.locals.supabase`

#### 4.1.2. Klient browser-side

**Lokalizacja:** `src/db/supabase.browser.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Użycie:**
- W hookach React (client-side)
- W komponentach interaktywnych

#### 4.1.3. Zmienne środowiskowe

| Zmienna | Kontekst | Opis |
|---------|----------|------|
| `SUPABASE_URL` | Server | URL instancji Supabase |
| `SUPABASE_KEY` | Server | Klucz API (anon) |
| `PUBLIC_SUPABASE_URL` | Client | URL dostępny w przeglądarce |
| `PUBLIC_SUPABASE_ANON_KEY` | Client | Klucz dostępny w przeglądarce |

### 4.2. Przepływy autentykacji

#### 4.2.1. Rejestracja (US-001)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  /register  │────►│   signUp()  │────►│   Supabase  │────►│   /login    │
│  Formularz  │     │   (client)  │     │  Auth API   │     │ ?registered │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Email z     │
                                        │ potwierdzeniem│
                                        │ (opcjonalne)│
                                        └─────────────┘
```

**Metoda Supabase:** `signUp({ email, password })`

**Uwagi:**
- Email confirmation może być włączony/wyłączony w Supabase Dashboard
- Trigger bazodanowy tworzy profil użytkownika automatycznie

#### 4.2.2. Logowanie (US-002)

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐     ┌─────────────┐
│   /login    │────►│ signInWithPassword()│────►│   Supabase  │────►│    /app     │
│  Formularz  │     │      (client)       │     │  Auth API   │     │  Dashboard  │
└─────────────┘     └─────────────────────┘     └─────────────┘     └─────────────┘
```

**Metoda Supabase:** `signInWithPassword({ email, password })`

**Po sukcesie:**
- Supabase ustawia sesję (JWT w cookies/localStorage)
- Przekierowanie do `/app` lub `redirectTo` z URL

#### 4.2.3. Wylogowanie (US-004)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Header    │────►│  signOut()  │────►│   Supabase  │────►│   /login    │
│  UserMenu   │     │  (client)   │     │  Auth API   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Metoda Supabase:** `signOut()`

**Implementacja w Dashboard:**
- `Header` komponent otrzymuje prop `onLogout`
- `Dashboard` wywołuje `supabaseBrowser.auth.signOut()` i przekierowuje do `/login`

#### 4.2.4. Odzyskiwanie hasła

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────┐     ┌─────────────────┐
│/forgot-password │────►│ resetPasswordForEmail()│────►│   Supabase  │────►│ Email z linkiem │
│   Formularz     │     │       (client)        │     │  Auth API   │     │    do resetu    │
└─────────────────┘     └───────────────────────┘     └─────────────┘     └─────────────────┘
```

**Metoda Supabase:**
- `resetPasswordForEmail(email, { redirectTo })` - wysyłanie linku do resetowania hasła

> **Uwaga:** Po kliknięciu linku w emailu użytkownik zostanie przekierowany zgodnie z konfiguracją Supabase. Formularz do ustawienia nowego hasła jest obsługiwany przez Supabase Dashboard lub może być zaimplementowany w przyszłości.

### 4.3. Bezpieczeństwo (US-003)

#### 4.3.1. Row Level Security (RLS)

Supabase RLS zapewnia izolację danych użytkowników na poziomie bazy danych:
- Użytkownik widzi tylko swoje listy i zadania
- Próba dostępu do zasobów innego użytkownika jest blokowana

**Obsługa komunikatu o braku uprawnień (wymagane przez US-003):**

Gdy użytkownik próbuje uzyskać dostęp do zasobów innego użytkownika:
1. RLS blokuje zapytanie na poziomie bazy danych
2. API zwraca kod `403 Forbidden` lub pusty wynik (w zależności od operacji)
3. UI wyświetla komunikat: "Nie masz uprawnień do tego zasobu" lub "Nie znaleziono zasobu"

> **Uwaga bezpieczeństwa:** Ze względu na zapobieganie enumeracji zasobów, preferowany jest komunikat "Nie znaleziono" zamiast "Brak uprawnień" dla operacji GET.

#### 4.3.2. Sesja i tokeny

**Zarządzanie sesją:**
- JWT przechowywany w cookies (secure, httpOnly)
- Automatyczne odświeżanie tokenów przez Supabase SDK
- Wygaśnięcie sesji → przekierowanie do logowania

**Weryfikacja sesji:**
- Server-side: `supabase.auth.getSession()`
- Client-side: `supabase.auth.onAuthStateChange()`

#### 4.3.3. Ochrona przed atakami

| Zagrożenie | Zabezpieczenie |
|------------|----------------|
| Enumeracja kont | Jednolity komunikat błędu przy logowaniu, sukces zawsze przy reset hasła |
| XSS | React escaping, sanityzacja inputów |
| CSRF | Tokeny JWT |
| Session hijacking | Secure cookies, HTTPS |
| Brute force | Rate limiting w Supabase (konfiguracja w Dashboard) |

---

## 5. Mapowanie kryteriów akceptacji PRD

### 5.1. US-001 Rejestracja konta

| Kryterium akceptacji | Realizacja w architekturze |
|---------------------|---------------------------|
| Użytkownik może podać dane rejestracyjne wymagane przez system | `RegisterForm` z polami: email, hasło, potwierdzenie hasła |
| System tworzy konto i umożliwia zalogowanie po udanej rejestracji | `signUp()` → przekierowanie do `/login?registered=true` |
| Jeśli dane są niepoprawne lub konto już istnieje, system pokazuje komunikat błędu | Mapowanie błędów Supabase: "Konto z tym adresem email już istnieje", "Podany adres email jest nieprawidłowy" |

### 5.2. US-002 Logowanie do aplikacji

| Kryterium akceptacji | Realizacja w architekturze |
|---------------------|---------------------------|
| Użytkownik może wprowadzić dane logowania i uzyskać dostęp do aplikacji | `LoginForm` z polami: email, hasło → `signInWithPassword()` |
| Przy błędnych danych logowania system odmawia dostępu i wyświetla czytelny komunikat | Generyczny komunikat: "Nieprawidłowy email lub hasło" (zapobieganie enumeracji) |
| Po zalogowaniu użytkownik widzi swoje listy i aktualnie aktywną listę (lub stan pusty) | Przekierowanie do `/app` → `Dashboard` z `EmptyState` dla braku list |

### 5.3. US-003 Bezpieczny dostęp i autoryzacja zasobów

| Kryterium akceptacji | Realizacja w architekturze |
|---------------------|---------------------------|
| Użytkownik widzi wyłącznie swoje listy i zadania | Supabase RLS na poziomie bazy danych |
| Próba dostępu do zasobów innego użytkownika jest blokowana (brak danych i komunikat o braku uprawnień) | RLS blokuje zapytanie → API zwraca 403/404 → komunikat "Nie znaleziono zasobu" |
| Po wygaśnięciu sesji użytkownik jest proszony o ponowne zalogowanie | `UnauthorizedError` (401) → przekierowanie do `/login?redirectTo=<path>` + toast "Sesja wygasła" |

### 5.4. US-004 Wylogowanie

| Kryterium akceptacji | Realizacja w architekturze |
|---------------------|---------------------------|
| Użytkownik może wylogować się z aplikacji | `Header` → `UserMenu` → "Wyloguj się" → `signOut()` |
| Po wylogowaniu dostęp do danych jest zablokowany do czasu ponownego zalogowania | Sesja usunięta, JWT wyczyszczony |
| Próba wejścia na chronione widoki przekierowuje do logowania | Middleware sprawdza sesję → redirect do `/login` |

---

## 6. Scenariusze użycia

### 6.1. Scenariusz: Nowy użytkownik rejestruje się (US-001)

1. Użytkownik wchodzi na `/register`
2. Astro sprawdza sesję → brak → renderuje RegisterForm
3. Użytkownik wypełnia formularz (email, hasło, potwierdzenie, regulamin)
4. PasswordStrengthIndicator pokazuje siłę hasła
5. Walidacja on-blur dla każdego pola
6. Submit → walidacja wszystkich pól
7. Hook wywołuje `supabase.auth.signUp()`
8. Sukces → przekierowanie do `/login?registered=true`
9. Strona login wyświetla alert "Rejestracja zakończona pomyślnie!"
10. (Opcjonalnie) Supabase wysyła email z potwierdzeniem

### 6.2. Scenariusz: Użytkownik loguje się (US-002)

1. Użytkownik wchodzi na `/login`
2. Astro sprawdza sesję → brak → renderuje LoginForm
3. Użytkownik wypełnia email i hasło
4. Walidacja on-blur
5. Submit → walidacja
6. Hook wywołuje `supabase.auth.signInWithPassword()`
7. Sukces → przekierowanie do `/app`
8. Błąd → wyświetlenie komunikatu (generyczny dla bezpieczeństwa)

### 6.3. Scenariusz: Użytkownik odzyskuje hasło

> **Uwaga:** Ten scenariusz opisuje funkcjonalność dodatkową, nie wymaganą przez PRD MVP, ale zaimplementowaną jako standardowa praktyka UX.

1. Użytkownik klika "Zapomniałeś hasła?" na stronie login
2. Przekierowanie do `/forgot-password`
3. Użytkownik wprowadza email
4. Submit → `resetPasswordForEmail()`
5. Wyświetlenie SuccessMessage (zawsze, niezależnie od istnienia konta - zapobiega enumeracji)
6. Supabase wysyła email z linkiem do resetowania hasła (jeśli konto istnieje)
7. Użytkownik klika link w emailu i ustawia nowe hasło (obsługiwane przez Supabase)

### 6.4. Scenariusz: Użytkownik wylogowuje się (US-004)

1. Użytkownik jest na `/app` (zalogowany)
2. Klika na UserMenu w Header
3. Wybiera "Wyloguj się"
4. Dashboard wywołuje `onLogout()` → `supabase.auth.signOut()`
5. Przekierowanie do `/login`
6. Sesja usunięta, dostęp do `/app` wymaga ponownego logowania

### 6.5. Scenariusz: Sesja wygasa (US-003)

1. Użytkownik jest na `/app`
2. Token JWT wygasa
3. Użytkownik wykonuje akcję (np. pobieranie zadań)
4. API zwraca 401
5. `UnauthorizedError` zostaje obsłużony
6. Przekierowanie do `/login?redirectTo=/app`
7. Toast "Sesja wygasła. Zaloguj się ponownie."
8. Po zalogowaniu → powrót do `/app`

### 6.6. Scenariusz: Próba dostępu do chronionej strony bez logowania (US-003, US-004)

1. Niezalogowany użytkownik wchodzi na `/app`
2. Astro sprawdza sesję → brak
3. Przekierowanie do `/login?redirectTo=/app`
4. Po zalogowaniu → powrót do `/app`

### 6.7. Scenariusz: Próba dostępu do zasobów innego użytkownika (US-003)

1. Zalogowany użytkownik próbuje pobrać listę/zadanie innego użytkownika (np. przez manipulację URL/API)
2. API wykonuje zapytanie do Supabase
3. RLS blokuje dostęp → pusty wynik lub błąd
4. API zwraca:
   - `404 Not Found` dla GET (zapobiega enumeracji)
   - `403 Forbidden` dla PUT/DELETE/PATCH
5. UI wyświetla komunikat: "Nie znaleziono zasobu" lub "Nie masz uprawnień do tej operacji"

---

## 7. Elementy do implementacji

### 7.1. Komponenty dodatkowe (POZA ZAKRESEM PRD)

> **Uwaga:** Wszystkie komponenty związane z odzyskiwaniem hasła są w pełni zaimplementowane.

| Komponent | Lokalizacja | Status |
|-----------|-------------|--------|
| `ForgotPasswordForm.tsx` | `src/components/auth/` | ✅ Zaimplementowane |
| `useForgotPasswordForm.ts` | `src/components/auth/` | ✅ Zaimplementowane |

### 7.2. Strony dodatkowe (POZA ZAKRESEM PRD)

> **Uwaga:** Strona forgot-password.astro jest w pełni zaimplementowana.

| Strona | Lokalizacja | Status |
|--------|-------------|--------|
| `forgot-password.astro` | `src/pages/` | ✅ Zaimplementowane |

### 7.3. Nowe endpointy (OPCJONALNE)

| Endpoint | Lokalizacja | Priorytet |
|----------|-------------|-----------|
| `logout.ts` | `src/pages/api/auth/` | Opcjonalny (wylogowanie działa client-side) |

### 7.4. Modyfikacje istniejących plików (WYMAGANE PRZEZ PRD)

| Plik | Zmiana | Priorytet | User Story |
|------|--------|-----------|-----------|
| `src/middleware/index.ts` | Dodanie pełnej ochrony tras i weryfikacji sesji | Wysoki | US-003, US-004 |
| `src/env.d.ts` | Rozszerzenie `App.Locals` o session i user | Wysoki | US-003 |
| `src/lib/api/errors.ts` | Komunikat o braku uprawnień (403) | Średni | US-003 |

### 7.5. Modyfikacje istniejących plików (POZA ZAKRESEM PRD)

> **Uwaga:** Typy dla ForgotPassword są już zaimplementowane w types.ts.

| Plik | Zmiana | Status |
|------|--------|--------|
| `src/components/auth/types.ts` | Typy dla ForgotPassword | ✅ Zaimplementowane |

---

## 8. Zgodność z istniejącą architekturą

### 8.1. Konwencje nazewnictwa

- Komponenty React: PascalCase (`LoginForm`, `RegisterForm`)
- Hooki: camelCase z prefiksem `use` (`useLoginForm`, `useRegisterForm`)
- Typy: PascalCase z sufixem opisującym typ (`LoginFormValues`, `LoginFormErrors`)
- Pliki Astro: kebab-case (`login.astro`, `forgot-password.astro`)
- Endpointy API: kebab-case (`/api/auth/logout`)

### 8.2. Struktura katalogów

```
src/
├── components/
│   └── auth/
│       ├── LoginForm.tsx                  # ✅ Zaimplementowane
│       ├── RegisterForm.tsx               # ✅ Zaimplementowane
│       ├── ForgotPasswordForm.tsx         # ✅ Zaimplementowane
│       ├── PasswordStrengthIndicator.tsx  # ✅ Zaimplementowane
│       ├── useLoginForm.ts                # ✅ Zaimplementowane
│       ├── useRegisterForm.ts             # ✅ Zaimplementowane
│       ├── useForgotPasswordForm.ts       # ✅ Zaimplementowane
│       ├── usePasswordStrength.ts         # ✅ Zaimplementowane
│       └── types.ts                       # ✅ Zaimplementowane
├── db/
│   ├── supabase.client.ts
│   └── supabase.browser.ts
├── layouts/
│   ├── AuthLayout.astro
│   └── DashboardLayout.astro
├── middleware/
│   └── index.ts                           # DO ROZSZERZENIA
├── pages/
│   ├── api/
│   │   └── auth/
│   │       └── logout.ts                  # OPCJONALNY
│   ├── login.astro                        # ✅ Zaimplementowane
│   ├── register.astro                     # ✅ Zaimplementowane
│   ├── forgot-password.astro              # ✅ Zaimplementowane
│   ├── app.astro
│   └── index.astro
└── env.d.ts                               # DO ROZSZERZENIA
```

### 8.3. Zgodność z zasadami projektu

- **Astro-first**: Strony renderowane przez Astro (SSR), React tylko dla interaktywności
- **Supabase via context**: Klient server-side przez `context.locals.supabase`
- **Walidacja Zod**: Możliwa do dodania dla endpointów API (zgodnie z istniejącym wzorcem w `lib/schemas/`)
- **Obsługa błędów**: Wykorzystanie istniejących klas z `lib/api/errors.ts`

---

## 9. Podsumowanie

### 9.1. Kluczowe wnioski

1. **Obecna implementacja** jest zaawansowana - formularze login, register i forgot-password są w pełni gotowe
2. **Funkcjonalności PRD** (US-001 do US-004) są w większości zaimplementowane
3. **Architektura** prawidłowo rozdziela odpowiedzialności między Astro (SSR, routing) i React (interaktywność)
4. **Bezpieczeństwo** opiera się na Supabase Auth i RLS - nie wymaga dodatkowej implementacji
5. **Funkcjonalności dodatkowe** (odzyskiwanie hasła, akceptacja regulaminu) wykraczają poza wymagania PRD MVP, ale są zaimplementowane jako standardowa praktyka UX
6. **Odzyskiwanie hasła** (forgot-password) jest w pełni zaimplementowane - użytkownik może wysłać link do resetowania, a ustawienie nowego hasła jest obsługiwane przez Supabase

### 9.2. Priorytety implementacji

**Wymagane przez PRD:**
1. **Wysoki**: Rozszerzenie middleware o pełną ochronę tras (US-003)
2. **Wysoki**: Komunikat o braku uprawnień przy próbie dostępu do cudzych zasobów (US-003)

**Opcjonalne:**
3. **Niski**: Endpoint logout (obecnie działa client-side)

### 9.3. Zgodność z wymaganiami PRD

| User Story | Status | Uwagi |
|------------|--------|-------|
| US-001 | ✅ Gotowe | RegisterForm w pełni funkcjonalny |
| US-002 | ✅ Gotowe | LoginForm w pełni funkcjonalny |
| US-003 | ⚠️ Częściowo | Wymaga rozszerzenia middleware + komunikat o braku uprawnień |
| US-004 | ✅ Gotowe | Wylogowanie działa w Dashboard |

### 9.4. Nadmiarowe założenia względem PRD

| Element | Status | Rekomendacja |
|---------|--------|--------------|
| Odzyskiwanie hasła (forgot-password) | ✅ Zaimplementowane | Zachować - standardowa praktyka UX |
| Akceptacja regulaminu | ✅ Zaimplementowane | Zachować - zgodność z RODO (PRD 1.5) |
| Potwierdzenie email | Opcjonalne w Supabase | Wyłączyć dla MVP (PRD nie wymaga) |
