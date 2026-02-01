# Diagram przepływu autentykacji - AI Task Manager

## 1. Przegląd

Niniejszy dokument zawiera diagramy Mermaid opisujące przepływy autentykacji w aplikacji AI Task Manager, zgodnie z wymaganiami US-001, US-002, US-003 i US-004 z PRD oraz specyfikacją `auth-spec.md`.

---

## 2. Architektura komponentów autentykacji

```mermaid
graph TB
    subgraph "Strony Astro (Server-Side)"
        LOGIN["/login<br/>login.astro"]
        REGISTER["/register<br/>register.astro"]
        FORGOT["/forgot-password<br/>forgot-password.astro"]
        RESET["/reset-password<br/>reset-password.astro<br/>(DO UTWORZENIA)"]
        APP["/app<br/>app.astro"]
        INDEX["/<br/>index.astro"]
    end

    subgraph "Layouty"
        AUTH_LAYOUT["AuthLayout.astro<br/>(strony publiczne)"]
        DASH_LAYOUT["DashboardLayout.astro<br/>(strony chronione)"]
    end

    subgraph "Komponenty React (Client-Side)"
        LOGIN_FORM["LoginForm.tsx"]
        REGISTER_FORM["RegisterForm.tsx"]
        FORGOT_FORM["ForgotPasswordForm.tsx"]
        RESET_FORM["ResetPasswordForm.tsx<br/>(DO UTWORZENIA)"]
        DASHBOARD["Dashboard.tsx"]
        HEADER["Header.tsx<br/>(UserMenu + Logout)"]
    end

    subgraph "Hooki React"
        USE_LOGIN["useLoginForm.ts"]
        USE_REGISTER["useRegisterForm.ts"]
        USE_FORGOT["useForgotPasswordForm.ts"]
        USE_RESET["useResetPasswordForm.ts<br/>(DO UTWORZENIA)"]
        USE_PASSWORD["usePasswordStrength.ts"]
    end

    subgraph "Backend"
        MIDDLEWARE["middleware/index.ts"]
        SUPABASE_CLIENT["supabase.client.ts<br/>(server)"]
        SUPABASE_BROWSER["supabase.browser.ts<br/>(browser)"]
        API_LISTS["/api/lists/*"]
        API_TASKS["/api/tasks/*"]
        API_PROFILE["/api/profile"]
    end

    subgraph "Supabase Auth"
        SUPABASE_AUTH["Supabase Auth API"]
        RLS["Row Level Security"]
    end

    %% Relacje strony -> layout
    LOGIN --> AUTH_LAYOUT
    REGISTER --> AUTH_LAYOUT
    FORGOT --> AUTH_LAYOUT
    RESET --> AUTH_LAYOUT
    APP --> DASH_LAYOUT

    %% Relacje strona -> komponent
    LOGIN --> LOGIN_FORM
    REGISTER --> REGISTER_FORM
    FORGOT --> FORGOT_FORM
    RESET --> RESET_FORM
    APP --> DASHBOARD

    %% Relacje komponent -> hook
    LOGIN_FORM --> USE_LOGIN
    REGISTER_FORM --> USE_REGISTER
    REGISTER_FORM --> USE_PASSWORD
    FORGOT_FORM --> USE_FORGOT
    RESET_FORM --> USE_RESET
    RESET_FORM --> USE_PASSWORD
    DASHBOARD --> HEADER

    %% Relacje hook -> Supabase
    USE_LOGIN --> SUPABASE_BROWSER
    USE_REGISTER --> SUPABASE_BROWSER
    USE_FORGOT --> SUPABASE_BROWSER
    USE_RESET --> SUPABASE_BROWSER
    HEADER --> SUPABASE_BROWSER
    SUPABASE_BROWSER --> SUPABASE_AUTH

    %% Middleware
    MIDDLEWARE --> SUPABASE_CLIENT
    SUPABASE_CLIENT --> SUPABASE_AUTH

    %% API -> Supabase
    API_LISTS --> SUPABASE_AUTH
    API_TASKS --> SUPABASE_AUTH
    API_PROFILE --> SUPABASE_AUTH
    SUPABASE_AUTH --> RLS

    %% Style
    classDef astro fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    classDef react fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef hook fill:#764abc,stroke:#333,stroke-width:2px,color:#fff
    classDef backend fill:#68d391,stroke:#333,stroke-width:2px,color:#000
    classDef supabase fill:#3ecf8e,stroke:#333,stroke-width:2px,color:#000
    classDef todo fill:#ffd93d,stroke:#333,stroke-width:2px,color:#000

    class LOGIN,REGISTER,FORGOT,APP,INDEX astro
    class LOGIN_FORM,REGISTER_FORM,FORGOT_FORM,DASHBOARD,HEADER react
    class USE_LOGIN,USE_REGISTER,USE_FORGOT,USE_PASSWORD hook
    class MIDDLEWARE,SUPABASE_CLIENT,SUPABASE_BROWSER,API_LISTS,API_TASKS,API_PROFILE backend
    class SUPABASE_AUTH,RLS supabase
    class RESET,RESET_FORM,USE_RESET todo
```

---

## 3. Flow rejestracji (US-001)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant RA as register.astro<br/>(Astro SSR)
    participant RF as RegisterForm<br/>(React)
    participant URF as useRegisterForm<br/>(Hook)
    participant SB as Supabase Auth
    participant DB as PostgreSQL<br/>(+ trigger)

    U->>B: Wejście na /register
    B->>RA: GET /register
    RA->>RA: getSession() - sprawdzenie sesji

    alt Użytkownik zalogowany
        RA-->>B: Redirect do /app
    else Użytkownik niezalogowany
        RA-->>B: Renderuj AuthLayout + RegisterForm
    end

    B->>RF: Wyświetl formularz
    U->>RF: Wypełnia email, hasło, potwierdzenie, regulamin
    RF->>URF: handleChange(), handleBlur()
    URF->>URF: validateField() - walidacja on-blur

    alt Błąd walidacji
        URF-->>RF: Pokaż błąd przy polu
        RF-->>U: Wyświetl komunikat błędu
    end

    U->>RF: Kliknięcie "Zarejestruj się"
    RF->>URF: handleSubmit()
    URF->>URF: validateForm() - walidacja wszystkich pól

    alt Błąd walidacji formularza
        URF-->>RF: setErrors()
        RF-->>U: Wyświetl błędy, focus na pierwszym polu
    else Walidacja OK
        URF->>SB: signUp({ email, password })

        alt Błąd Supabase
            SB-->>URF: error (already exists, invalid email, etc.)
            URF->>URF: mapAuthError()
            URF-->>RF: setErrors({ form: "..." })
            RF-->>U: Wyświetl komunikat błędu
        else Sukces
            SB->>DB: INSERT INTO auth.users
            DB->>DB: Trigger: create profile
            SB-->>URF: user created
            URF->>B: window.location.href = "/login?registered=true"
            B->>U: Redirect do strony logowania
        end
    end
```

---

## 4. Flow logowania (US-002)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant LA as login.astro<br/>(Astro SSR)
    participant LF as LoginForm<br/>(React)
    participant ULF as useLoginForm<br/>(Hook)
    participant SB as Supabase Auth
    participant AA as app.astro<br/>(chroniona)

    U->>B: Wejście na /login
    B->>LA: GET /login
    LA->>LA: getSession()

    alt Użytkownik już zalogowany
        LA-->>B: Redirect do /app
    else Użytkownik niezalogowany
        LA->>LA: Sprawdź ?registered=true
        LA-->>B: Renderuj AuthLayout + LoginForm<br/>(+ opcjonalny alert sukcesu)
    end

    B->>LF: Wyświetl formularz
    U->>LF: Wypełnia email i hasło
    LF->>ULF: handleChange(), handleBlur()
    ULF->>ULF: validateField()

    U->>LF: Kliknięcie "Zaloguj się"
    LF->>ULF: handleSubmit()
    ULF->>ULF: validateForm()

    alt Błąd walidacji
        ULF-->>LF: setErrors()
        LF-->>U: Wyświetl błędy
    else Walidacja OK
        ULF->>SB: signInWithPassword({ email, password })

        alt Błąd logowania
            SB-->>ULF: error
            ULF->>ULF: mapAuthError()<br/>"Nieprawidłowy email lub hasło"
            ULF-->>LF: setErrors({ form: "..." })
            LF-->>U: Wyświetl komunikat błędu
        else Sukces
            SB-->>ULF: session + user
            SB->>B: Set JWT cookie
            ULF->>ULF: Sprawdź ?redirectTo
            ULF->>B: window.location.href = redirectTo || "/app"
            B->>AA: GET /app
            AA->>AA: getSession() - sesja istnieje
            AA-->>B: Renderuj Dashboard
            B-->>U: Wyświetl dashboard z listami
        end
    end
```

---

## 5. Flow wylogowania (US-004)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant D as Dashboard<br/>(React)
    participant H as Header<br/>(React)
    participant SB as Supabase Auth
    participant LA as login.astro

    U->>D: Jest na /app (zalogowany)
    D->>H: Renderuj Header z userEmail
    U->>H: Kliknięcie na UserMenu
    H-->>U: Wyświetl dropdown menu
    U->>H: Kliknięcie "Wyloguj się"
    H->>H: handleLogout()
    H->>SB: signOut()
    SB->>B: Usuń JWT cookie
    SB-->>H: success
    H->>B: window.location.href = "/login"
    B->>LA: GET /login
    LA->>LA: getSession() - brak sesji
    LA-->>B: Renderuj LoginForm
    B-->>U: Wyświetl stronę logowania

    Note over U,LA: Po wylogowaniu próba wejścia<br/>na /app przekieruje do /login
```

---

## 6. Flow ochrony tras (US-003)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant MW as Middleware
    participant AA as app.astro
    participant API as API Endpoint<br/>(/api/lists)
    participant SB as Supabase Auth
    participant RLS as Row Level Security

    rect rgb(255, 240, 240)
        Note over U,RLS: Scenariusz A: Dostęp do chronionej strony bez sesji
        U->>B: GET /app (niezalogowany)
        B->>MW: Request
        MW->>MW: context.locals.supabase = client
        MW->>AA: next()
        AA->>SB: getSession()
        SB-->>AA: session = null
        AA-->>B: Redirect /login?redirectTo=/app
        B-->>U: Strona logowania
    end

    rect rgb(240, 255, 240)
        Note over U,RLS: Scenariusz B: Dostęp do chronionej strony z sesją
        U->>B: GET /app (zalogowany)
        B->>MW: Request + JWT cookie
        MW->>AA: next()
        AA->>SB: getSession()
        SB-->>AA: session + user
        AA-->>B: Renderuj Dashboard
        B-->>U: Dashboard z listami użytkownika
    end

    rect rgb(255, 255, 240)
        Note over U,RLS: Scenariusz C: Wywołanie API bez autoryzacji
        U->>B: GET /api/lists (brak sesji)
        B->>API: Request
        API->>SB: getUser()
        SB-->>API: error / user = null
        API-->>B: 401 Unauthorized
        B-->>U: Błąd autoryzacji
    end

    rect rgb(240, 240, 255)
        Note over U,RLS: Scenariusz D: Próba dostępu do cudzych zasobów
        U->>B: GET /api/lists/abc-123
        B->>API: Request + JWT
        API->>SB: getUser()
        SB-->>API: user
        API->>RLS: SELECT * FROM lists WHERE id='abc-123'
        RLS->>RLS: Sprawdź user_id = auth.uid()
        RLS-->>API: [] (pusty wynik - RLS blokuje)
        API-->>B: 404 Not Found
        B-->>U: "Nie znaleziono zasobu"
    end
```

---

## 7. Flow wygaśnięcia sesji (US-003)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant D as Dashboard<br/>(React)
    participant API as API Endpoint
    participant SB as Supabase Auth
    participant LA as login.astro

    U->>D: Pracuje na /app
    Note over U,SB: Czas mija, JWT wygasa
    U->>D: Akcja (np. utworzenie zadania)
    D->>API: POST /api/lists/xxx/tasks
    API->>SB: getUser()
    SB-->>API: error (token expired)
    API-->>D: 401 Unauthorized
    D->>D: handleUnauthorizedError()
    D->>B: toast("Sesja wygasła")
    D->>B: window.location.href = "/login?redirectTo=/app"
    B->>LA: GET /login?redirectTo=/app
    LA-->>B: Formularz logowania
    B-->>U: "Sesja wygasła. Zaloguj się ponownie."

    U->>LA: Loguje się ponownie
    LA->>B: Redirect do /app (z redirectTo)
    B-->>U: Powrót do dashboardu
```

---

## 8. Flow odzyskiwania hasła (POZA ZAKRESEM PRD)

```mermaid
sequenceDiagram
    autonumber
    participant U as Użytkownik
    participant B as Przeglądarka
    participant FA as forgot-password.astro
    participant FF as ForgotPasswordForm
    participant UFF as useForgotPasswordForm
    participant SB as Supabase Auth
    participant E as Email
    participant RA as reset-password.astro
    participant RF as ResetPasswordForm

    rect rgb(255, 255, 220)
        Note over U,RF: UWAGA: Ta funkcjonalność jest POZA ZAKRESEM PRD MVP
    end

    U->>B: Kliknięcie "Zapomniałeś hasła?" na /login
    B->>FA: GET /forgot-password
    FA-->>B: Renderuj ForgotPasswordForm

    U->>FF: Wprowadza email
    FF->>UFF: handleSubmit()
    UFF->>SB: resetPasswordForEmail(email, {redirectTo})

    Note over UFF,SB: Zawsze pokazuj sukces<br/>(zapobieganie enumeracji kont)

    SB-->>UFF: response (ignorowany)
    UFF-->>FF: setIsSubmitted(true)
    FF-->>U: "Sprawdź swoją skrzynkę"

    alt Email istnieje w systemie
        SB->>E: Wyślij link resetujący
        E-->>U: Email z linkiem
        U->>B: Kliknięcie linku
        B->>RA: GET /reset-password?token=...
        RA->>SB: Weryfikacja tokena
        SB-->>RA: Sesja z tokenem reset
        RA-->>B: Renderuj ResetPasswordForm

        U->>RF: Wprowadza nowe hasło
        RF->>SB: updateUser({ password })
        SB-->>RF: success
        RF->>B: Redirect do /login
        B-->>U: "Hasło zostało zmienione"
    else Email nie istnieje
        Note over E,U: Brak emaila<br/>(użytkownik nie wie)
    end
```

---

## 9. Diagram stanów sesji

```mermaid
stateDiagram-v2
    [*] --> Niezalogowany: Wejście na stronę

    Niezalogowany --> Rejestracja: /register
    Niezalogowany --> Logowanie: /login
    Niezalogowany --> OdzyskiwanieHasla: /forgot-password

    Rejestracja --> Logowanie: Sukces rejestracji
    Rejestracja --> Rejestracja: Błąd walidacji

    Logowanie --> Zalogowany: Sukces logowania
    Logowanie --> Logowanie: Błędne dane
    Logowanie --> OdzyskiwanieHasla: "Zapomniałeś hasła?"

    OdzyskiwanieHasla --> Logowanie: Link wysłany / Powrót

    Zalogowany --> Dashboard: /app
    Dashboard --> Dashboard: Operacje na listach/zadaniach
    Dashboard --> SesjaWygasla: Token JWT wygasa
    Dashboard --> Niezalogowany: Wylogowanie

    SesjaWygasla --> Logowanie: Automatyczny redirect
    Logowanie --> Dashboard: Redirect do poprzedniej strony

    state Zalogowany {
        [*] --> Onboarding: Pierwsze logowanie
        Onboarding --> PustaLista: Zakończ onboarding
        PustaLista --> ZListami: Utwórz listę
        ZListami --> ZListami: Zarządzanie zadaniami
    }
```

---

## 10. Podsumowanie elementów

### 10.1. Komponenty biorące udział w autentykacji

| Typ             | Nazwa                 | Ścieżka                                        | Status                 |
| --------------- | --------------------- | ---------------------------------------------- | ---------------------- |
| Strona Astro    | login.astro           | `src/pages/login.astro`                        | ✅ Istnieje            |
| Strona Astro    | register.astro        | `src/pages/register.astro`                     | ✅ Istnieje            |
| Strona Astro    | forgot-password.astro | `src/pages/forgot-password.astro`              | ✅ Istnieje            |
| Strona Astro    | reset-password.astro  | `src/pages/reset-password.astro`               | ⚠️ Do utworzenia       |
| Strona Astro    | app.astro             | `src/pages/app.astro`                          | ✅ Istnieje            |
| Layout          | AuthLayout.astro      | `src/layouts/AuthLayout.astro`                 | ✅ Istnieje            |
| Komponent React | LoginForm             | `src/components/auth/LoginForm.tsx`            | ✅ Istnieje            |
| Komponent React | RegisterForm          | `src/components/auth/RegisterForm.tsx`         | ✅ Istnieje            |
| Komponent React | ForgotPasswordForm    | `src/components/auth/ForgotPasswordForm.tsx`   | ✅ Istnieje            |
| Komponent React | ResetPasswordForm     | `src/components/auth/ResetPasswordForm.tsx`    | ⚠️ Do utworzenia       |
| Komponent React | Dashboard             | `src/components/dashboard/Dashboard.tsx`       | ✅ Istnieje            |
| Komponent React | Header                | `src/components/dashboard/Header.tsx`          | ✅ Istnieje            |
| Hook            | useLoginForm          | `src/components/auth/useLoginForm.ts`          | ✅ Istnieje            |
| Hook            | useRegisterForm       | `src/components/auth/useRegisterForm.ts`       | ✅ Istnieje            |
| Hook            | useForgotPasswordForm | `src/components/auth/useForgotPasswordForm.ts` | ✅ Istnieje            |
| Hook            | useResetPasswordForm  | `src/components/auth/useResetPasswordForm.ts`  | ⚠️ Do utworzenia       |
| Hook            | usePasswordStrength   | `src/components/auth/usePasswordStrength.ts`   | ✅ Istnieje            |
| Middleware      | index.ts              | `src/middleware/index.ts`                      | ⚠️ Wymaga rozszerzenia |
| Klient Supabase | supabase.client.ts    | `src/db/supabase.client.ts`                    | ✅ Istnieje            |
| Klient Supabase | supabase.browser.ts   | `src/db/supabase.browser.ts`                   | ✅ Istnieje            |

### 10.2. Metody Supabase Auth używane w projekcie

| Metoda                    | Użycie                  | Plik                                         |
| ------------------------- | ----------------------- | -------------------------------------------- |
| `signInWithPassword()`    | Logowanie               | `useLoginForm.ts`                            |
| `signUp()`                | Rejestracja             | `useRegisterForm.ts`                         |
| `signOut()`               | Wylogowanie             | `Dashboard.tsx`                              |
| `resetPasswordForEmail()` | Wysłanie linku reset    | `useForgotPasswordForm.ts`                   |
| `updateUser()`            | Zmiana hasła            | `useResetPasswordForm.ts` (do utworzenia)    |
| `getSession()`            | Weryfikacja sesji (SSR) | `login.astro`, `register.astro`, `app.astro` |
| `getUser()`               | Weryfikacja w API       | `src/pages/api/**/*.ts`                      |
