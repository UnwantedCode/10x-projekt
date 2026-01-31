# Plan implementacji widoku Modal tworzenia/edycji zadania

## 1. Przegląd

Modal tworzenia/edycji zadania to kluczowy komponent interfejsu użytkownika, który umożliwia pełną obsługę zadań w aplikacji AI Task Manager. Widok ten łączy funkcjonalność formularza CRUD z integracją AI do sugerowania priorytetów.

Modal obsługuje dwa tryby:
- **Tryb tworzenia**: Dodawanie nowego zadania do aktywnej listy
- **Tryb edycji**: Modyfikacja istniejącego zadania

Główną wartością dodaną jest opcjonalna integracja z AI, która analizuje tytuł i opis zadania, sugerując priorytet wraz z uzasadnieniem. Użytkownik ma pełną kontrolę nad sugestią - może ją zaakceptować, zmodyfikować lub odrzucić (z podaniem powodu).

## 2. Routing widoku

Modal nie posiada dedykowanej ścieżki routingu. Jest wywoływany jako overlay z poziomu widoku listy zadań:
- Otwierany przez przycisk "Dodaj zadanie" (tryb tworzenia)
- Otwierany przez kliknięcie/przycisk edycji przy zadaniu (tryb edycji)

Modal wykorzystuje komponent `Dialog` z Shadcn/ui, który renderowany jest w portalu nad główną zawartością strony.

## 3. Struktura komponentów

```
TaskFormDialog
├── Dialog (Shadcn/ui)
│   └── DialogContent
│       ├── DialogHeader
│       │   └── DialogTitle ("Nowe zadanie" / "Edytuj zadanie")
│       ├── TaskForm
│       │   ├── FormField (title)
│       │   │   └── Input
│       │   ├── FormField (description)
│       │   │   └── TextareaWithCounter
│       │   ├── FormField (priority)
│       │   │   └── PrioritySelector
│       │   │       └── RadioGroup
│       │   ├── AISuggestionSection
│       │   │   ├── AISuggestionButton
│       │   │   └── AISuggestionPanel (warunkowy)
│       │   │       ├── PriorityBadge
│       │   │       ├── JustificationText
│       │   │       ├── AcceptButton
│       │   │       ├── ModifyButton + PriorityDropdown
│       │   │       └── RejectButton
│       │   │           └── RejectionReasonInput (warunkowy)
│       │   └── FormErrorSummary
│       └── DialogFooter
│           ├── CancelButton
│           └── SaveButton
```

## 4. Szczegóły komponentów

### TaskFormDialog

- **Opis**: Główny komponent kontenerowy modala. Zarządza stanem otwarcia/zamknięcia, obsługuje focus trap i dostępność. Orchestruje komunikację między formularzem a API.

- **Główne elementy**:
  - `Dialog` - kontener modalny z Shadcn/ui
  - `DialogContent` - wrapper treści z `role="dialog"` i `aria-modal="true"`
  - `DialogHeader` z `DialogTitle` (używany przez `aria-labelledby`)
  - `TaskForm` - formularz z logiką
  - `DialogFooter` - przyciski akcji

- **Obsługiwane interakcje**:
  - Otwarcie modala (przez props `isOpen`)
  - Zamknięcie przez przycisk "Anuluj"
  - Zamknięcie przez klawisz Escape
  - Zamknięcie przez kliknięcie poza modalem
  - Przekazanie focus po zamknięciu do elementu wyzwalającego

- **Obsługiwana walidacja**: Brak bezpośredniej walidacji - delegowana do `TaskForm`

- **Typy**:
  - `TaskFormDialogProps`
  - `TaskDTO` (dla trybu edycji)

- **Propsy**:
  ```typescript
  interface TaskFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (task: TaskDTO) => void;
    task?: TaskDTO;          // undefined = tryb tworzenia
    listId: string;          // wymagane dla tworzenia
  }
  ```

### TaskForm

- **Opis**: Formularz zawierający wszystkie pola zadania oraz sekcję AI. Zarządza stanem formularza, walidacją i submitowaniem.

- **Główne elementy**:
  - Pole `title` - `Input` z walidacją
  - Pole `description` - `TextareaWithCounter`
  - Pole `priority` - `PrioritySelector`
  - Sekcja `AISuggestionSection`
  - `FormErrorSummary` - podsumowanie błędów

- **Obsługiwane interakcje**:
  - Wprowadzanie danych w polach
  - Walidacja on-blur dla tytułu
  - Walidacja on-submit dla wszystkich pól
  - Submit formularza

- **Obsługiwana walidacja**:
  - `title`: wymagany, min 1 znak, max 500 znaków (trimmed)
  - `description`: opcjonalny, max 5000 znaków
  - `priority`: wymagany, wartość 1, 2 lub 3

- **Typy**:
  - `TaskFormState`
  - `TaskFormErrors`
  - `CreateTaskCommand`
  - `UpdateTaskCommand`

- **Propsy**:
  ```typescript
  interface TaskFormProps {
    initialData?: TaskDTO;
    onSubmit: (data: CreateTaskCommand | UpdateTaskCommand) => Promise<void>;
    isSubmitting: boolean;
    onCancel: () => void;
  }
  ```

### PrioritySelector

- **Opis**: Komponent wyboru priorytetu w formie grupy przycisków radiowych. Wyświetla 3 opcje: Niski (1), Średni (2), Wysoki (3).

- **Główne elementy**:
  - `RadioGroup` z Shadcn/ui
  - `RadioGroupItem` dla każdej opcji
  - `Label` dla każdej opcji
  - Wizualne oznaczenie kolorystyczne priorytetów

- **Obsługiwane interakcje**:
  - Wybór priorytetu przez kliknięcie
  - Nawigacja klawiaturą (strzałki)

- **Obsługiwana walidacja**: Brak własnej - walidacja w `TaskForm`

- **Typy**:
  - `TaskPriority`

- **Propsy**:
  ```typescript
  interface PrioritySelectorProps {
    value: TaskPriority | null;
    onChange: (priority: TaskPriority) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### TextareaWithCounter

- **Opis**: Pole tekstowe z licznikiem znaków. Pokazuje aktualną liczbę znaków względem maksymalnego limitu.

- **Główne elementy**:
  - `Textarea` z Shadcn/ui
  - `Label` (opcjonalny)
  - Licznik znaków (`span`)
  - Komunikat błędu (opcjonalny)

- **Obsługiwane interakcje**:
  - Wprowadzanie tekstu
  - Aktualizacja licznika w czasie rzeczywistym

- **Obsługiwana walidacja**: Wizualne ostrzeżenie przy zbliżaniu się do limitu

- **Typy**: Brak niestandardowych

- **Propsy**:
  ```typescript
  interface TextareaWithCounterProps {
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    id?: string;
  }
  ```

### AISuggestionButton

- **Opis**: Przycisk uruchamiający żądanie sugestii AI. Wyświetla stan ładowania podczas oczekiwania na odpowiedź.

- **Główne elementy**:
  - `Button` z Shadcn/ui (wariant secondary)
  - Ikona AI/magii
  - Spinner podczas ładowania
  - Tekst "Zasugeruj priorytet"

- **Obsługiwane interakcje**:
  - Kliknięcie uruchamia żądanie AI
  - Blokada podczas ładowania

- **Obsługiwana walidacja**: Przycisk aktywny tylko gdy tytuł nie jest pusty

- **Typy**: Brak niestandardowych

- **Propsy**:
  ```typescript
  interface AISuggestionButtonProps {
    onClick: () => void;
    isLoading: boolean;
    disabled?: boolean;
  }
  ```

### AISuggestionPanel

- **Opis**: Panel wyświetlający wynik sugestii AI z trzema akcjami: akceptacja, modyfikacja, odrzucenie. Pojawia się po otrzymaniu sugestii.

- **Główne elementy**:
  - Karta/panel z wynikiem
  - Badge z sugerowanym priorytetem
  - Tekst uzasadnienia
  - Tagi uzasadnienia (opcjonalne)
  - Przycisk "Akceptuj" (primary)
  - Przycisk "Modyfikuj" z dropdownem priorytetów
  - Przycisk "Odrzuć" (destructive)
  - Pole powodu odrzucenia (warunkowe)

- **Obsługiwane interakcje**:
  - Kliknięcie "Akceptuj" - ustawia priorytet zgodnie z sugestią
  - Kliknięcie "Modyfikuj" + wybór innego priorytetu
  - Kliknięcie "Odrzuć" - pokazuje pole na powód
  - Wprowadzenie powodu odrzucenia i potwierdzenie

- **Obsługiwana walidacja**:
  - Przy odrzuceniu: powód wymagany, min 1 znak, max 300 znaków

- **Typy**:
  - `AISuggestionDTO`
  - `TaskPriority`
  - `AIDecision`

- **Propsy**:
  ```typescript
  interface AISuggestionPanelProps {
    suggestion: AISuggestionDTO;
    onAccept: () => void;
    onModify: (priority: TaskPriority) => void;
    onReject: (reason: string) => void;
    isProcessing: boolean;
    currentPriority: TaskPriority | null;
  }
  ```

### RejectionReasonInput

- **Opis**: Inline pole tekstowe do wprowadzenia powodu odrzucenia sugestii AI. Pojawia się po kliknięciu "Odrzuć".

- **Główne elementy**:
  - `Input` lub `Textarea`
  - Licznik znaków (max 300)
  - Przycisk "Potwierdź odrzucenie"
  - Przycisk "Anuluj"

- **Obsługiwane interakcje**:
  - Wprowadzanie tekstu
  - Potwierdzenie odrzucenia
  - Anulowanie (ukrycie pola)

- **Obsługiwana walidacja**:
  - Powód wymagany (min 1 znak)
  - Max 300 znaków

- **Typy**: Brak niestandardowych

- **Propsy**:
  ```typescript
  interface RejectionReasonInputProps {
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    isProcessing: boolean;
  }
  ```

## 5. Typy

### Istniejące typy z `src/types.ts`:

```typescript
// Priorytety zadania
type TaskPriority = 1 | 2 | 3;  // 1=Niski, 2=Średni, 3=Wysoki

// Status zadania
type TaskStatus = 1 | 2;  // 1=Do zrobienia, 2=Zrobione

// Decyzja AI
type AIDecision = 1 | 2 | 3;  // 1=Akceptacja, 2=Modyfikacja, 3=Odrzucenie

// DTO zadania
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

// Komendy
interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority: TaskPriority;
}

interface UpdateTaskCommand {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  sortOrder?: number;
}

interface AISuggestCommand {
  taskId: string | null;
  title: string;
  description?: string | null;
}

interface RecordAIDecisionCommand {
  decision: AIDecision;
  finalPriority?: TaskPriority | null;
  rejectedReason?: string | null;
}

// DTO sugestii AI
interface AISuggestionDTO {
  interactionId: string;
  suggestedPriority: number;
  justification: string;
  justificationTags: string[];
  model: string;
  createdAt: string;
}

// DTO interakcji AI
interface AIInteractionDTO {
  id: string;
  taskId: string;
  model: string;
  suggestedPriority: number;
  justification: string | null;
  justificationTags: string[];
  decision: number | null;
  decidedAt: string | null;
  finalPriority: number | null;
  rejectedReason: string | null;
  createdAt: string;
}

// Odpowiedź błędu
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### Nowe typy ViewModels:

```typescript
// Stan formularza zadania
interface TaskFormState {
  title: string;
  description: string;
  priority: TaskPriority | null;
}

// Błędy walidacji formularza
interface TaskFormErrors {
  title?: string;
  description?: string;
  priority?: string;
  general?: string;
}

// Stan sugestii AI
interface AISuggestionState {
  isLoading: boolean;
  suggestion: AISuggestionDTO | null;
  error: string | null;
  isProcessingDecision: boolean;
}

// Stan odrzucenia
interface RejectionState {
  isVisible: boolean;
  reason: string;
  error?: string;
}

// Propsy głównego komponentu
interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (task: TaskDTO) => void;
  task?: TaskDTO;
  listId: string;
}

// Tryb formularza
type FormMode = 'create' | 'edit';
```

## 6. Zarządzanie stanem

### Custom Hook: `useTaskForm`

```typescript
interface UseTaskFormOptions {
  initialTask?: TaskDTO;
  listId: string;
  onSuccess?: (task: TaskDTO) => void;
}

interface UseTaskFormReturn {
  // Stan formularza
  formState: TaskFormState;
  setField: <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => void;

  // Walidacja
  errors: TaskFormErrors;
  validateField: (field: keyof TaskFormState) => boolean;
  validateForm: () => boolean;

  // Submit
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;

  // Reset
  reset: () => void;
  isDirty: boolean;

  // Tryb
  mode: FormMode;
}
```

**Odpowiedzialności:**
- Przechowuje stan formularza (`title`, `description`, `priority`)
- Śledzi błędy walidacji dla każdego pola
- Obsługuje walidację on-blur i on-submit
- Wywołuje odpowiednie API (POST dla tworzenia, PATCH dla edycji)
- Zarządza stanem ładowania podczas submitu
- Śledzi czy formularz został zmieniony (`isDirty`)

### Custom Hook: `useAISuggestion`

```typescript
interface UseAISuggestionOptions {
  taskId?: string;
  onPriorityAccepted?: (priority: TaskPriority) => void;
}

interface UseAISuggestionReturn {
  // Stan sugestii
  suggestion: AISuggestionDTO | null;
  isLoading: boolean;
  error: string | null;

  // Akcje
  requestSuggestion: (title: string, description: string | null) => Promise<void>;
  acceptSuggestion: () => Promise<void>;
  modifySuggestion: (priority: TaskPriority) => Promise<void>;
  rejectSuggestion: (reason: string) => Promise<void>;
  clearSuggestion: () => void;

  // Stan decyzji
  isProcessingDecision: boolean;
}
```

**Odpowiedzialności:**
- Wysyła żądanie do `POST /api/ai/suggest`
- Przechowuje otrzymaną sugestię
- Obsługuje błędy API (503 - serwis niedostępny)
- Rejestruje decyzje użytkownika (`PATCH /api/ai-interactions/:id`)
- Po akceptacji/modyfikacji wywołuje callback do aktualizacji priorytetu w formularzu

### Przepływ stanu:

1. **Otwarcie modala (create)**:
   - `formState` = { title: '', description: '', priority: null }
   - `suggestion` = null

2. **Otwarcie modala (edit)**:
   - `formState` = { title: task.title, description: task.description, priority: task.priority }
   - `suggestion` = null

3. **Żądanie sugestii AI**:
   - Walidacja: tytuł nie może być pusty
   - `isLoading` = true
   - Wywołanie API
   - Sukces: `suggestion` = odpowiedź, `isLoading` = false
   - Błąd: `error` = komunikat, `isLoading` = false

4. **Akceptacja sugestii**:
   - `isProcessingDecision` = true
   - Wywołanie API z `decision: 1`
   - Aktualizacja `formState.priority` = `suggestion.suggestedPriority`
   - `suggestion` = null

5. **Modyfikacja sugestii**:
   - `isProcessingDecision` = true
   - Wywołanie API z `decision: 2`, `finalPriority`
   - Aktualizacja `formState.priority` = wybrany priorytet
   - `suggestion` = null

6. **Odrzucenie sugestii**:
   - Pokazanie pola powodu
   - Walidacja powodu (wymagany, max 300 znaków)
   - `isProcessingDecision` = true
   - Wywołanie API z `decision: 3`, `rejectedReason`
   - `suggestion` = null (priorytet bez zmian)

## 7. Integracja API

### POST /api/lists/:listId/tasks (tworzenie zadania)

**Żądanie:**
```typescript
interface CreateTaskCommand {
  title: string;            // wymagany, 1-500 znaków
  description?: string | null;
  priority: TaskPriority;   // wymagany, 1-3
}
```

**Odpowiedź (201 Created):**
```typescript
TaskDTO
```

**Błędy:**
- `400 Bad Request`: Błąd walidacji (szczegóły w `details`)
- `401 Unauthorized`: Niezalogowany użytkownik
- `404 Not Found`: Lista nie istnieje

### PATCH /api/tasks/:id (edycja zadania)

**Żądanie:**
```typescript
interface UpdateTaskCommand {
  title?: string;           // 1-200 znaków jeśli podany
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  sortOrder?: number;
}
```

**Odpowiedź (200 OK):**
```typescript
TaskDTO
```

**Błędy:**
- `400 Bad Request`: Błąd walidacji
- `401 Unauthorized`: Niezalogowany
- `404 Not Found`: Zadanie nie istnieje
- `409 Conflict`: Konflikt sortOrder

### POST /api/ai/suggest (sugestia AI)

**Żądanie:**
```typescript
interface AISuggestCommand {
  taskId: string | null;    // null dla nowego zadania
  title: string;            // wymagany, 1-200 znaków
  description?: string | null;
}
```

**Odpowiedź (200 OK):**
```typescript
interface AISuggestionDTO {
  interactionId: string;
  suggestedPriority: number;
  justification: string;
  justificationTags: string[];
  model: string;
  createdAt: string;
}
```

**Błędy:**
- `400 Bad Request`: Brak tytułu
- `401 Unauthorized`: Niezalogowany
- `404 Not Found`: Zadanie nie istnieje (gdy taskId podany)
- `503 Service Unavailable`: Błąd serwisu AI

### PATCH /api/ai-interactions/:id (rejestracja decyzji)

**Żądanie:**
```typescript
// Akceptacja
{ decision: 1 }

// Modyfikacja
{ decision: 2, finalPriority: TaskPriority }

// Odrzucenie
{ decision: 3, rejectedReason: string }  // 1-300 znaków
```

**Odpowiedź (200 OK):**
```typescript
AIInteractionDTO
```

**Błędy:**
- `400 Bad Request`: Niespójne pola decyzji
- `401 Unauthorized`: Niezalogowany
- `404 Not Found`: Interakcja nie istnieje
- `409 Conflict`: Decyzja już zarejestrowana

## 8. Interakcje użytkownika

### Przepływ tworzenia zadania:

1. Użytkownik klika "Dodaj zadanie" na liście
2. Modal otwiera się z pustym formularzem
3. Użytkownik wprowadza tytuł (wymagany)
4. Użytkownik opcjonalnie dodaje opis
5. Użytkownik wybiera priorytet LUB klika "Zasugeruj priorytet"
6. Jeśli AI:
   - System wyświetla sugestię z uzasadnieniem
   - Użytkownik akceptuje/modyfikuje/odrzuca
7. Użytkownik klika "Zapisz"
8. System waliduje formularz
9. Sukces: modal zamyka się, lista odświeża się
10. Błąd: wyświetlane są komunikaty walidacji

### Przepływ edycji zadania:

1. Użytkownik klika edycję przy zadaniu
2. Modal otwiera się z wypełnionym formularzem
3. Użytkownik modyfikuje pola
4. Opcjonalnie używa AI do ponownej oceny priorytetu
5. Użytkownik klika "Zapisz"
6. System waliduje i aktualizuje zadanie

### Przepływ sugestii AI:

1. Użytkownik klika "Zasugeruj priorytet"
2. Przycisk pokazuje spinner, jest zablokowany
3. System wysyła tytuł i opis do AI
4. Odpowiedź:
   - Sukces: Panel sugestii pojawia się pod przyciskiem
   - Błąd: Komunikat o niedostępności AI

### Przepływ akceptacji sugestii:

1. Użytkownik klika "Akceptuj" w panelu sugestii
2. System rejestruje decyzję w API
3. Priorytet w formularzu aktualizuje się
4. Panel sugestii znika

### Przepływ modyfikacji sugestii:

1. Użytkownik klika "Modyfikuj" w panelu
2. Rozwija się dropdown z priorytetami (bez sugerowanego)
3. Użytkownik wybiera inny priorytet
4. System rejestruje decyzję z finalPriority
5. Priorytet w formularzu aktualizuje się
6. Panel znika

### Przepływ odrzucenia sugestii:

1. Użytkownik klika "Odrzuć" w panelu
2. Pojawia się pole na powód odrzucenia
3. Użytkownik wprowadza powód (wymagany)
4. Użytkownik potwierdza odrzucenie
5. System rejestruje decyzję z rejectedReason
6. Panel znika, priorytet bez zmian

### Interakcje klawiszowe:

- **Escape**: Zamyka modal (potwierdza jeśli są niezapisane zmiany)
- **Tab**: Nawigacja między polami
- **Enter** (w title): Przechodzi do description
- **Enter** (na przycisku): Aktywuje akcję

## 9. Warunki i walidacja

### Walidacja pola Title:

| Warunek | Komunikat | Moment walidacji |
|---------|-----------|------------------|
| Pusty | "Tytuł jest wymagany" | on-blur, on-submit |
| > 500 znaków | "Tytuł może mieć maksymalnie 500 znaków" | on-change, on-submit |

### Walidacja pola Description:

| Warunek | Komunikat | Moment walidacji |
|---------|-----------|------------------|
| > 5000 znaków | "Opis może mieć maksymalnie 5000 znaków" | on-change, on-submit |

### Walidacja pola Priority:

| Warunek | Komunikat | Moment walidacji |
|---------|-----------|------------------|
| Nie wybrano | "Priorytet jest wymagany" | on-submit |

### Walidacja powodu odrzucenia:

| Warunek | Komunikat | Moment walidacji |
|---------|-----------|------------------|
| Pusty | "Podaj powód odrzucenia sugestii" | on-confirm |
| > 300 znaków | "Powód może mieć maksymalnie 300 znaków" | on-change, on-confirm |

### Warunki aktywności przycisków:

| Przycisk | Warunek aktywności |
|----------|-------------------|
| "Zasugeruj priorytet" | title.trim().length > 0 && !isLoading && !suggestion |
| "Zapisz" | Zawsze aktywny (walidacja przy submit) |
| "Akceptuj" | !isProcessingDecision |
| "Modyfikuj" | !isProcessingDecision |
| "Odrzuć" | !isProcessingDecision |
| "Potwierdź odrzucenie" | reason.trim().length > 0 && reason.length <= 300 |

## 10. Obsługa błędów

### Błędy walidacji (400):

- Wyświetl szczegóły błędów przy odpowiednich polach
- Jeśli `details` zawiera `title`: błąd pod polem tytułu
- Jeśli `details` zawiera `priority`: błąd pod selectorem priorytetu
- Formularz pozostaje otwarty, dane zachowane

### Błąd autoryzacji (401):

- Przekieruj użytkownika do strony logowania
- Opcjonalnie: zachowaj dane formularza w sessionStorage do przywrócenia po zalogowaniu

### Błąd nie znaleziono (404):

- Lista nie istnieje: "Wybrana lista nie istnieje. Odśwież stronę."
- Zadanie nie istnieje: "Zadanie zostało usunięte przez innego użytkownika."
- Zamknij modal, odśwież listę zadań

### Błąd konfliktu (409):

- Decyzja AI już zarejestrowana: "Decyzja została już zapisana."
- Ukryj panel sugestii, kontynuuj z formularzem

### Błąd serwisu AI (503):

- Wyświetl komunikat: "Usługa AI jest chwilowo niedostępna. Możesz ustawić priorytet ręcznie."
- Ukryj przycisk "Zasugeruj" lub pokaż go jako zablokowany z tooltip
- Pozwól na ręczny wybór priorytetu

### Błąd sieci:

- Wyświetl toast/alert: "Wystąpił problem z połączeniem. Sprawdź połączenie internetowe i spróbuj ponownie."
- Zachowaj dane formularza
- Dodaj przycisk "Spróbuj ponownie"

### Nieoczekiwany błąd (500):

- Wyświetl ogólny komunikat: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."
- Loguj szczegóły błędu do konsoli (dla debugowania)
- Zachowaj dane formularza

## 11. Kroki implementacji

### Krok 1: Instalacja wymaganych komponentów Shadcn/ui

```bash
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add radio-group
npx shadcn@latest add label
npx shadcn@latest add alert
```

### Krok 2: Utworzenie typów ViewModels

Plik: `src/components/tasks/types.ts`
- Zdefiniuj `TaskFormState`, `TaskFormErrors`, `AISuggestionState`
- Zdefiniuj propsy komponentów

### Krok 3: Implementacja hooka `useTaskForm`

Plik: `src/components/hooks/useTaskForm.ts`
- Stan formularza z useState
- Funkcje walidacji
- Logika submit z rozróżnieniem create/edit
- Integracja z fetch API

### Krok 4: Implementacja hooka `useAISuggestion`

Plik: `src/components/hooks/useAISuggestion.ts`
- Stan sugestii
- Funkcja `requestSuggestion`
- Funkcje decyzji (accept, modify, reject)
- Obsługa błędów specyficznych dla AI

### Krok 5: Implementacja `TextareaWithCounter`

Plik: `src/components/ui/textarea-with-counter.tsx`
- Wrapper nad Textarea z Shadcn
- Licznik znaków
- Stylowanie ostrzeżenia przy zbliżaniu do limitu

### Krok 6: Implementacja `PrioritySelector`

Plik: `src/components/tasks/PrioritySelector.tsx`
- RadioGroup z trzema opcjami
- Kolorystyczne oznaczenie priorytetów
- Obsługa błędu walidacji

### Krok 7: Implementacja `AISuggestionButton`

Plik: `src/components/tasks/AISuggestionButton.tsx`
- Button z ikoną AI
- Stan ładowania ze spinnerem
- Disabled gdy brak tytułu lub ładowanie

### Krok 8: Implementacja `RejectionReasonInput`

Plik: `src/components/tasks/RejectionReasonInput.tsx`
- Input z licznikiem
- Przyciski potwierdzenia/anulowania
- Walidacja inline

### Krok 9: Implementacja `AISuggestionPanel`

Plik: `src/components/tasks/AISuggestionPanel.tsx`
- Layout panelu z wynikiem
- Trzy przyciski akcji
- Warunkowe wyświetlanie RejectionReasonInput
- Dropdown dla modyfikacji priorytetu

### Krok 10: Implementacja `TaskForm`

Plik: `src/components/tasks/TaskForm.tsx`
- Kompozycja wszystkich pól
- Integracja hooków
- Walidacja on-blur i on-submit
- Sekcja AI

### Krok 11: Implementacja `TaskFormDialog`

Plik: `src/components/tasks/TaskFormDialog.tsx`
- Dialog wrapper
- Zarządzanie focus
- Obsługa zamknięcia
- Tytuł dynamiczny (create/edit)

### Krok 12: Testy jednostkowe

- Testy hooków (useTaskForm, useAISuggestion)
- Testy walidacji
- Testy renderowania komponentów

### Krok 13: Testy integracyjne

- Test pełnego flow tworzenia zadania
- Test pełnego flow edycji zadania
- Test flow AI (sugestia + akceptacja/modyfikacja/odrzucenie)
- Test obsługi błędów

### Krok 14: Testy dostępności

- Weryfikacja focus trap
- Weryfikacja atrybutów ARIA
- Nawigacja klawiaturą
- Test z czytnikiem ekranu

### Krok 15: Integracja z widokiem listy

- Dodanie stanu `isTaskModalOpen` do widoku listy
- Podpięcie callbacka `onSuccess` do odświeżenia listy
- Obsługa otwierania w trybie create/edit