# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard to główny widok aplikacji AI Task Manager, służący jako centralny interfejs do zarządzania listami i zadaniami użytkownika. Widok prezentuje układ master-detail z sidebar zawierającym listy użytkownika oraz głównym obszarem wyświetlającym zadania aktywnej listy. Dashboard wymaga autentykacji i zapewnia pełną funkcjonalność przeglądania list, przełączania kontekstu, filtrowania zadań oraz obsługi stanów pustych. Dodatkowo, dla nowych użytkowników wyświetla wizard onboardingowy.

## 2. Routing widoku

- **Ścieżka**: `/app`
- **Typ**: Widok chroniony (wymaga autentykacji)
- **Przekierowania**:
  - Brak sesji → `/login`
  - Błąd 401 z API → `/login`

## 3. Struktura komponentów

```
src/pages/app.astro (Astro page)
└── DashboardLayout.astro (Astro layout)
    ├── Header.tsx (React, client:load)
    │   ├── Logo
    │   └── UserMenu
    │       └── LogoutButton
    ├── Sidebar.tsx (React, client:load)
    │   ├── SidebarHeader
    │   │   └── CreateListButton
    │   ├── ListItem[] (dla każdej listy)
    │   │   ├── ListItemView (tryb wyświetlania)
    │   │   └── ListItemEdit (tryb edycji)
    │   └── EmptyState (wariant: no-lists)
    └── MainContent.tsx (React, client:load)
        ├── OnboardingWizard (warunkowo)
        ├── ListHeader
        │   └── ActiveListName
        ├── FilterToolbar
        │   ├── SearchInput
        │   ├── StatusFilter
        │   └── SortSelector
        ├── TaskList
        │   ├── PriorityGroup (High)
        │   │   └── TaskCard[]
        │   ├── PriorityGroup (Medium)
        │   │   └── TaskCard[]
        │   └── PriorityGroup (Low)
        │       └── TaskCard[]
        ├── InlineTaskInput
        ├── LoadMoreTrigger (infinite scroll)
        └── EmptyState (wariant: no-tasks)
```

## 4. Szczegóły komponentów

### 4.1. DashboardLayout.astro

- **Opis**: Layout Astro definiujący strukturę master-detail z trzema głównymi obszarami: header, sidebar i main content. Odpowiada za server-side sprawdzenie autentykacji i przekazanie początkowych danych do komponentów React.
- **Główne elementy**:
  - `<header>` - nawigacja główna z landmark `role="banner"`
  - `<aside>` - sidebar z listami, landmark `role="complementary"`
  - `<main>` - główna zawartość z zadaniami, landmark `role="main"`
  - Skip link do głównej treści
- **Obsługiwane interakcje**: Brak (statyczny layout)
- **Obsługiwana walidacja**: Sprawdzenie sesji użytkownika (server-side)
- **Typy**: `LayoutProps` (title, initialProfile, initialLists)
- **Propsy**:
  ```typescript
  interface DashboardLayoutProps {
    title?: string;
  }
  ```

### 4.2. Header.tsx

- **Opis**: Komponent nagłówka aplikacji zawierający logo, nazwę aplikacji oraz menu użytkownika z opcją wylogowania. Wyświetla również aktualnie zalogowanego użytkownika.
- **Główne elementy**:
  - `<nav>` z logo aplikacji (link do `/app`)
  - Nazwa aplikacji "AI Task Manager"
  - `UserMenu` dropdown z email użytkownika i przyciskiem wylogowania
- **Obsługiwane interakcje**:
  - Kliknięcie logo → nawigacja do `/app`
  - Kliknięcie user menu → toggle dropdown
  - Kliknięcie "Wyloguj" → wywołanie logout, przekierowanie do `/login`
- **Obsługiwana walidacja**: Brak
- **Typy**: `UserInfo`
- **Propsy**:
  ```typescript
  interface HeaderProps {
    userEmail: string;
    onLogout: () => void;
  }
  ```

### 4.3. Sidebar.tsx

- **Opis**: Panel boczny wyświetlający wszystkie listy użytkownika z możliwością CRUD inline. Aktywna lista jest wizualnie wyróżniona. Umożliwia tworzenie, edycję nazwy i usuwanie list.
- **Główne elementy**:
  - `SidebarHeader` z tytułem "Moje listy" i przyciskiem dodawania
  - Lista komponentów `ListItem` dla każdej listy
  - `EmptyState` gdy brak list
- **Obsługiwane interakcje**:
  - Kliknięcie listy → zmiana aktywnej listy (PATCH /api/profile)
  - Kliknięcie "+" → dodanie nowej listy (inline input)
  - Kliknięcie ikony edycji → tryb edycji nazwy
  - Kliknięcie ikony usuwania → potwierdzenie i usunięcie
  - Enter w input → zatwierdzenie nazwy
  - Escape w input → anulowanie edycji
- **Obsługiwana walidacja**:
  - Nazwa listy: wymagana, 1-100 znaków
  - Unikalna nazwa w ramach użytkownika (błąd z API)
- **Typy**: `ListDTO[]`, `ListItemViewModel`, `CreateListCommand`
- **Propsy**:
  ```typescript
  interface SidebarProps {
    lists: ListDTO[];
    activeListId: string | null;
    onSelectList: (listId: string) => void;
    onCreateList: (name: string) => Promise<void>;
    onUpdateList: (id: string, name: string) => Promise<void>;
    onDeleteList: (id: string) => Promise<void>;
    isLoading: boolean;
  }
  ```

### 4.4. ListItem.tsx

- **Opis**: Pojedynczy element listy w sidebar z dwoma trybami: wyświetlania i edycji. Wyświetla nazwę listy, wskaźnik aktywności oraz przyciski akcji.
- **Główne elementy**:
  - Tryb wyświetlania: nazwa listy, ikony edit/delete
  - Tryb edycji: input z nazwą, przyciski save/cancel
  - Wizualne wyróżnienie aktywnej listy (background, border)
- **Obsługiwane interakcje**:
  - Kliknięcie elementu → wybór listy
  - Kliknięcie edit → przejście do trybu edycji
  - Kliknięcie delete → dialog potwierdzenia → usunięcie
  - Blur/Enter w input → zapis zmian
  - Escape → anulowanie edycji
- **Obsługiwana walidacja**:
  - Nazwa niepusta
  - Nazwa max 100 znaków
- **Typy**: `ListDTO`, `ListItemViewModel`
- **Propsy**:
  ```typescript
  interface ListItemProps {
    list: ListDTO;
    isActive: boolean;
    onSelect: () => void;
    onUpdate: (name: string) => Promise<void>;
    onDelete: () => Promise<void>;
  }
  ```

### 4.5. MainContent.tsx

- **Opis**: Główny kontener dla zawartości dashboardu. Orkiestruje wyświetlanie zadań, filtrów, formularza dodawania oraz stanów pustych. Zarządza stanem filtrów i infinite scroll.
- **Główne elementy**:
  - `OnboardingWizard` (overlay, warunkowo)
  - `ListHeader` z nazwą aktywnej listy
  - `FilterToolbar`
  - `TaskList` z grupowaniem po priorytetach
  - `InlineTaskInput`
  - `EmptyState` (no-tasks)
  - `LoadMoreTrigger` (intersection observer)
- **Obsługiwane interakcje**:
  - Zmiana filtrów → przeładowanie zadań
  - Scroll do końca → załadowanie kolejnej porcji (50 zadań)
  - Dodanie zadania → optimistic update
- **Obsługiwana walidacja**: Delegowana do komponentów dzieci
- **Typy**: `TaskDTO[]`, `TasksResponseDTO`, `TaskFilterState`, `TasksByPriority`
- **Propsy**:
  ```typescript
  interface MainContentProps {
    activeList: ListDTO | null;
    showOnboarding: boolean;
    onCompleteOnboarding: () => void;
  }
  ```

### 4.6. FilterToolbar.tsx

- **Opis**: Pasek narzędzi do filtrowania i sortowania zadań. Zawiera wyszukiwarkę, filtr statusu (todo/done) oraz wybór sortowania.
- **Główne elementy**:
  - `SearchInput` z debounce 300ms
  - `StatusFilter` - toggle/switch (todo domyślnie)
  - `SortSelector` - dropdown (priority/sort_order/created_at)
- **Obsługiwane interakcje**:
  - Wpisanie w search → debounced update filtra search
  - Kliknięcie statusu → toggle między todo/all
  - Wybór sortowania → update filtra sort
- **Obsługiwana walidacja**: Brak (wszystkie wartości są opcjonalne)
- **Typy**: `TaskFilterState`
- **Propsy**:
  ```typescript
  interface FilterToolbarProps {
    filters: TaskFilterState;
    onFiltersChange: (filters: Partial<TaskFilterState>) => void;
  }
  ```

### 4.7. TaskList.tsx

- **Opis**: Lista zadań pogrupowanych według priorytetu (Wysoki → Średni → Niski). Każda grupa wyświetla nagłówek z nazwą priorytetu i liczbą zadań.
- **Główne elementy**:
  - `PriorityGroup` dla każdego priorytetu (3, 2, 1)
  - Nagłówek grupy z badge liczby zadań
  - Lista `TaskCard` w każdej grupie
  - Skeleton loaders podczas ładowania
- **Obsługiwane interakcje**:
  - Kliknięcie zadania → otwarcie szczegółów (przyszła funkcjonalność)
  - Toggle checkbox → zmiana statusu
- **Obsługiwana walidacja**: Brak
- **Typy**: `TaskDTO[]`, `TasksByPriority`
- **Propsy**:
  ```typescript
  interface TaskListProps {
    tasksByPriority: TasksByPriority;
    isLoading: boolean;
    onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  }
  ```

### 4.8. TaskCard.tsx

- **Opis**: Karta pojedynczego zadania wyświetlająca tytuł, opis (skrócony), priorytet (badge kolorowy) oraz checkbox statusu.
- **Główne elementy**:
  - Checkbox statusu (todo/done)
  - Tytuł zadania
  - Opis (max 2 linie, truncated)
  - Badge priorytetu (kolor: czerwony/żółty/szary)
  - Data utworzenia (relatywna, np. "2 dni temu")
- **Obsługiwane interakcje**:
  - Kliknięcie checkbox → toggle statusu (optimistic update)
  - Kliknięcie karty → (przyszłe: otwarcie edycji)
- **Obsługiwana walidacja**: Brak
- **Typy**: `TaskDTO`
- **Propsy**:
  ```typescript
  interface TaskCardProps {
    task: TaskDTO;
    onStatusChange: (status: TaskStatus) => void;
  }
  ```

### 4.9. InlineTaskInput.tsx

- **Opis**: Formularz szybkiego dodawania zadania z polami na tytuł, opis i priorytet. Widoczny na dole listy zadań.
- **Główne elementy**:
  - Input tytułu (wymagany)
  - Textarea opisu (opcjonalny)
  - Selector priorytetu (wymagany, domyślnie Medium)
  - Przyciski "Dodaj" i "Anuluj"
- **Obsługiwane interakcje**:
  - Wpisanie tytułu → walidacja na blur
  - Wybór priorytetu → update stanu
  - Submit → walidacja → POST → optimistic update → reset
  - Anuluj → reset formularza
  - Enter w tytule → submit (jeśli walidacja OK)
- **Obsługiwana walidacja**:
  - Tytuł: wymagany, 1-200 znaków
  - Priorytet: wymagany, wartość 1/2/3
  - Opis: opcjonalny, max 2000 znaków
- **Typy**: `CreateTaskCommand`, `TaskPriority`
- **Propsy**:
  ```typescript
  interface InlineTaskInputProps {
    listId: string;
    onSubmit: (command: CreateTaskCommand) => Promise<void>;
    isSubmitting: boolean;
  }
  ```

### 4.10. EmptyState.tsx

- **Opis**: Komponent stanów pustych z komunikatem i akcją CTA. Dwa warianty: brak list i brak zadań.
- **Główne elementy**:
  - Ikona ilustracyjna
  - Nagłówek (h2)
  - Opis pomocniczy
  - Przycisk akcji (CTA)
- **Obsługiwane interakcje**:
  - Kliknięcie CTA → wywołanie odpowiedniej akcji
- **Obsługiwana walidacja**: Brak
- **Typy**: `EmptyStateType`
- **Propsy**:
  ```typescript
  interface EmptyStateProps {
    type: 'no-lists' | 'no-tasks';
    onAction: () => void;
  }
  ```

### 4.11. OnboardingWizard.tsx

- **Opis**: 3-krokowy wizard onboardingowy wyświetlany jako overlay dla nowych użytkowników. Wyjaśnia model priorytetów i rolę AI.
- **Główne elementy**:
  - Overlay z backdrop
  - Krokowy wizard (3 kroki)
  - Krok 1: Wprowadzenie do priorytetów
  - Krok 2: Wyjaśnienie sortowania
  - Krok 3: Rola AI jako sugestii
  - Przyciski nawigacji (Dalej/Wstecz/Zakończ)
  - Przycisk "Pomiń"
- **Obsługiwane interakcje**:
  - Dalej → następny krok
  - Wstecz → poprzedni krok
  - Zakończ → POST onboarding complete → zamknięcie
  - Pomiń → POST onboarding complete → zamknięcie
- **Obsługiwana walidacja**: Brak
- **Typy**: `OnboardingStep`, `CompleteOnboardingCommand`
- **Propsy**:
  ```typescript
  interface OnboardingWizardProps {
    onComplete: () => void;
    onSkip: () => void;
  }
  ```

## 5. Typy

### 5.1. Istniejące typy (z src/types.ts)

```typescript
// Profil użytkownika
interface ProfileDTO {
  id: string;
  activeListId: string | null;
  onboardingCompletedAt: string | null;
  onboardingVersion: number;
  createdAt: string;
  updatedAt: string;
}

// Lista zadań
interface ListDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Odpowiedź z listami
interface ListsResponseDTO {
  data: ListDTO[];
  pagination: PaginationDTO;
}

// Zadanie
interface TaskDTO {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  sortOrder: number;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Odpowiedź z zadaniami
interface TasksResponseDTO {
  data: TaskDTO[];
  pagination: PaginationDTO;
}

// Paginacja
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}

// Priorytet zadania: 1=niski, 2=średni, 3=wysoki
type TaskPriority = 1 | 2 | 3;

// Status zadania: 1=todo, 2=done
type TaskStatus = 1 | 2;

// Komenda aktualizacji profilu
interface UpdateProfileCommand {
  activeListId: string | null;
}

// Komenda tworzenia zadania
interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority: TaskPriority;
}

// Komenda tworzenia listy
interface CreateListCommand {
  name: string;
}

// Komenda aktualizacji listy
interface UpdateListCommand {
  name: string;
}
```

### 5.2. Nowe typy ViewModels (do utworzenia)

```typescript
// src/components/dashboard/types.ts

/**
 * Stan filtrów dla listy zadań
 */
interface TaskFilterState {
  status: TaskStatus | null; // null = wszystkie, 1 = todo, 2 = done
  priority: TaskPriority | null; // null = wszystkie priorytety
  search: string;
  sort: 'priority' | 'sort_order' | 'created_at';
  order: 'asc' | 'desc';
}

/**
 * Domyślne wartości filtrów
 */
const DEFAULT_FILTER_STATE: TaskFilterState = {
  status: 1, // domyślnie tylko todo
  priority: null,
  search: '',
  sort: 'priority',
  order: 'desc',
};

/**
 * Zadania pogrupowane według priorytetu
 */
interface TasksByPriority {
  high: TaskDTO[];   // priority = 3
  medium: TaskDTO[]; // priority = 2
  low: TaskDTO[];    // priority = 1
}

/**
 * ViewModel dla elementu listy w sidebar z trybem edycji
 */
interface ListItemViewModel extends ListDTO {
  isEditing: boolean;
  editName: string;
  isDeleting: boolean;
}

/**
 * Typ stanu pustego
 */
type EmptyStateType = 'no-lists' | 'no-tasks';

/**
 * Konfiguracja stanu pustego
 */
interface EmptyStateConfig {
  type: EmptyStateType;
  title: string;
  description: string;
  actionLabel: string;
}

/**
 * Krok onboardingu
 */
interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  illustration?: string;
}

/**
 * Stan dashboardu
 */
interface DashboardState {
  profile: ProfileDTO | null;
  lists: ListDTO[];
  tasks: TaskDTO[];
  activeListId: string | null;
  filters: TaskFilterState;
  isLoadingProfile: boolean;
  isLoadingLists: boolean;
  isLoadingTasks: boolean;
  hasMoreTasks: boolean;
  error: string | null;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom Hook: useDashboard

Główny hook zarządzający stanem dashboardu, integrujący profil i listy.

```typescript
// src/components/dashboard/hooks/useDashboard.ts

interface UseDashboardReturn {
  // Stan
  profile: ProfileDTO | null;
  lists: ListDTO[];
  activeList: ListDTO | null;
  isLoadingProfile: boolean;
  isLoadingLists: boolean;
  error: string | null;

  // Akcje
  setActiveList: (listId: string) => Promise<void>;
  createList: (name: string) => Promise<ListDTO>;
  updateList: (id: string, name: string) => Promise<ListDTO>;
  deleteList: (id: string) => Promise<void>;
  refreshLists: () => Promise<void>;
}

function useDashboard(): UseDashboardReturn {
  // Implementacja z useState, useEffect, useCallback
  // Fetch profilu przy mount
  // Fetch list przy mount
  // Optimistic updates dla CRUD list
}
```

### 6.2. Custom Hook: useTasks

Hook zarządzający zadaniami dla aktywnej listy z filtrowaniem i paginacją.

```typescript
// src/components/dashboard/hooks/useTasks.ts

interface UseTasksReturn {
  // Stan
  tasks: TaskDTO[];
  tasksByPriority: TasksByPriority;
  filters: TaskFilterState;
  isLoading: boolean;
  hasMore: boolean;
  pagination: PaginationDTO | null;
  error: string | null;

  // Akcje
  setFilters: (filters: Partial<TaskFilterState>) => void;
  loadMore: () => Promise<void>;
  createTask: (command: CreateTaskCommand) => Promise<TaskDTO>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

function useTasks(listId: string | null): UseTasksReturn {
  // Implementacja z useState, useEffect, useCallback
  // Fetch zadań gdy zmieni się listId lub filters
  // Grupowanie zadań po priorytecie (useMemo)
  // Infinite scroll z offset
}
```

### 6.3. Custom Hook: useInfiniteScroll

Hook do obsługi infinite scroll z Intersection Observer.

```typescript
// src/components/dashboard/hooks/useInfiniteScroll.ts

interface UseInfiniteScrollReturn {
  triggerRef: React.RefObject<HTMLDivElement>;
  isIntersecting: boolean;
}

function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean
): UseInfiniteScrollReturn {
  // Implementacja z useRef, useEffect, IntersectionObserver
}
```

### 6.4. Przepływ danych

1. `app.astro` sprawdza sesję server-side
2. `DashboardLayout` renderuje strukturę z React komponentami
3. `useDashboard` hook inicjalizuje fetch profilu i list
4. Po wybraniu aktywnej listy, `useTasks` fetch'uje zadania
5. Filtry i sortowanie trigger'ują re-fetch z nowymi parametrami
6. Infinite scroll ładuje kolejne porcje (50 zadań)

## 7. Integracja API

### 7.1. GET /api/profile

- **Cel**: Pobranie profilu użytkownika z activeListId
- **Wywołanie**: Przy inicjalizacji dashboardu
- **Request**: Brak body
- **Response**: `ProfileDTO`
- **Obsługa błędów**:
  - 401 → przekierowanie do `/login`
  - 404 → wyświetlenie błędu (nie powinno wystąpić)

### 7.2. PATCH /api/profile

- **Cel**: Aktualizacja aktywnej listy
- **Wywołanie**: Przy kliknięciu listy w sidebar
- **Request**: `UpdateProfileCommand` (`{ activeListId: string | null }`)
- **Response**: `ProfileDTO`
- **Obsługa błędów**:
  - 400 (invalid list) → toast z błędem
  - 401 → przekierowanie do `/login`

### 7.3. GET /api/lists

- **Cel**: Pobranie wszystkich list użytkownika
- **Wywołanie**: Przy inicjalizacji dashboardu
- **Query params**: `?limit=100&offset=0`
- **Response**: `ListsResponseDTO`
- **Obsługa błędów**:
  - 401 → przekierowanie do `/login`

### 7.4. GET /api/lists/:listId/tasks

- **Cel**: Pobranie zadań dla aktywnej listy
- **Wywołanie**: Przy zmianie aktywnej listy lub filtrów
- **Query params**:
  ```
  ?status=1           // domyślnie todo
  &sort=priority      // domyślne sortowanie
  &order=desc         // malejąco (high → low)
  &limit=50           // porcja dla infinite scroll
  &offset=0           // paginacja
  &search=...         // opcjonalne wyszukiwanie
  ```
- **Response**: `TasksResponseDTO`
- **Obsługa błędów**:
  - 401 → przekierowanie do `/login`
  - 404 → wyświetlenie stanu pustego, reset activeListId

### 7.5. Klient API

```typescript
// src/lib/api/dashboard.api.ts

export async function fetchProfile(): Promise<ProfileDTO> {
  const response = await fetch('/api/profile');
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new ApiError('Failed to fetch profile');
  }
  return response.json();
}

export async function updateActiveList(listId: string | null): Promise<ProfileDTO> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeListId: listId }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    if (response.status === 400) throw new ValidationError('Invalid list');
    throw new ApiError('Failed to update profile');
  }
  return response.json();
}

export async function fetchLists(params?: { limit?: number; offset?: number }): Promise<ListsResponseDTO> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const response = await fetch(`/api/lists?${searchParams}`);
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new ApiError('Failed to fetch lists');
  }
  return response.json();
}

export async function fetchTasks(
  listId: string,
  params: TaskFilterState & { limit: number; offset: number }
): Promise<TasksResponseDTO> {
  const searchParams = new URLSearchParams();
  if (params.status !== null) searchParams.set('status', String(params.status));
  if (params.priority !== null) searchParams.set('priority', String(params.priority));
  if (params.search) searchParams.set('search', params.search);
  searchParams.set('sort', params.sort);
  searchParams.set('order', params.order);
  searchParams.set('limit', String(params.limit));
  searchParams.set('offset', String(params.offset));

  const response = await fetch(`/api/lists/${listId}/tasks?${searchParams}`);
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    if (response.status === 404) throw new NotFoundError('List not found');
    throw new ApiError('Failed to fetch tasks');
  }
  return response.json();
}
```

## 8. Interakcje użytkownika

### 8.1. Nawigacja między listami

1. Użytkownik klika listę w sidebar
2. System wywołuje `PATCH /api/profile` z nowym `activeListId`
3. Optimistic update: natychmiastowe wyróżnienie wybranej listy
4. System wywołuje `GET /api/lists/:listId/tasks`
5. TaskList aktualizuje się z nowymi zadaniami
6. W przypadku błędu: rollback + toast z komunikatem

### 8.2. Filtrowanie zadań

1. Użytkownik zmienia filtr statusu (toggle "Pokaż zrobione")
2. System aktualizuje `TaskFilterState.status`
3. Debounce 300ms (dla search)
4. System wywołuje `GET /api/lists/:listId/tasks` z nowymi parametrami
5. Skeleton loader podczas ładowania
6. TaskList aktualizuje się z przefiltrowanymi zadaniami

### 8.3. Wyszukiwanie zadań

1. Użytkownik wpisuje frazę w SearchInput
2. Debounce 300ms
3. System aktualizuje `TaskFilterState.search`
4. Fetch z `?search=...`
5. Wyniki wyświetlane w TaskList

### 8.4. Infinite scroll

1. Użytkownik scrolluje do końca listy
2. IntersectionObserver wykrywa LoadMoreTrigger
3. Jeśli `hasMore === true`, fetch kolejnych 50 zadań
4. Nowe zadania dołączane do istniejących
5. Grupowanie po priorytetach przeliczane

### 8.5. Dodawanie zadania

1. Użytkownik wypełnia InlineTaskInput
2. Walidacja: tytuł wymagany, priorytet wymagany
3. Submit → `POST /api/lists/:listId/tasks`
4. Optimistic update: zadanie pojawia się w odpowiedniej grupie
5. Reset formularza
6. W przypadku błędu: rollback + toast

### 8.6. Zmiana statusu zadania

1. Użytkownik klika checkbox w TaskCard
2. Optimistic update: wizualna zmiana checkbox
3. `PATCH /api/tasks/:id` z nowym statusem
4. Jeśli filtr ukrywa done: zadanie znika z listy
5. W przypadku błędu: rollback + toast

### 8.7. CRUD listy

**Tworzenie:**
1. Kliknięcie "+" w sidebar header
2. Pojawia się inline input
3. Wpisanie nazwy + Enter lub blur
4. Walidacja: niepusta, max 100 znaków
5. `POST /api/lists` → nowa lista w sidebar
6. Automatyczne ustawienie jako aktywna

**Edycja:**
1. Kliknięcie ikony edycji przy liście
2. Input z aktualną nazwą
3. Zmiana + Enter/blur
4. `PATCH /api/lists/:id`

**Usuwanie:**
1. Kliknięcie ikony usuwania
2. Dialog potwierdzenia
3. `DELETE /api/lists/:id`
4. Jeśli usunięta lista była aktywna → wybór innej lub stan pusty

## 9. Warunki i walidacja

### 9.1. Walidacja formularza dodawania zadania (InlineTaskInput)

| Pole | Warunek | Komunikat błędu | Wpływ na UI |
|------|---------|-----------------|-------------|
| title | Wymagane | "Tytuł jest wymagany" | Czerwona ramka, tekst pod inputem |
| title | Min 1 znak | "Tytuł jest wymagany" | j.w. |
| title | Max 200 znaków | "Tytuł może mieć max 200 znaków" | j.w. |
| priority | Wymagane | "Wybierz priorytet" | Podświetlenie selectora |
| description | Max 2000 znaków | "Opis może mieć max 2000 znaków" | Czerwona ramka textarea |

### 9.2. Walidacja formularza listy (Sidebar)

| Pole | Warunek | Komunikat błędu | Wpływ na UI |
|------|---------|-----------------|-------------|
| name | Wymagane | "Nazwa listy jest wymagana" | Input z czerwoną ramką |
| name | Min 1 znak | "Nazwa listy jest wymagana" | j.w. |
| name | Max 100 znaków | "Nazwa może mieć max 100 znaków" | j.w. |
| name | Unikalna (z API) | "Lista o tej nazwie już istnieje" | Toast + input error |

### 9.3. Warunki wyświetlania stanów pustych

| Warunek | Wyświetlany komponent | Akcja |
|---------|----------------------|-------|
| `lists.length === 0` | EmptyState (no-lists) | "Utwórz pierwszą listę" |
| `activeListId && tasks.length === 0` | EmptyState (no-tasks) | "Dodaj zadanie" |
| `!activeListId && lists.length > 0` | Instrukcja wyboru | "Wybierz listę z menu" |

### 9.4. Warunki wyświetlania onboardingu

```typescript
const showOnboarding = profile !== null
  && profile.onboardingCompletedAt === null;
```

## 10. Obsługa błędów

### 10.1. Błędy autentykacji (401)

- **Wykrycie**: Response status 401 z dowolnego endpointu
- **Akcja**: Przekierowanie do `/login` z parametrem `?redirect=/app`
- **UX**: Natychmiastowe przekierowanie, bez wyświetlania błędu

### 10.2. Błędy sieciowe

- **Wykrycie**: `fetch` rzuca wyjątek lub `!response.ok` (5xx)
- **Akcja**: Wyświetlenie toast notification z przyciskiem "Ponów"
- **UX**: Zachowanie poprzedniego stanu, możliwość retry
- **Komunikat**: "Wystąpił błąd połączenia. Spróbuj ponownie."

### 10.3. Błędy walidacji (400)

- **Wykrycie**: Response status 400 z `details` w body
- **Akcja**: Wyświetlenie błędów przy odpowiednich polach
- **UX**: Inline error messages, czerwone ramki
- **Implementacja**:
  ```typescript
  interface ApiErrorResponse {
    error: string;
    message: string;
    details?: Record<string, string>;
  }
  ```

### 10.4. Błąd 404 (lista nie znaleziona)

- **Wykrycie**: Response status 404 przy fetch zadań
- **Akcja**: Reset `activeListId`, odświeżenie list
- **UX**: Toast "Lista nie istnieje", powrót do stanu pustego

### 10.5. Błąd duplikacji nazwy listy

- **Wykrycie**: Response 400 z `error: "DUPLICATE_NAME"`
- **Akcja**: Wyświetlenie błędu przy input nazwy
- **UX**: "Lista o tej nazwie już istnieje"

### 10.6. Timeout i slow connection

- **Wykrycie**: Fetch trwa > 5 sekund
- **Akcja**: Wyświetlenie skeleton loaders
- **UX**: Animowane placeholdery zamiast pustych miejsc

### 10.7. Globalny error boundary

```typescript
// src/components/dashboard/ErrorBoundary.tsx
class DashboardErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

## 11. Kroki implementacji

### Faza 1: Struktura i routing

1. Utworzenie pliku `src/pages/app.astro` z podstawową strukturą
2. Utworzenie layoutu `src/layouts/DashboardLayout.astro`
3. Implementacja server-side sprawdzenia autentykacji w `app.astro`
4. Dodanie przekierowania do `/login` przy braku sesji
5. Konfiguracja ARIA landmarks (nav, main, aside)

### Faza 2: Typy i API client

6. Utworzenie pliku `src/components/dashboard/types.ts` z ViewModelami
7. Utworzenie pliku `src/lib/api/dashboard.api.ts` z funkcjami fetch
8. Implementacja obsługi błędów (UnauthorizedError, ApiError, etc.)
9. Testy jednostkowe dla funkcji API

### Faza 3: Custom hooks

10. Implementacja `useDashboard` hook
11. Implementacja `useTasks` hook z filtrowaniem
12. Implementacja `useInfiniteScroll` hook
13. Testy jednostkowe dla hooków

### Faza 4: Komponenty podstawowe

14. Implementacja `Header.tsx` z UserMenu
15. Implementacja `EmptyState.tsx` (oba warianty)
16. Implementacja `Sidebar.tsx` z listą list
17. Implementacja `ListItem.tsx` z trybem edycji

### Faza 5: Komponenty zadań

18. Implementacja `FilterToolbar.tsx` z wyszukiwaniem
19. Implementacja `TaskCard.tsx`
20. Implementacja `TaskList.tsx` z grupowaniem
21. Implementacja `InlineTaskInput.tsx` z walidacją

### Faza 6: Integracja i MainContent

22. Implementacja `MainContent.tsx` orkiestrującego komponenty
23. Integracja infinite scroll
24. Optimistic updates dla operacji CRUD
25. Skeleton loaders podczas ładowania

### Faza 7: Onboarding

26. Implementacja `OnboardingWizard.tsx`
27. Integracja z profilem (onboardingCompletedAt)
28. Endpoint POST /api/profile/onboarding/complete

### Faza 8: Obsługa błędów i edge cases

29. Implementacja `ErrorBoundary.tsx`
30. Toast notifications dla błędów
31. Obsługa 401 z automatycznym przekierowaniem
32. Obsługa stanów offline/slow connection

### Faza 9: Dostępność i UX

33. Audyt ARIA (landmarks, labels, roles)
34. Implementacja skip links
35. Testowanie z screen readerem
36. Animacje i transitions (Tailwind)

### Faza 10: Testy i dokumentacja

37. Testy integracyjne komponentów
38. Testy E2E dla głównych flow
39. Dokumentacja komponentów (Storybook opcjonalnie)
40. Code review i refactoring