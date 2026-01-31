# Architektura UI dla AI Task Manager

## 1. Przegląd struktury UI

### 1.1. Podsumowanie

AI Task Manager to webowa aplikacja do zarządzania zadaniami z opcjonalnym wsparciem AI w ustalaniu priorytetów. Architektura UI opiera się na wzorcu **master-detail** z persistentnym sidebar zawierającym listy użytkownika oraz głównym obszarem wyświetlającym zadania aktywnej listy.

### 1.2. Stack technologiczny

- **Framework**: Astro 5 z React 19 dla komponentów interaktywnych
- **Styling**: Tailwind 4 + Shadcn/ui jako biblioteka komponentów
- **Backend**: Supabase (PostgreSQL + Auth)
- **Typy**: TypeScript 5

### 1.3. Założenia architektoniczne

- **Desktop-only**: MVP nie obsługuje urządzeń mobilnych (min. szerokość 1024px)
- **SPA-like behavior**: Nawigacja między listami bez pełnego przeładowania strony
- **Optimistic updates**: Natychmiastowa aktualizacja UI z rollback przy błędach
- **URL-based state**: Filtry i sortowanie przechowywane w query parameters
- **Jasny motyw**: Brak trybu ciemnego w MVP

### 1.4. Główne sekcje interfejsu

```
┌─────────────────────────────────────────────────────────────┐
│                        HEADER (64px)                        │
│  [Logo]          [Nazwa aktywnej listy]        [UserMenu]   │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  SIDEBAR   │              MAIN CONTENT                      │
│  (~250px)  │                                                │
│            │  ┌──────────────────────────────────────────┐  │
│  Moje listy│  │           FILTER TOOLBAR                 │  │
│  ──────────│  └──────────────────────────────────────────┘  │
│            │                                                │
│  • Lista 1 │  ┌──────────────────────────────────────────┐  │
│  • Lista 2 │  │                                          │  │
│  • Lista 3 │  │           TASK LIST                      │  │
│            │  │      (grouped by priority)               │  │
│  [+ Nowa]  │  │                                          │  │
│            │  └──────────────────────────────────────────┘  │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

---

## 2. Lista widoków

### 2.1. Strona logowania

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/login` |
| **Cel** | Umożliwienie użytkownikowi zalogowania się do aplikacji |
| **Publiczny** | Tak |

#### Kluczowe informacje do wyświetlenia

- Logo aplikacji
- Formularz logowania (email, hasło)
- Link do rejestracji
- Link "Zapomniałem hasła"
- Komunikaty błędów walidacji

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `AuthLayout` | Minimalny layout z wycentrowanym formularzem |
| `LoginForm` | Formularz z polami email i password |
| `Button` | Przycisk "Zaloguj" (primary) |
| `Input` | Pola tekstowe z walidacją |
| `Alert` | Komunikaty błędów |

#### Względy UX, dostępności i bezpieczeństwa

- **UX**: Autofocus na polu email, walidacja on-blur, przycisk aktywny zawsze ale submit blokowany przy błędach
- **Dostępność**: Powiązanie label z input przez `htmlFor`, `aria-invalid` dla błędów, focus ring na interaktywnych elementach
- **Bezpieczeństwo**: Hasła nie wyświetlane w plain text, brak informacji czy email istnieje w systemie (zapobieganie enumeracji)

#### Mapowanie do API

- Supabase Auth SDK: `signInWithPassword()`

#### Mapowanie do User Stories

- **US-002**: Logowanie do aplikacji

---

### 2.2. Strona rejestracji

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/register` |
| **Cel** | Utworzenie nowego konta użytkownika |
| **Publiczny** | Tak |

#### Kluczowe informacje do wyświetlenia

- Logo aplikacji
- Formularz rejestracji (email, hasło, powtórz hasło)
- Link do logowania
- Warunki akceptacji (RODO)

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `AuthLayout` | Minimalny layout z wycentrowanym formularzem |
| `RegisterForm` | Formularz z polami email, password, confirmPassword |
| `Checkbox` | Akceptacja warunków |
| `Button` | Przycisk "Zarejestruj" (primary) |

#### Względy UX, dostępności i bezpieczeństwa

- **UX**: Wskaźnik siły hasła, walidacja zgodności haseł w czasie rzeczywistym
- **Dostępność**: Czytelne komunikaty błędów, focus management
- **Bezpieczeństwo**: Minimalna długość hasła (8 znaków), wymóg akceptacji regulaminu

#### Mapowanie do API

- Supabase Auth SDK: `signUp()`
- Trigger bazodanowy automatycznie tworzy profil użytkownika

#### Mapowanie do User Stories

- **US-001**: Rejestracja konta

---

### 2.3. Strona resetowania hasła

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/forgot-password` |
| **Cel** | Umożliwienie odzyskania dostępu do konta |
| **Publiczny** | Tak |

#### Kluczowe informacje do wyświetlenia

- Logo aplikacji
- Pole email
- Informacja o wysłaniu linku resetującego
- Link powrotu do logowania

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `AuthLayout` | Minimalny layout |
| `ForgotPasswordForm` | Formularz z polem email |
| `SuccessMessage` | Potwierdzenie wysłania emaila |

#### Względy UX, dostępności i bezpieczeństwa

- **UX**: Zawsze pokazuj sukces (nawet dla nieistniejących emaili) - zapobieganie enumeracji
- **Bezpieczeństwo**: Rate limiting na backendzie

#### Mapowanie do API

- Supabase Auth SDK: `resetPasswordForEmail()`

---

### 2.4. Dashboard (widok główny)

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app` |
| **Cel** | Główny interfejs zarządzania listami i zadaniami |
| **Publiczny** | Nie (wymaga autentykacji) |

#### Kluczowe informacje do wyświetlenia

- Lista list użytkownika (sidebar)
- Zadania aktywnej listy (main content)
- Nazwa aktywnej listy
- Stan onboardingu (jeśli nieukończony)
- Stany puste (brak list / pusta lista)

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `DashboardLayout` | Layout master-detail z Header, Sidebar, Main |
| `Header` | Nawigacja główna z logo i user menu |
| `Sidebar` | Lista list z CRUD inline |
| `TaskList` | Lista zadań z grupowaniem |
| `FilterToolbar` | Wyszukiwarka, filtry, sortowanie |
| `TaskCard` | Karta pojedynczego zadania |
| `InlineTaskInput` | Szybkie dodawanie zadania |
| `EmptyState` | Komponenty stanów pustych |
| `OnboardingWizard` | Overlay z 3-krokowym onboardingiem |

#### Względy UX, dostępności i bezpieczeństwa

- **UX**: 
  - Aktywna lista wizualnie wyróżniona w sidebar
  - Infinite scroll (50 zadań per porcja)
  - Optimistic updates przy drag & drop
  - Skeleton loaders podczas ładowania
- **Dostępność**: 
  - Landmarks (nav, main, aside)
  - Nagłówki sekcji dla screen readers
  - Skip links do głównej treści
- **Bezpieczeństwo**: 
  - Przekierowanie do /login przy 401
  - RLS zapewnia izolację danych

#### Mapowanie do API

| Akcja | Endpoint |
|-------|----------|
| Pobranie profilu | `GET /api/profile` |
| Pobranie list | `GET /api/lists` |
| Pobranie zadań | `GET /api/lists/:listId/tasks` |
| Zmiana aktywnej listy | `PATCH /api/profile` |

#### Mapowanie do User Stories

- **US-003**: Bezpieczny dostęp i autoryzacja zasobów
- **US-006**: Przegląd i przełączanie aktywnej listy
- **US-014**: Domyślne ukrywanie zadań "Zrobione"
- **US-016**: Sortowanie zadań po priorytecie
- **US-026**: Obsługa stanu pustego

---

### 2.5. Modal tworzenia/edycji zadania

| Atrybut | Wartość |
|---------|---------|
| **Typ** | Overlay (Dialog) |
| **Cel** | Pełna edycja zadania z integracją AI |

#### Kluczowe informacje do wyświetlenia

- Pola formularza: tytuł, opis, priorytet
- Przycisk "Zasugeruj priorytet" (AI)
- Panel sugestii AI (gdy aktywny)
- Walidacja inline

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `Dialog` | Kontener modalny z Shadcn/ui |
| `TaskForm` | Formularz z walidacją |
| `PrioritySelector` | Wybór priorytetu (3 opcje) |
| `AISuggestionButton` | Przycisk uruchamiający AI |
| `AISuggestionPanel` | Panel z wynikiem i akcjami |
| `TextareaWithCounter` | Opis z licznikiem znaków |

#### Względy UX, dostępności i bezpieczeństwa

- **UX**: 
  - Focus trap wewnątrz modala
  - Zamknięcie przez Escape lub klik poza modalem
  - Walidacja on-blur dla tytułu
  - Przycisk "Zapisz" zawsze aktywny, błędy przy submit
- **Dostępność**: 
  - `role="dialog"`, `aria-modal="true"`
  - `aria-labelledby` wskazujący na tytuł
  - Powrót focus po zamknięciu
- **Bezpieczeństwo**: 
  - Sanityzacja inputów przed wysłaniem

#### Mapowanie do API

| Akcja | Endpoint |
|-------|----------|
| Tworzenie zadania | `POST /api/lists/:listId/tasks` |
| Edycja zadania | `PATCH /api/tasks/:id` |
| Sugestia AI | `POST /api/ai/suggest` |
| Decyzja AI | `PATCH /api/ai-interactions/:id` |

#### Mapowanie do User Stories

- **US-009**: Dodanie zadania do aktywnej listy
- **US-010**: Edycja zadania
- **US-018**: Ręczna zmiana priorytetu
- **US-019**: Uruchomienie sugestii AI
- **US-020**: Akceptacja sugestii AI
- **US-021**: Modyfikacja sugestii AI
- **US-022**: Odrzucenie sugestii AI z podaniem powodu
- **US-027**: Obsługa błędów walidacji

---

### 2.6. Modal potwierdzenia usunięcia

| Atrybut | Wartość |
|---------|---------|
| **Typ** | Overlay (AlertDialog) |
| **Cel** | Potwierdzenie destrukcyjnych akcji |

#### Kluczowe informacje do wyświetlenia

- Pytanie o potwierdzenie
- Informacja co zostanie usunięte
- Przyciski: Anuluj, Usuń

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `AlertDialog` | Kontener z Shadcn/ui |
| `Button` | Anuluj (secondary), Usuń (danger) |

#### Względy UX i dostępności

- **UX**: Domyślny focus na "Anuluj" (bezpieczna opcja)
- **Dostępność**: `role="alertdialog"`, jasny komunikat

#### Mapowanie do API

| Akcja | Endpoint |
|-------|----------|
| Usunięcie zadania | `DELETE /api/tasks/:id` |
| Usunięcie listy | `DELETE /api/lists/:id` |

#### Mapowanie do User Stories

- **US-008**: Usunięcie listy
- **US-011**: Usunięcie zadania

---

### 2.7. Onboarding Wizard

| Atrybut | Wartość |
|---------|---------|
| **Typ** | Overlay (wielokrokowy) |
| **Cel** | Edukacja nowego użytkownika |

#### Kluczowe informacje do wyświetlenia

**Krok 1: Model priorytetów**
- Wizualizacja trzech poziomów (Niski/Średni/Wysoki)
- Wyjaśnienie systemu sortowania

**Krok 2: Rola AI**
- Informacja że AI to sugestia, nie automat
- Zachęta do korzystania z funkcji

**Krok 3: Pierwsza lista**
- Zachęta do utworzenia listy
- Opcjonalnie: przykładowe zadanie

#### Kluczowe komponenty

| Komponent | Opis |
|-----------|------|
| `OnboardingWizard` | Kontener z nawigacją kroków |
| `OnboardingStep` | Pojedynczy krok z treścią |
| `StepIndicator` | Wskaźnik postępu (1/3, 2/3, 3/3) |
| `Button` | Dalej, Pomiń, Zakończ |

#### Względy UX i dostępności

- **UX**: 
  - Możliwość pominięcia w każdym momencie
  - Animacje przejść między krokami
  - Progres wizualny
- **Dostępność**: 
  - `aria-live` dla zmian kroków
  - Jasne etykiety przycisków

#### Mapowanie do API

- `POST /api/profile/onboarding/complete` (z wersją)

#### Mapowanie do User Stories

- **US-024**: Jednorazowy onboarding po pierwszym uruchomieniu
- **US-025**: Powrót do onboardingu z poziomu aplikacji

---

## 3. Mapa podróży użytkownika

### 3.1. Flow nowego użytkownika

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  /register  │────►│   /login    │────►│    /app     │
│  Rejestracja│     │  Logowanie  │     │  Dashboard  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────┐
                    │              ONBOARDING WIZARD                       │
                    │  ┌─────────┐    ┌─────────┐    ┌─────────┐          │
                    │  │ Krok 1  │───►│ Krok 2  │───►│ Krok 3  │─────┐    │
                    │  │Prioryt. │    │  AI     │    │  Lista  │     │    │
                    │  └─────────┘    └─────────┘    └─────────┘     │    │
                    │                                    │Pomiń      │    │
                    └────────────────────────────────────┼───────────┘    │
                                                         ▼                │
                    ┌────────────────────────────────────────────────┐    │
                    │              EMPTY STATE (brak list)           │◄───┘
                    │  "Utwórz swoją pierwszą listę zadań"           │
                    │                [Utwórz listę]                  │
                    └────────────────────────┬───────────────────────┘
                                             │
                                             ▼
                    ┌────────────────────────────────────────────────┐
                    │              EMPTY STATE (pusta lista)         │
                    │  "Dodaj pierwsze zadanie do tej listy"         │
                    │                [Dodaj zadanie]                 │
                    └────────────────────────┬───────────────────────┘
                                             │
                                             ▼
                    ┌────────────────────────────────────────────────┐
                    │              NORMALNY WIDOK                    │
                    │  Sidebar + TaskList z zadaniami                │
                    └────────────────────────────────────────────────┘
```

### 3.2. Flow codziennego użytkowania

```
┌─────────────┐     ┌─────────────────────────────────────────────┐
│   /login    │────►│                  /app                       │
│  Logowanie  │     │                Dashboard                    │
└─────────────┘     └─────────────────────┬───────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
        ▼                                 ▼                                 ▼
┌───────────────┐               ┌───────────────┐               ┌───────────────┐
│ Zarządzanie   │               │ Zarządzanie   │               │ Filtrowanie   │
│   listami     │               │   zadaniami   │               │ i sortowanie  │
└───────┬───────┘               └───────┬───────┘               └───────┬───────┘
        │                               │                               │
        ▼                               ▼                               ▼
• Wybierz listę              • Dodaj (inline/modal)              • Wyszukaj
• Utwórz listę              • Edytuj (modal)                    • Pokaż ukończone
• Zmień nazwę               • Oznacz jako done                  • Sortuj
• Usuń listę                • Usuń zadanie                      • Wyczyść filtry
                            • Zmień kolejność (drag)
```

### 3.3. Flow dodawania zadania

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DODAWANIE ZADANIA                                │
└─────────────────────────────────────────────────────────────────────────┘

ŚCIEŻKA SZYBKA (inline):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Wpisz tytuł  │────►│Wybierz prior.│────►│    Enter     │
│              │     │   [L/M/H]    │     │   = Zapisz   │
└──────────────┘     └──────────────┘     └──────────────┘

ŚCIEŻKA PEŁNA (modal):
┌──────────────┐     ┌────────────────────────────────────┐
│ Klik "Rozwiń"│────►│           TASK MODAL               │
│  lub edycja  │     │  ┌──────────────────────────────┐  │
└──────────────┘     │  │ Tytuł: [________________]    │  │
                     │  │ Opis:  [________________]    │  │
                     │  │        [________________]    │  │
                     │  │ Priorytet: [L] [M] [H]       │  │
                     │  │            [🤖 Zasugeruj]    │  │
                     │  └──────────────────────────────┘  │
                     │         [Anuluj]  [Zapisz]         │
                     └────────────────────────────────────┘
```

### 3.4. Flow sugestii AI

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUGESTIA AI                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐
│    Kliknij   │────►│   Spinner    │────►│      AI SUGGESTION PANEL     │
│  "Zasugeruj" │     │ (max 15 sek) │     │                              │
└──────────────┘     └──────────────┘     │  ┌────────────────────────┐  │
                            │             │  │ Sugerowany: [WYSOKI]   │  │
                            │ timeout     │  │ "Bo deadline jest..."  │  │
                            ▼             │  └────────────────────────┘  │
                     ┌──────────────┐     │                              │
                     │ "AI niedost."│     │  [Akceptuj] [Zmień] [Odrzuć]│
                     │ [Ponów]      │     └──────────────┬───────────────┘
                     └──────────────┘                    │
                                          ┌──────────────┼──────────────┐
                                          │              │              │
                                          ▼              ▼              ▼
                                    ┌──────────┐  ┌──────────┐  ┌──────────────┐
                                    │ Akceptuj │  │  Zmień   │  │   Odrzuć     │
                                    │ → zapis  │  │ → wybierz│  │ → pole powodu│
                                    │ prioryt. │  │   inny   │  │ (wymagane)   │
                                    └──────────┘  └──────────┘  └──────────────┘
```

### 3.5. Flow zarządzania zadaniem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      INTERAKCJA Z TASK CARD                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TASK CARD (normalny stan)                                  │
│  ┌────┐                                                     │
│  │ ☐  │  Tytuł zadania                        [🔴 Wysoki]   │
│  └────┘  Skrócony opis zadania...                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ hover
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  TASK CARD (hover)                                          │
│  ┌────┐                                            ┌─────┐  │
│  │ ☐  │  Tytuł zadania              [🔴 Wysoki]   │✏️ 🗑│  │
│  └────┘  Skrócony opis...           [≡ drag]      └─────┘  │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
    ┌──────────┴──────────┐    ┌─────────┴─────────┐
    │                     │    │                   │
    ▼                     ▼    ▼                   ▼
┌────────┐          ┌──────────┐              ┌──────────┐
│Checkbox│          │  Edytuj  │              │  Usuń    │
│ klik   │          │  (modal) │              │ (modal   │
└────┬───┘          └──────────┘              │potwierdz)│
     │                                        └──────────┘
     ▼
┌────────────────────────────────────────┐
│  Animacja "strike-through" na tytule   │
│  500ms opóźnienie                      │
│  Przeniesienie do sekcji "Ukończone"   │
│  (lub ukrycie jeśli filtr domyślny)    │
└────────────────────────────────────────┘
```

---

## 4. Układ i struktura nawigacji

### 4.1. Hierarchia nawigacji

```
Aplikacja
├── Strony publiczne (AuthLayout)
│   ├── /login
│   ├── /register
│   └── /forgot-password
│
└── Strony chronione (DashboardLayout)
    └── /app
        ├── Sidebar (nawigacja list)
        │   ├── Lista list użytkownika
        │   └── Tworzenie nowej listy
        │
        ├── Header
        │   ├── Logo (link do /app)
        │   ├── Breadcrumb (nazwa aktywnej listy)
        │   └── UserMenu
        │       ├── Email (read-only)
        │       ├── "Powtórz wprowadzenie"
        │       └── "Wyloguj"
        │
        └── Main Content
            ├── FilterToolbar
            │   ├── Wyszukiwarka
            │   ├── Toggle "Pokaż ukończone"
            │   ├── Dropdown sortowania
            │   └── "Wyczyść filtry"
            │
            └── TaskList
                ├── Sekcja "Wysoki priorytet"
                ├── Sekcja "Średni priorytet"
                └── Sekcja "Niski priorytet"
```

### 4.2. Komponenty nawigacyjne

#### Header

| Element | Pozycja | Funkcja |
|---------|---------|---------|
| Logo/Nazwa | Lewo | Link do głównego widoku (/app) |
| Nazwa listy | Środek | Informacja kontekstowa |
| UserMenu | Prawo | Dropdown z opcjami konta |

#### Sidebar

| Element | Funkcja |
|---------|---------|
| Nagłówek "Moje listy" | Tytuł sekcji |
| Lista list | Nawigacja między listami |
| Wyróżnienie aktywnej | Kolor tła dla aktywnej listy |
| Przycisk "+" | Tworzenie nowej listy (inline input) |
| Hover actions | Ikona edycji, usuwania |

#### FilterToolbar

| Element | Funkcja | Domyślna wartość |
|---------|---------|------------------|
| Pole wyszukiwania | Filtrowanie po tytule/opisie | Puste |
| Toggle "Pokaż ukończone" | Włączenie/wyłączenie zadań done | Off (ukryte) |
| Dropdown sortowania | Zmiana kolejności | Priorytet (malejąco) |
| Badge aktywnych filtrów | Liczba niestandardowych filtrów | 0 |
| "Wyczyść filtry" | Reset do domyślnych | Ukryty gdy 0 filtrów |

### 4.3. Przepływy nawigacyjne

#### Nawigacja publiczna → chroniona

```
/login  ─────────────────►  /app
   │                          │
   │  sukces logowania        │  401/403
   │                          │
   └─────────────────────◄────┘
```

#### Nawigacja wewnątrz dashboardu

```
Sidebar (klik na listę)
         │
         ├──► PATCH /api/profile (activeListId)
         │
         ├──► GET /api/lists/:listId/tasks
         │
         └──► Aktualizacja Main Content (bez przeładowania strony)
```

### 4.4. Stany URL i query parameters

| Parametr | Typ | Opis | Domyślna wartość |
|----------|-----|------|------------------|
| `status` | number | Filtr statusu (1=todo, 2=done) | 1 |
| `search` | string | Fraza wyszukiwania | - |
| `sort` | string | Pole sortowania | priority |
| `order` | string | Kierunek (asc/desc) | desc |

**Przykład URL:**
```
/app?status=1&search=raport&sort=priority&order=desc
```

---

## 5. Kluczowe komponenty

### 5.1. Komponenty layoutu

#### `AuthLayout`

- **Opis**: Minimalny layout dla stron autentykacji
- **Zawiera**: Logo wycentrowane, formularz w karcie, tło neutralne
- **Użycie**: `/login`, `/register`, `/forgot-password`

#### `DashboardLayout`

- **Opis**: Layout master-detail z Header, Sidebar, Main
- **Zawiera**: Stała nawigacja, responsywny sidebar, główny obszar scrollowalny
- **Użycie**: `/app`

#### `Header`

- **Opis**: Stały nagłówek (64px) z nawigacją główną
- **Zawiera**: Logo, breadcrumb/nazwa listy, UserMenu
- **Props**: `activeListName: string`

#### `Sidebar`

- **Opis**: Panel boczny (~250px) z listami użytkownika
- **Zawiera**: Lista list, inline input do tworzenia, akcje hover
- **Props**: `lists: List[]`, `activeListId: string | null`
- **Emituje**: `onListSelect`, `onListCreate`, `onListRename`, `onListDelete`

### 5.2. Komponenty zadań

#### `TaskList`

- **Opis**: Lista zadań zgrupowana po priorytecie
- **Zawiera**: Nagłówki sekcji, TaskCard, infinite scroll
- **Props**: `tasks: Task[]`, `groupByPriority: boolean`
- **Funkcje**: Drag & drop reordering, virtualizacja dla dużych list

#### `TaskCard`

- **Opis**: Karta pojedynczego zadania
- **Zawiera**: Checkbox, tytuł, opis (truncated), badge priorytetu, akcje hover
- **Props**: `task: Task`, `onStatusChange`, `onEdit`, `onDelete`
- **Stany**: normalny, hover, edytowany, właśnie utworzony (fade-in), ukończony (strike-through)

#### `InlineTaskInput`

- **Opis**: Szybkie dodawanie zadania bez modala
- **Zawiera**: Pole tytułu, selector priorytetu, przycisk "Rozwiń"
- **Props**: `listId: string`, `onSubmit`, `onExpand`

#### `TaskModal`

- **Opis**: Modal pełnej edycji/tworzenia zadania
- **Zawiera**: Formularz (tytuł, opis, priorytet), integracja AI
- **Props**: `task?: Task`, `listId: string`, `isOpen`, `onClose`, `onSave`

### 5.3. Komponenty AI

#### `AISuggestionButton`

- **Opis**: Przycisk uruchamiający sugestię AI
- **Zawiera**: Ikona sparkles, tekst "Zasugeruj priorytet"
- **Stany**: default, loading (disabled + spinner), error
- **Props**: `onRequest`, `isLoading`, `isDisabled`

#### `AISuggestionPanel`

- **Opis**: Panel z wynikiem sugestii AI
- **Zawiera**: Badge sugerowanego priorytetu, uzasadnienie, 3 przyciski akcji
- **Props**: `suggestion`, `onAccept`, `onModify`, `onReject`
- **Stany**: wynik, loading placeholder, timeout error

#### `RejectionReasonInput`

- **Opis**: Pole powodu odrzucenia sugestii AI
- **Zawiera**: Textarea z licznikiem (max 300), przycisk potwierdzenia
- **Props**: `onSubmit`, `maxLength: 300`

### 5.4. Komponenty UI wspólne

#### `PriorityBadge`

- **Opis**: Badge wizualizujący priorytet
- **Zawiera**: Kolor, ikona, opcjonalnie tekst
- **Warianty**: 
  - Low (green-500, strzałka w dół)
  - Medium (yellow-500, kreska)
  - High (red-500, strzałka w górę)
- **Dostępność**: Ikona + kolor + tekst na hover/focus

#### `PrioritySelector`

- **Opis**: Wybór priorytetu (3 opcje)
- **Zawiera**: 3 przyciski/radio z PriorityBadge
- **Props**: `value`, `onChange`, `error`

#### `EmptyState`

- **Opis**: Komponent stanów pustych
- **Zawiera**: Ilustracja, nagłówek, tekst, CTA button
- **Warianty**: 
  - `noLists`: "Utwórz swoją pierwszą listę"
  - `emptyList`: "Dodaj pierwsze zadanie"
  - `noResults`: "Brak wyników wyszukiwania"

#### `ConfirmationModal`

- **Opis**: Modal potwierdzenia destrukcyjnych akcji
- **Zawiera**: Pytanie, opis konsekwencji, Anuluj/Potwierdź
- **Props**: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`

### 5.5. Komponenty formularzy

#### `Input`

- **Opis**: Pole tekstowe z walidacją
- **Zawiera**: Label, input, komunikat błędu
- **Props**: `label`, `value`, `error`, `onBlur`
- **Dostępność**: `aria-invalid`, `aria-describedby`

#### `Textarea`

- **Opis**: Pole wieloliniowe z opcjonalnym licznikiem
- **Zawiera**: Label, textarea, counter, błąd
- **Props**: `maxLength`, `showCounter`

#### `SearchInput`

- **Opis**: Pole wyszukiwania z ikoną i debounce
- **Zawiera**: Ikona lupy, input, przycisk clear
- **Props**: `value`, `onChange`, `debounceMs: 300`

### 5.6. Komponenty feedback

#### `Toast`

- **Opis**: Notyfikacje nieblokujące
- **Warianty**: success, error, warning, info
- **Props**: `message`, `type`, `duration`, `action`
- **Pozycja**: Prawy dolny róg

#### `Skeleton`

- **Opis**: Placeholder podczas ładowania
- **Warianty**: TaskCard, ListItem, tekst
- **Animacja**: Pulse

#### `Spinner`

- **Opis**: Wskaźnik ładowania
- **Warianty**: inline (mały), fullscreen (overlay)

### 5.7. Tabela mapowania komponentów do User Stories

| Komponent | User Stories |
|-----------|-------------|
| `LoginForm` | US-002 |
| `RegisterForm` | US-001 |
| `DashboardLayout` | US-003, US-006 |
| `Sidebar` | US-005, US-006, US-007, US-008 |
| `TaskList` | US-014, US-016, US-017 |
| `TaskCard` | US-011, US-012, US-013, US-018 |
| `TaskModal` | US-009, US-010, US-027 |
| `InlineTaskInput` | US-009 |
| `AISuggestionButton` | US-019 |
| `AISuggestionPanel` | US-020, US-021, US-022 |
| `OnboardingWizard` | US-024, US-025 |
| `EmptyState` | US-026 |
| `Toast` | US-028 |
| `ConfirmationModal` | US-008, US-011 |
| `PriorityBadge` | US-016, US-018 |
| `FilterToolbar` | US-015, US-016 |

---

## 6. Obsługa błędów i stanów wyjątkowych

### 6.1. Mapowanie kodów HTTP na akcje UI

| Kod | Typ błędu | Akcja UI | Komponent |
|-----|-----------|----------|-----------|
| 400 | Walidacja | Komunikat inline pod polem | `Input` / `Textarea` |
| 401 | Brak autoryzacji | Redirect do `/login` + toast "Sesja wygasła" | `Toast` + redirect |
| 403 | Brak uprawnień | Redirect do `/login` + toast "Brak uprawnień" | `Toast` + redirect |
| 404 | Nie znaleziono | Strona "Nie znaleziono" + przycisk powrotu | `NotFoundState` |
| 409 | Konflikt | Toast z opcją odświeżenia | `Toast` z akcją |
| 500 | Błąd serwera | Toast "Błąd serwera" + opcja ponowienia | `Toast` z akcją |
| 503 | AI niedostępne | Fallback do manual priority + info | `AISuggestionPanel` |

### 6.2. Stany ładowania

| Kontekst | Komponent | Zachowanie |
|----------|-----------|------------|
| Lista list | `Sidebar` | Skeleton × 3 |
| Lista zadań | `TaskList` | Skeleton × 5 |
| Ładowanie kolejnych | `TaskList` | Spinner na dole |
| Sugestia AI | `AISuggestionPanel` | Placeholder z animacją + tekst "AI analizuje..." |
| Zapisywanie | `Button` | Loading state (spinner) |

### 6.3. Timeouty

| Operacja | Timeout | Akcja po przekroczeniu |
|----------|---------|------------------------|
| Sugestia AI | 15 sekund | Komunikat "Sugestia AI niedostępna" + opcje: "Ponów" / "Kontynuuj bez AI" |
| Żądania API | 30 sekund | Toast "Przekroczono czas oczekiwania" + opcja ponowienia |

### 6.4. Walidacja formularzy

| Pole | Reguła | Moment walidacji | Komunikat |
|------|--------|------------------|-----------|
| Tytuł zadania | Wymagane, 1-200 znaków | On-blur | "Tytuł jest wymagany" / "Tytuł max 200 znaków" |
| Priorytet | Wymagane | On-submit | Wizualne wyróżnienie braku wyboru |
| Nazwa listy | Wymagane, 1-100 znaków, unikalna | On-blur | "Nazwa jest wymagana" / "Lista o tej nazwie już istnieje" |
| Powód odrzucenia AI | Wymagane, max 300 znaków | On-submit | "Podaj powód odrzucenia" |

---

## 7. Responsywność i dostępność

### 7.1. Breakpointy (desktop-only MVP)

| Breakpoint | Szerokość | Zachowanie |
|------------|-----------|------------|
| Minimum | 1024px | Pełny layout master-detail |
| Optymalne | 1280px+ | Komfortowy widok |
| Poniżej 1024px | - | Brak wsparcia w MVP (opcjonalnie: komunikat o wymaganiu większego ekranu) |

### 7.2. Dostępność (WCAG 2.1 AA)

#### Wizualne

- **Kontrast**: Minimum 4.5:1 dla tekstu, 3:1 dla dużych elementów
- **Priorytety**: Kolor + ikona + tekst (multimodalne wskaźniki)
- **Focus**: Widoczny focus ring (outline) na wszystkich interaktywnych elementach
- **Animacje**: Respektowanie `prefers-reduced-motion`

#### Semantyczne

- **Landmarks**: `<header>`, `<nav>`, `<main>`, `<aside>`
- **Nagłówki**: Hierarchia h1-h6 (jeden h1 na stronę)
- **Listy**: `<ul>/<ol>` dla list zadań
- **Przyciski vs linki**: `<button>` dla akcji, `<a>` dla nawigacji

#### Interaktywne

- **Keyboard**: Pełna obsługa Tab, Enter, Escape, Arrow keys
- **Focus trap**: W modalach i wizardzie
- **Skip links**: Pominięcie nawigacji do głównej treści
- **ARIA**: 
  - `aria-label` dla ikon bez tekstu
  - `aria-invalid` + `aria-describedby` dla błędów
  - `aria-live` dla dynamicznych komunikatów
  - `role="dialog"` / `role="alertdialog"` dla modali

### 7.3. Paleta kolorów

| Element | Kolor | Użycie |
|---------|-------|--------|
| Tło główne | `gray-50` | Tło aplikacji |
| Tło kart | `white` | Karty, modale |
| Akcent główny | `blue-600` | Przyciski primary, linki |
| Priorytet Niski | `green-500` | Badge, ikona |
| Priorytet Średni | `yellow-500` | Badge, ikona |
| Priorytet Wysoki | `red-500` | Badge, ikona |
| Status Done | `green-600` | Checkbox zaznaczony |
| Tekst główny | `gray-900` | Nagłówki, tytuły |
| Tekst pomocniczy | `gray-600` | Opisy, secondary text |
| Błąd | `red-600` | Komunikaty błędów |
| Hover | `gray-100` | Tło elementów przy hover |

---

## 8. Bezpieczeństwo UI

### 8.1. Autentykacja

- Supabase Auth SDK zarządza tokenami JWT
- Tokeny przechowywane w secure cookies lub localStorage
- Automatyczne odświeżanie tokenów
- Wylogowanie czyści wszystkie tokeny

### 8.2. Autoryzacja

- Middleware weryfikuje token przed renderowaniem chronionych stron
- RLS na poziomie bazy zapewnia izolację danych
- Frontend nigdy nie ufa danym z URL/query params bez walidacji

### 8.3. Ochrona przed atakami

| Atak | Ochrona |
|------|---------|
| XSS | Sanityzacja inputów, React escaping |
| CSRF | Supabase Auth tokeny |
| Injection | Parametryzowane zapytania (Supabase) |
| Enumeration | Brak informacji czy email istnieje |

### 8.4. Obsługa sesji

- Automatyczny redirect do `/login` przy 401
- Toast informujący o wygaśnięciu sesji
- Zachowanie kontekstu (return URL) po ponownym logowaniu

---

## 9. Integracja z API - podsumowanie

| Widok/Komponent | Endpointy | Metody |
|-----------------|-----------|--------|
| Login | Supabase Auth | `signInWithPassword` |
| Register | Supabase Auth | `signUp` |
| Dashboard (init) | `/api/profile`, `/api/lists` | GET |
| Sidebar | `/api/lists`, `/api/profile` | GET, POST, PATCH, DELETE |
| TaskList | `/api/lists/:listId/tasks` | GET |
| TaskCard | `/api/tasks/:id` | PATCH, DELETE |
| TaskModal (create) | `/api/lists/:listId/tasks` | POST |
| TaskModal (edit) | `/api/tasks/:id` | PATCH |
| AI Suggestion | `/api/ai/suggest` | POST |
| AI Decision | `/api/ai-interactions/:id` | PATCH |
| Reorder | `/api/lists/:listId/tasks/reorder` | POST |
| Onboarding | `/api/profile/onboarding/complete` | POST |

---

## 10. Kwestie otwarte i rekomendacje

### 10.1. Decyzje do podjęcia przy implementacji

| Kwestia | Rekomendacja |
|---------|--------------|
| Biblioteka drag & drop | `@dnd-kit/core` (lżejsza) lub `react-beautiful-dnd` |
| Format dat | Relatywny ("2 godz. temu") z `date-fns` |
| Animacje | CSS transitions (bez dodatkowej biblioteki) |
| Język UI | Angielski (zgodnie z kodem) |
| Minimalna szerokość | 1024px |

### 10.2. Potencjalne usprawnienia post-MVP

- Tryb ciemny
- Responsywność mobilna
- Skróty klawiaturowe
- Synchronizacja między kartami
- Undo dla usunięć (toast z akcją)
- Globalny search

### 10.3. Metryki do śledzenia

- Czas ukończenia onboardingu
- Procent użytkowników korzystających z AI
- Najczęstsze filtry/sortowania
- Czas od sugestii AI do decyzji
