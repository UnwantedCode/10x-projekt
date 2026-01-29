# Architektura UI dla AI Task Manager

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika AI Task Manager opiera się na wzorcu **master-detail** z trwałym panelem bocznym (sidebar). Aplikacja składa się z dwóch głównych obszarów:

1. **Strony publiczne (autentykacja)** - minimalistyczny layout z wycentrowanym formularzem
2. **Aplikacja chroniona (dashboard)** - layout trójkolumnowy: header + sidebar + main content

### Zasady architektoniczne

- **Astro-first**: Statyczne komponenty w `.astro`, React tylko dla interaktywności
- **Desktop-only**: MVP skupia się wyłącznie na urządzeniach desktopowych (min. 1024px)
- **URL-driven state**: Filtry i sortowanie przechowywane w query parameters
- **Optimistic UI**: Natychmiastowa aktualizacja interfejsu z rollback przy błędach
- **Jasny motyw**: Jeden motyw kolorystyczny oparty na Shadcn/ui

### Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Astro 5 |
| Interaktywność | React 19 |
| Styling | Tailwind 4 + Shadcn/ui |
| Typy | TypeScript 5 |
| Backend | Supabase (Auth + PostgreSQL) |

---

## 2. Lista widoków

### 2.1 Strona logowania

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | `/login` |
| **Plik** | `src/pages/login.astro` |
| **Cel** | Uwierzytelnienie istniejącego użytkownika |
| **Dostęp** | Publiczny (przekierowanie do `/` jeśli zalogowany) |

**Kluczowe informacje do wyświetlenia:**
- Formularz logowania (email, hasło)
- Link do rejestracji
- Link "Zapomniałem hasła" (opcjonalnie w MVP)
- Komunikaty błędów walidacji i autentykacji

**Kluczowe komponenty:**
- `AuthLayout` - minimalny layout (logo + formularz wycentrowany)
- `LoginForm` - formularz React z walidacją
- `Alert` - komunikaty błędów

**Względy UX/a11y/bezpieczeństwa:**
- Walidacja on-blur dla pola email
- `aria-invalid` i `aria-describedby` dla błędów
- Rate limiting na poziomie API
- Przekierowanie po udanym logowaniu do `/`

**Powiązane User Stories:** US-002

---

### 2.2 Strona rejestracji

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | `/register` |
| **Plik** | `src/pages/register.astro` |
| **Cel** | Utworzenie nowego konta użytkownika |
| **Dostęp** | Publiczny (przekierowanie do `/` jeśli zalogowany) |

**Kluczowe informacje do wyświetlenia:**
- Formularz rejestracji (email, hasło, potwierdzenie hasła)
- Link do logowania
- Wymagania dotyczące hasła
- Komunikaty błędów (email zajęty, słabe hasło)

**Kluczowe komponenty:**
- `AuthLayout` - współdzielony z logowaniem
- `RegisterForm` - formularz React z walidacją
- `PasswordStrengthIndicator` - wskaźnik siły hasła

**Względy UX/a11y/bezpieczeństwa:**
- Walidacja siły hasła w czasie rzeczywistym
- Potwierdzenie hasła z matching validation
- GDPR compliance - minimalizacja danych

**Powiązane User Stories:** US-001

---

### 2.3 Dashboard (widok główny)

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | `/` |
| **Plik** | `src/pages/index.astro` |
| **Cel** | Główny interfejs zarządzania zadaniami |
| **Dostęp** | Chroniony (przekierowanie do `/login` jeśli niezalogowany) |

**Kluczowe informacje do wyświetlenia:**
- Lista wszystkich list użytkownika (sidebar)
- Zadania aktywnej listy (main content)
- Aktualny kontekst (nazwa listy w header)
- Statystyki listy (liczba zadań)

**Kluczowe komponenty:**

```
┌─────────────────────────────────────────────────────────────┐
│                        Header (64px)                         │
│  [Logo]          [Nazwa aktywnej listy]        [UserMenu]   │
├────────────────┬────────────────────────────────────────────┤
│    Sidebar     │              Main Content                   │
│   (~250px)     │                                            │
│                │  ┌──────────────────────────────────────┐  │
│  [Moje listy]  │  │          FilterToolbar               │  │
│  [+ Dodaj]     │  │  [Search] [Show done] [Sort] [Clear] │  │
│                │  └──────────────────────────────────────┘  │
│  • Lista 1     │                                            │
│  • Lista 2 ←   │  ┌──────────────────────────────────────┐  │
│  • Lista 3     │  │        TaskQuickAdd (inline)         │  │
│                │  └──────────────────────────────────────┘  │
│                │                                            │
│                │  ┌── Wysoki priorytet ──────────────────┐  │
│                │  │  [TaskCard] [TaskCard]               │  │
│                │  └──────────────────────────────────────┘  │
│                │                                            │
│                │  ┌── Średni priorytet ──────────────────┐  │
│                │  │  [TaskCard] [TaskCard] [TaskCard]    │  │
│                │  └──────────────────────────────────────┘  │
│                │                                            │
│                │  ┌── Niski priorytet ───────────────────┐  │
│                │  │  [TaskCard]                          │  │
│                │  └──────────────────────────────────────┘  │
└────────────────┴────────────────────────────────────────────┘
```

**Względy UX/a11y/bezpieczeństwa:**
- Keyboard navigation w sidebar i liście zadań
- ARIA landmarks (`nav`, `main`, `region`)
- Grupowanie zadań po priorytecie z nagłówkami sekcji (`<h2>`)
- Priorytety: kolor + ikona + tekst (color blindness)
- Focus trap w modalach
- JWT validation na każde żądanie API

**Powiązane User Stories:** US-003, US-005, US-006, US-009, US-014, US-016, US-017, US-026

---

### 2.4 Modal tworzenia/edycji zadania

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | Overlay na `/` |
| **Komponent** | `TaskModal.tsx` |
| **Cel** | Tworzenie nowego lub edycja istniejącego zadania |
| **Trigger** | Przycisk "Dodaj zadanie" lub ikona edycji na karcie |

**Kluczowe informacje do wyświetlenia:**
- Pole tytułu (wymagane)
- Pole opisu (opcjonalne, textarea)
- Wybór priorytetu (Low/Medium/High) z wizualizacją
- Przycisk "Zasugeruj priorytet" (AI)
- Panel sugestii AI (warunkowy)
- Przyciski akcji (Zapisz, Anuluj)

**Struktura modalu:**

```
┌─────────────────────────────────────────┐
│  Dodaj zadanie / Edytuj zadanie    [X]  │
├─────────────────────────────────────────┤
│                                         │
│  Tytuł *                                │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Opis                                   │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Priorytet *                            │
│  ○ Niski  ○ Średni  ○ Wysoki           │
│                          [✨ Zasugeruj] │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Panel sugestii AI (jeśli aktyw)│    │
│  │  Sugerowany: [Wysoki ▲]         │    │
│  │  "Zadanie ma deadline..."       │    │
│  │                                 │    │
│  │  [Akceptuj] [Zmień] [Odrzuć]   │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│              [Anuluj]  [Zapisz]         │
└─────────────────────────────────────────┘
```

**Względy UX/a11y/bezpieczeństwa:**
- Focus trap wewnątrz modalu
- `aria-modal="true"`, `role="dialog"`
- Escape zamyka modal
- Walidacja on-blur dla tytułu
- Disabled "Zapisz" podczas ładowania AI

**Powiązane User Stories:** US-009, US-010, US-019, US-020, US-021, US-022, US-027

---

### 2.5 Panel sugestii AI

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | Osadzony w `TaskModal` |
| **Komponent** | `AISuggestionPanel.tsx` |
| **Cel** | Wyświetlenie sugestii AI i zebranie decyzji użytkownika |
| **Trigger** | Kliknięcie przycisku "Zasugeruj priorytet" |

**Stany panelu:**

1. **Loading** - spinner + "AI analizuje zadanie..." (timeout 15s)
2. **Success** - sugerowany priorytet + uzasadnienie + 3 przyciski
3. **Error** - komunikat + opcja ponowienia lub kontynuowania bez AI
4. **Decision: Odrzuć** - pole tekstowe na powód (wymagane, max 300 znaków)

**Kluczowe komponenty:**
- `AISuggestionLoading` - placeholder z spinner
- `AISuggestionResult` - wynik z przyciskami akcji
- `AISuggestionRejectionForm` - pole powodu odrzucenia

**Względy UX/a11y/bezpieczeństwa:**
- `aria-live="polite"` dla dynamicznych aktualizacji
- 15s timeout z komunikatem
- Fallback do ręcznego priorytetu przy błędzie 503
- Zapis decyzji przez `PATCH /api/ai-interactions/:id`

**Powiązane User Stories:** US-019, US-020, US-021, US-022, US-023

---

### 2.6 Onboarding Wizard

| Właściwość | Wartość |
|------------|---------|
| **Ścieżka** | Overlay na `/` |
| **Komponent** | `OnboardingWizard.tsx` |
| **Cel** | Wprowadzenie nowego użytkownika w funkcje aplikacji |
| **Trigger** | Pierwsze logowanie (profile.onboardingCompletedAt === null) |

**Struktura kroków:**

| Krok | Tytuł | Treść |
|------|-------|-------|
| 1 | Model priorytetów | Wizualizacja 3 poziomów: Niski (zielony), Średni (żółty), Wysoki (czerwony) |
| 2 | Rola AI | Wyjaśnienie że AI sugeruje, użytkownik decyduje |
| 3 | Pierwsza lista | Utworzenie listy z przykładowym zadaniem (opcjonalnie) |

**Kluczowe komponenty:**
- `OnboardingStep` - pojedynczy krok z ilustracją i tekstem
- `OnboardingProgress` - wskaźnik postępu (dots)
- `OnboardingActions` - przyciski nawigacji (Dalej, Pomiń, Zakończ)

**Względy UX/a11y/bezpieczeństwa:**
- Możliwość pominięcia na każdym kroku
- Focus management między krokami
- `POST /api/profile/onboarding/complete` po zakończeniu
- Przycisk "Pokaż ponownie" w ustawieniach

**Powiązane User Stories:** US-024, US-025

---

### 2.7 Stany puste (Empty States)

| Właściwość | Wartość |
|------------|---------|
| **Komponent** | `EmptyState.tsx` |
| **Cel** | Prowadzenie użytkownika gdy brak danych |
| **Warianty** | Brak list, Pusta lista, Brak wyników wyszukiwania |

**Warianty:**

1. **Brak list** (`EmptyStateNoLists`)
   - Ilustracja: ikona folderów
   - Tekst: "Nie masz jeszcze żadnych list"
   - CTA: "Utwórz swoją pierwszą listę"

2. **Pusta lista** (`EmptyStateNoTasks`)
   - Ilustracja: ikona checklisty
   - Tekst: "Ta lista jest pusta"
   - CTA: "Dodaj pierwsze zadanie"

3. **Brak wyników** (`EmptyStateNoResults`)
   - Ilustracja: ikona wyszukiwania
   - Tekst: "Brak zadań pasujących do filtrów"
   - CTA: "Wyczyść filtry"

**Względy UX/a11y/bezpieczeństwa:**
- Wyraźne CTA prowadzące do akcji
- Responsywne ilustracje
- `role="status"` dla informacji

**Powiązane User Stories:** US-026

---

## 3. Mapa podróży użytkownika

### 3.1 Przepływ nowego użytkownika

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   /login     │────→│  /register   │────→│   /login     │
│              │     │              │     │ (po regist.) │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────┐
│                     / (Dashboard)                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              OnboardingWizard (overlay)              │ │
│  │  [Krok 1: Priorytety] → [Krok 2: AI] → [Krok 3]    │ │
│  └─────────────────────────────────────────────────────┘ │
│                           │                              │
│                           ▼                              │
│              EmptyStateNoLists                           │
│              "Utwórz swoją pierwszą listę"              │
│                           │                              │
│                           ▼                              │
│              Inline input w sidebar                      │
│                           │                              │
│                           ▼                              │
│              EmptyStateNoTasks                           │
│              "Dodaj pierwsze zadanie"                    │
│                           │                              │
│                           ▼                              │
│              TaskQuickAdd lub TaskModal                  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Przepływ powracającego użytkownika

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   /login     │────→│             / (Dashboard)             │
│              │     │                                       │
└──────────────┘     │  Sidebar z listami │ Lista zadań     │
                     │  (aktywna lista    │ (pogrupowane    │
                     │   wyróżniona)      │  po priorytecie)│
                     └──────────────────────────────────────┘
```

### 3.3 Przepływ dodawania zadania

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OPCJA A: Quick Add                          │
│                                                                     │
│  [TaskQuickAdd] ─→ Wpisz tytuł ─→ Wybierz priorytet ─→ Enter       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         OPCJA B: Full Modal                         │
│                                                                     │
│  [Przycisk "Dodaj"] ─→ TaskModal ─→ Wypełnij tytuł ─→ Wypełnij     │
│                        (otwarty)    (opcjonalnie       opis         │
│                                      opis)                          │
│                                         │                           │
│                            ┌────────────┴────────────┐              │
│                            │                         │              │
│                            ▼                         ▼              │
│                    [Wybierz priorytet     [Kliknij "Zasugeruj"]    │
│                     ręcznie]                        │               │
│                            │                        ▼               │
│                            │              AISuggestionPanel         │
│                            │                (loading)               │
│                            │                        │               │
│                            │                        ▼               │
│                            │              AISuggestionPanel         │
│                            │                (wynik)                 │
│                            │                        │               │
│                            │         ┌──────────────┼──────────────┐│
│                            │         ▼              ▼              ▼│
│                            │    [Akceptuj]    [Zmień]       [Odrzuć]│
│                            │         │              │              ││
│                            │         │              │         [Podaj│
│                            │         │              │          powód]│
│                            │         │              │              ││
│                            ▼         ▼              ▼              ▼│
│                          [Zapisz zadanie] ←────────────────────────┘│
│                                  │                                  │
│                                  ▼                                  │
│                          Modal zamknięty                            │
│                          Zadanie na liście                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Przepływ zmiany statusu zadania

```
┌────────────┐     ┌────────────────────┐     ┌────────────────┐
│  TaskCard  │────→│  Kliknięcie        │────→│  Animacja      │
│  (todo)    │     │  checkbox          │     │  strike-through│
└────────────┘     └────────────────────┘     └────────────────┘
                                                     │
                                                     │ (500ms delay)
                                                     ▼
                                              ┌────────────────┐
                                              │  Zadanie       │
                                              │  znika z       │
                                              │  widoku        │
                                              └────────────────┘
                                                     │
                                                     ▼
                                              ┌────────────────┐
                                              │  [Pokaż        │
                                              │   ukończone]   │
                                              │   → widoczne   │
                                              └────────────────┘
```

### 3.5 Przepływ reorderingu (drag & drop)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  1. Użytkownik chwyta drag handle na TaskCard                    │
│                            │                                      │
│                            ▼                                      │
│  2. Rozpoczęcie przeciągania (visual feedback)                   │
│                            │                                      │
│                            ▼                                      │
│  3. Przeciąganie w obrębie grupy priorytetu                      │
│     (drop zone highlighting)                                      │
│                            │                                      │
│                            ▼                                      │
│  4. Upuszczenie → Natychmiastowa aktualizacja UI (optimistic)    │
│                            │                                      │
│                            ▼                                      │
│  5. POST /api/lists/:listId/tasks/reorder (w tle)                │
│                            │                                      │
│              ┌─────────────┴─────────────┐                       │
│              ▼                           ▼                        │
│         [Sukces]                    [Błąd 409]                    │
│              │                           │                        │
│              ▼                           ▼                        │
│         Brak akcji                  Rollback UI                   │
│                                     Toast z błędem                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Układ i struktura nawigacji

### 4.1 Routing (Astro Pages)

```
src/pages/
├── index.astro          # Dashboard (chroniony)
├── login.astro          # Logowanie (publiczny)
└── register.astro       # Rejestracja (publiczny)
```

### 4.2 Middleware autentykacji

```typescript
// src/middleware/index.ts
// Chronione ścieżki: /
// Publiczne ścieżki: /login, /register, /api/*

if (isProtectedRoute && !user) {
  return redirect('/login');
}

if (isAuthRoute && user) {
  return redirect('/');
}
```

### 4.3 Struktura nawigacji

#### Header (64px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: AI Task Manager]    [Breadcrumb/Lista]    [Avatar] │
│                                                     ▼       │
│                                              ┌──────────┐   │
│                                              │ Ustawien.│   │
│                                              │ Powtórz  │   │
│                                              │ onboard. │   │
│                                              │──────────│   │
│                                              │ Wyloguj  │   │
│                                              └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Sidebar (~250px)

```
┌─────────────────┐
│  Moje listy [+] │  ← Nagłówek z przyciskiem dodawania
├─────────────────┤
│  ● Dziś      ✎🗑│  ← Aktywna lista (wyróżnione tło)
│  ○ Ten tydzień │  ← Nieaktywna lista
│  ○ Projekt A   │
│  ○ Zakupy      │
├─────────────────┤
│  [Nowa lista...│  ← Inline input (po kliknięciu +)
└─────────────────┘
```

**Interakcje sidebar:**
- Kliknięcie listy → ustawia jako aktywną → `PATCH /api/profile`
- Kliknięcie [+] → inline input na nową listę
- Double-click na nazwie → tryb edycji inline
- Hover → ikony ✎ (edycja) i 🗑 (usuń)
- 🗑 → ConfirmDialog

### 4.4 Mapowanie URL Query Parameters

| Parametr | Typ | Domyślna wartość | Opis |
|----------|-----|------------------|------|
| `status` | `1` \| `2` | `1` | 1=todo, 2=done |
| `priority` | `1` \| `2` \| `3` | brak | Filtr priorytetu |
| `search` | string | brak | Wyszukiwanie w tytule/opisie |
| `sort` | string | `priority` | Pole sortowania |
| `order` | `asc` \| `desc` | `desc` | Kierunek sortowania |

**Przykładowe URL:**
- `/` - wszystkie niezrobione, posortowane po priorytecie desc
- `/?status=2` - tylko ukończone
- `/?search=raport&priority=3` - wysoki priorytet zawierające "raport"

---

## 5. Kluczowe komponenty

### 5.1 Komponenty layoutu

| Komponent | Plik | Opis |
|-----------|------|------|
| `Layout` | `src/layouts/Layout.astro` | Bazowy layout HTML |
| `AuthLayout` | `src/layouts/AuthLayout.astro` | Layout dla stron auth |
| `AppLayout` | `src/layouts/AppLayout.astro` | Layout dashboard z header/sidebar |
| `Header` | `src/components/Header.astro` | Nagłówek aplikacji |
| `Sidebar` | `src/components/Sidebar.tsx` | Panel boczny z listami |

### 5.2 Komponenty list

| Komponent | Plik | Opis |
|-----------|------|------|
| `ListItem` | `src/components/lists/ListItem.tsx` | Element listy w sidebar |
| `ListInlineInput` | `src/components/lists/ListInlineInput.tsx` | Inline dodawanie/edycja listy |

### 5.3 Komponenty zadań

| Komponent | Plik | Opis |
|-----------|------|------|
| `TaskList` | `src/components/tasks/TaskList.tsx` | Główny widok listy zadań |
| `TaskGroup` | `src/components/tasks/TaskGroup.tsx` | Grupa zadań po priorytecie |
| `TaskCard` | `src/components/tasks/TaskCard.tsx` | Karta pojedynczego zadania |
| `TaskQuickAdd` | `src/components/tasks/TaskQuickAdd.tsx` | Inline dodawanie zadania |
| `TaskModal` | `src/components/tasks/TaskModal.tsx` | Modal tworzenia/edycji |
| `FilterToolbar` | `src/components/tasks/FilterToolbar.tsx` | Toolbar filtrów i sortowania |
| `PriorityBadge` | `src/components/tasks/PriorityBadge.tsx` | Badge priorytetu z ikoną |
| `PrioritySelector` | `src/components/tasks/PrioritySelector.tsx` | Wybór priorytetu (radio group) |

### 5.4 Komponenty AI

| Komponent | Plik | Opis |
|-----------|------|------|
| `AISuggestionButton` | `src/components/ai/AISuggestionButton.tsx` | Przycisk uruchamiający AI |
| `AISuggestionPanel` | `src/components/ai/AISuggestionPanel.tsx` | Panel z sugestią |
| `AISuggestionLoading` | `src/components/ai/AISuggestionLoading.tsx` | Stan ładowania |
| `AISuggestionResult` | `src/components/ai/AISuggestionResult.tsx` | Wynik z akcjami |
| `AISuggestionRejectionForm` | `src/components/ai/AISuggestionRejectionForm.tsx` | Formularz odrzucenia |

### 5.5 Komponenty onboardingu

| Komponent | Plik | Opis |
|-----------|------|------|
| `OnboardingWizard` | `src/components/onboarding/OnboardingWizard.tsx` | Główny wizard |
| `OnboardingStep` | `src/components/onboarding/OnboardingStep.tsx` | Pojedynczy krok |
| `OnboardingProgress` | `src/components/onboarding/OnboardingProgress.tsx` | Wskaźnik postępu |

### 5.6 Komponenty wspólne

| Komponent | Plik | Opis |
|-----------|------|------|
| `EmptyState` | `src/components/common/EmptyState.tsx` | Stany puste (warianty) |
| `ConfirmDialog` | `src/components/common/ConfirmDialog.tsx` | Modal potwierdzenia |
| `UserMenu` | `src/components/common/UserMenu.tsx` | Dropdown menu użytkownika |
| `Toast` | `src/components/ui/toast.tsx` | Notyfikacje (Shadcn) |
| `SkeletonLoader` | `src/components/common/SkeletonLoader.tsx` | Loading states |

### 5.7 Komponenty Shadcn/ui do wykorzystania

| Komponent | Użycie |
|-----------|--------|
| `Button` | Wszystkie przyciski akcji |
| `Input` | Pola tekstowe formularzy |
| `Textarea` | Pole opisu zadania |
| `Dialog` | TaskModal, ConfirmDialog |
| `DropdownMenu` | UserMenu, sortowanie |
| `Checkbox` | Status zadania |
| `Badge` | PriorityBadge |
| `Card` | TaskCard |
| `Skeleton` | Loading states |
| `RadioGroup` | PrioritySelector |
| `Alert` | Komunikaty błędów |

---

## 6. Obsługa błędów i stany specjalne

### 6.1 Mapowanie kodów błędów na komunikaty

| Kod | Typ | Komunikat | Akcja UI |
|-----|-----|-----------|----------|
| 400 | Walidacja | "Sprawdź wprowadzone dane" | Inline errors |
| 401 | Autoryzacja | "Sesja wygasła" | Redirect `/login` + Toast |
| 403 | Uprawnienia | "Brak dostępu" | Toast + Redirect |
| 404 | Nie znaleziono | "Nie znaleziono zasobu" | Toast + Powrót |
| 409 | Konflikt | "Wystąpił konflikt danych" | Toast + Odśwież |
| 503 | AI niedostępne | "Sugestia AI niedostępna" | Fallback manual |
| 5xx | Serwer | "Błąd serwera" | Toast + Retry option |

### 6.2 Toast vs Modal

| Typ błędu | Komponent | Blokujący? |
|-----------|-----------|------------|
| Walidacja formularza | Inline error | Nie |
| Błąd sieci | Toast | Nie |
| Błąd AI | Toast | Nie |
| Sesja wygasła | Toast + Redirect | Tak |
| Usuwanie zasobu | ConfirmDialog | Tak |

### 6.3 Loading states

| Operacja | Wskaźnik |
|----------|----------|
| Ładowanie list | Skeleton w sidebar |
| Ładowanie zadań | Skeleton cards |
| Infinite scroll | Skeleton na dole |
| Sugestia AI | Placeholder card z spinner |
| Zapisywanie | Button disabled + spinner |
| Reordering | Optimistic (brak loadera) |

---

## 7. Integracja z API

### 7.1 Mapowanie komponentów na endpointy

| Komponent | Metoda | Endpoint |
|-----------|--------|----------|
| `Sidebar` (load) | GET | `/api/lists` |
| `ListInlineInput` (create) | POST | `/api/lists` |
| `ListItem` (update) | PATCH | `/api/lists/:id` |
| `ListItem` (delete) | DELETE | `/api/lists/:id` |
| `TaskList` (load) | GET | `/api/lists/:listId/tasks` |
| `TaskQuickAdd` (create) | POST | `/api/lists/:listId/tasks` |
| `TaskModal` (create) | POST | `/api/lists/:listId/tasks` |
| `TaskModal` (update) | PATCH | `/api/tasks/:id` |
| `TaskCard` (status change) | PATCH | `/api/tasks/:id` |
| `TaskCard` (delete) | DELETE | `/api/tasks/:id` |
| `TaskList` (reorder) | POST | `/api/lists/:listId/tasks/reorder` |
| `AISuggestionPanel` (request) | POST | `/api/ai/suggest` |
| `AISuggestionPanel` (decision) | PATCH | `/api/ai-interactions/:id` |
| `OnboardingWizard` (complete) | POST | `/api/profile/onboarding/complete` |
| `Sidebar` (set active) | PATCH | `/api/profile` |

### 7.2 Strategia cache i invalidacji

| Zasób | Cache | Invalidacja |
|-------|-------|-------------|
| Listy | W pamięci sesji | Po CRUD list |
| Zadania | W pamięci sesji | Po CRUD zadań, reorder |
| Profil | W pamięci sesji | Po PATCH profile |

### 7.3 Optimistic updates

| Operacja | Rollback przy błędzie |
|----------|----------------------|
| Reorder tasks | Przywróć poprzednią kolejność |
| Status change | Przywróć poprzedni status |
| Delete task | Przywróć zadanie (undo toast) |

---

## 8. Dostępność (a11y)

### 8.1 ARIA Landmarks

```html
<header role="banner">...</header>
<nav role="navigation" aria-label="Listy zadań">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
```

### 8.2 Priorytety - multi-modal

| Priorytet | Kolor | Ikona | Tekst |
|-----------|-------|-------|-------|
| Niski | `green-500` | ↓ (ArrowDown) | "Niski" |
| Średni | `yellow-500` | — (Minus) | "Średni" |
| Wysoki | `red-500` | ↑ (ArrowUp) | "Wysoki" |

### 8.3 Focus management

- Focus trap w modalach (`Dialog` z Shadcn)
- `tabindex` dla drag handles
- Visible focus indicators (`:focus-visible`)
- Skip links (opcjonalnie)

### 8.4 Formularze

- `aria-invalid="true"` dla błędnych pól
- `aria-describedby` łączące pola z komunikatami błędów
- `aria-required="true"` dla wymaganych pól
- `aria-live="polite"` dla dynamicznych komunikatów

---

## 9. Paleta kolorów i stylowanie

### 9.1 Paleta

| Element | Kolor Tailwind | Hex |
|---------|----------------|-----|
| Background | `gray-50` | #F9FAFB |
| Surface | `white` | #FFFFFF |
| Primary | `blue-600` | #2563EB |
| Text primary | `gray-900` | #111827 |
| Text secondary | `gray-600` | #4B5563 |
| Priority Low | `green-500` | #22C55E |
| Priority Medium | `yellow-500` | #EAB308 |
| Priority High | `red-500` | #EF4444 |
| Status Done | `green-600` | #16A34A |
| Border | `gray-200` | #E5E7EB |

### 9.2 Wymiary

| Element | Wartość |
|---------|---------|
| Header height | 64px |
| Sidebar width | 250px |
| Max content width | 1200px |
| Task card padding | 16px |
| Border radius | 8px |

---

## 10. Powiązanie z User Stories

| US | Nazwa | Widok/Komponent |
|----|-------|-----------------|
| US-001 | Rejestracja | `/register`, `RegisterForm` |
| US-002 | Logowanie | `/login`, `LoginForm` |
| US-003 | Bezpieczny dostęp | Middleware, RLS |
| US-004 | Wylogowanie | `UserMenu` |
| US-005 | Utworzenie listy | `Sidebar`, `ListInlineInput` |
| US-006 | Przegląd list | `Sidebar`, `ListItem` |
| US-007 | Zmiana nazwy listy | `ListItem` (inline edit) |
| US-008 | Usunięcie listy | `ListItem`, `ConfirmDialog` |
| US-009 | Dodanie zadania | `TaskQuickAdd`, `TaskModal` |
| US-010 | Edycja zadania | `TaskModal` |
| US-011 | Usunięcie zadania | `TaskCard`, `ConfirmDialog` |
| US-012 | Oznaczenie jako zrobione | `TaskCard` checkbox |
| US-013 | Przywrócenie do todo | `TaskCard` checkbox |
| US-014 | Ukrywanie zrobionych | `FilterToolbar`, URL params |
| US-015 | Filtr zrobionych | `FilterToolbar` toggle |
| US-016 | Sortowanie po priorytecie | `FilterToolbar`, `TaskGroup` |
| US-017 | Ręczne porządkowanie | `TaskList` drag & drop |
| US-018 | Ręczna zmiana priorytetu | `TaskModal`, `PrioritySelector` |
| US-019 | Sugestia AI | `AISuggestionButton`, `AISuggestionPanel` |
| US-020 | Akceptacja sugestii | `AISuggestionResult` |
| US-021 | Modyfikacja sugestii | `AISuggestionResult` |
| US-022 | Odrzucenie sugestii | `AISuggestionRejectionForm` |
| US-023 | Rejestrowanie AI | Backend API |
| US-024 | Onboarding | `OnboardingWizard` |
| US-025 | Powrót do onboardingu | `UserMenu` |
| US-026 | Stan pusty | `EmptyState` (warianty) |
| US-027 | Błędy walidacji | Inline form errors |
| US-028 | Błędy sieci/serwera | `Toast`, error handling |
| US-029 | Spójność danych | Optimistic UI + rollback |