# Plan wdrożenia: modal tworzenia/edycji zadań i edycja w UI

## 1. Cel i zakres

**Cel:** Uzupełnienie brakującej funkcjonalności zadań: modal do tworzenia i edycji zadania (tytuł, opis, priorytet) oraz przycisk edycji przy zadaniu. Obecnie w UI można tylko dodawać zadania (inline) i zmieniać status (checkbox). Backend PATCH jest gotowy, ale nieużywany w komponentach.

**Zakres:**

- **Frontend:** TaskFormDialog, TaskForm, komponenty wspólne (PrioritySelector, TextareaWithCounter), hook useTaskForm, rozszerzenie useTasks o updateTask, przycisk edycji w TaskCard, integracja modala w MainContent.
- **Backend:** Weryfikacja i ewentualne dopasowanie walidacji (limity znaków, spójność create/update), brak nowych endpointów – PATCH `/api/tasks/:id` już istnieje.

**Poza zakresem:** Usunięcie InlineTaskInput (można je zachować jako alternatywę lub później zdecydować). AI suggestions – hook i panele już są; plan zakłada ich użycie w TaskForm.

---

## 2. Zasady i konwencje projektu

Stosować reguły z `.cursor/rules/shared.mdc` i `CLAUDE.md`:

- **Struktura:** `src/components/dashboard/` – komponenty zadań i modala; `src/components/dashboard/hooks/` – useTaskForm, useAISuggestion (istniejący); `src/lib/api/dashboard.api.ts` – API; `src/types.ts` – typy współdzielone.
- **Tech stack:** Astro 5, TypeScript 5, React 19, Tailwind 4, Shadcn/ui.
- **Kod:** Early returns przy błędach, guard clauses, brak zbędnych else, logowanie błędów i czytelne komunikaty dla użytkownika.
- **Astro:** Komponenty React (.tsx) dla interaktywnego UI; modal nie ma własnej ścieżki – overlay z poziomu dashboardu.

---

## 3. Backend – stan i wymagane zmiany

### 3.1 Co jest zaimplementowane

| Element                | Plik                               | Uwagi                                                                                |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| PATCH `/api/tasks/:id` | `src/pages/api/tasks/[id].ts`      | Auth, walidacja params/body, getTaskById, updateTask, 400/401/404/409/500            |
| updateTask (service)   | `src/lib/services/task.service.ts` | Aktualizacja title, description, priority, status, sortOrder; zwraca TaskDTO         |
| updateTaskSchema       | `src/lib/schemas/task.schema.ts`   | Zod: title optional 1–200, description optional, priority 1–3, status 1–2, sortOrder |
| createTaskSchema       | `src/lib/schemas/task.schema.ts`   | title 1–500, description max 5000, priority 1–3                                      |
| UpdateTaskCommand      | `src/types.ts`                     | title?, description?, priority?, status?, sortOrder?                                 |

### 3.2 Do weryfikacji i dopasowania

1. **Spójność limitów title (create vs update)**
   - Create: max **500** znaków.
   - Update: max **200** znaków.  
     **Rekomendacja:** Ujednolicić na **500** w `updateTaskSchema` (tak jak w planie modala i createTaskSchema), żeby edycja nie obcinała tytułu istniejącego zadania.

2. **Opis (description) przy update**
   - Obecnie: `z.string().nullable().optional()` bez max length.  
     **Rekomendacja:** Dodać `.max(5000)` dla spójności z create i planem.

3. **Własność zadania / lista**
   - Endpoint nie weryfikuje, że zadanie należy do użytkownika; prawdopodobnie RLS w Supabase to egzekwuje. W ramach tego planu przyjmujemy, że RLS jest poprawny; w razie wątpliwości – osobna weryfikacja.

**Kroki backend (w ramach tego planu):**

- W `src/lib/schemas/task.schema.ts` w `updateTaskSchema`:
  - `title`: zmienić max z 200 na 500.
  - `description`: dodać `.max(5000)` (i ewentualnie `.trim()` / transform jak w create).

---

## 4. Frontend – brakujące elementy

### 4.1 Architektura

- **TaskFormDialog** – kontener modala (Shadcn Dialog). Otwierany z listy: „Dodaj zadanie” (create) lub „Edytuj” przy zadaniu (edit). Props: `isOpen`, `onClose`, `onSuccess?`, `task?` (undefined = create), `listId` (wymagane przy create).
- **TaskForm** – formularz wewnątrz modala: pola title, description, priority, sekcja AI (AISuggestionButton + AISuggestionPanel), przyciski Anuluj / Zapisz. Stan i walidacja przez **useTaskForm**; AI przez istniejący **useAISuggestion**.
- **useTaskForm** – stan formularza (title, description, priority), walidacja (on-blur tytuł, on-submit wszystkie), submit: create → POST ` /api/lists/:listId/tasks`, edit → PATCH `/api/tasks/:id`. Zwraca m.in. `formState`, `setField`, `errors`, `validateField`, `validateForm`, `handleSubmit`, `isSubmitting`, `reset`, `isDirty`, `mode`.
- **useTasks (rozszerzenie)** – dodać `updateTask(taskId, command)` wywołujące `dashboard.api.updateTask`, po sukcesie aktualizacja listy w stanie (optimistic lub refresh) i wywołanie `onSuccess` jeśli przekazane.

### 4.2 Komponenty do dodania

| Komponent           | Lokalizacja                                     | Odpowiedzialność                                                                                                           |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TaskFormDialog      | `src/components/dashboard/TaskFormDialog.tsx`   | Dialog wrapper, tytuł „Nowe zadanie” / „Edytuj zadanie”, focus trap, przekazanie task/listId/onClose/onSuccess do TaskForm |
| TaskForm            | `src/components/dashboard/TaskForm.tsx`         | Pola + PrioritySelector + sekcja AI + FormErrorSummary; useTaskForm + useAISuggestion; submit create/edit                  |
| PrioritySelector    | `src/components/dashboard/PrioritySelector.tsx` | RadioGroup (1/2/3), etykiety i kolory zgodne z PRIORITY_CONFIGS                                                            |
| TextareaWithCounter | `src/components/ui/textarea-with-counter.tsx`   | Textarea + licznik znaków, maxLength, opcjonalne ostrzeżenie przy limicie                                                  |

Sekcja AI w TaskForm: przycisk „Zasugeruj priorytet” + warunkowe AISuggestionPanel (istniejące komponenty/hook). W trybie edit – `taskId` przekazane do useAISuggestion.

### 4.3 Komponenty istniejące do wykorzystania

- **AISuggestionPanel**, **RejectionReasonInput**, **useAISuggestion** – użyć w TaskForm bez zmian (ew. dopasować propsy jeśli hook zwraca inny kontrakt).
- **PRIORITY_CONFIGS** (dashboard types) – użyć w PrioritySelector i etykietach.
- **Dialog, Input, Label, Button, RadioGroup** (Shadcn) – już w projekcie.

### 4.4 Integracja w widoku listy

- **MainContent:**
  - Stan: `isTaskModalOpen: boolean`, `editingTask: TaskDTO | null` (null = create, wypełniony = edit).
  - Otwieranie: przycisk „Dodaj zadanie” (np. w headerze listy lub obok InlineTaskInput) → `setEditingTask(null); setIsTaskModalOpen(true)`.
  - Edycja: przekazanie do TaskList/TaskCard callbacka `onEditTask(task)` → `setEditingTask(task); setIsTaskModalOpen(true)`.
  - Render: `<TaskFormDialog isOpen={isTaskModalOpen} onClose={...} onSuccess={handleTaskSuccess} task={editingTask} listId={activeList.id} />`.
  - `handleTaskSuccess`: zamknięcie modala, `setEditingTask(null)`, odświeżenie listy (np. `refreshTasks()` z useTasks) lub optimistic update w useTasks.

- **TaskCard:**
  - Dodać przycisk/ikona „Edytuj” (np. w prawym górnym rogu, widoczny na hover).
  - `onEdit(task)` w props; klik wywołuje `onEdit(task)`.

- **TaskList:**
  - Przekazać `onEditTask` do TaskCard.

- **useTasks:**
  - Dodać w zwracanym obiekcie: `updateTask: (taskId: string, command: UpdateTaskCommand) => Promise<TaskDTO>`.
  - W środku: wywołanie `dashboard.api.updateTask(taskId, command)`, po sukcesie aktualizacja `tasks` w stanie (map po id) i wyczyszczenie błędu; przy błędzie ustawienie `error` i ewentualny rollback (jak przy updateTaskStatus).

### 4.5 Walidacja formularza (frontend)

- Tytuł: wymagany, 1–500 znaków (trimmed).
- Opis: opcjonalny, max 5000 znaków.
- Priorytet: wymagany, 1 | 2 | 3.
- Powód odrzucenia sugestii AI: wymagany przy „Odrzuć”, max 300 znaków (już w RejectionReasonInput).

Komunikaty błędów zgodne z planem (np. „Tytuł jest wymagany”, „Tytuł może mieć maksymalnie 500 znaków”).

### 4.6 Obsługa błędów (frontend)

- 400: wyświetlić błędy z `details` przy polach.
- 401: przekierowanie do logowania (obecna obsługa w projekcie).
- 404: np. „Zadanie nie istnieje lub zostało usunięte” – zamknąć modal, odświeżyć listę.
- 409: konflikt (np. sortOrder) – komunikat, formularz otwarty.
- 503 (AI): komunikat o niedostępności AI, możliwość ręcznego ustawienia priorytetu.
- Sieć/500: toast/alert + zachowanie danych formularza.

---

## 5. Kroki wdrożenia (kolejność)

Kolejność uwzględnia zależności (hook → formularz → dialog → integracja).

### Faza 1 – Backend

1. **Weryfikacja i dopasowanie schematu PATCH**
   - W `src/lib/schemas/task.schema.ts`: w `updateTaskSchema` ustawić max length title na 500 i dodać max 5000 dla description.
   - Uruchomić istniejące testy API (jeśli są) i ręcznie sprawdzić PATCH z długim tytułem/opisem.

### Faza 2 – Komponenty bazowe UI

2. **TextareaWithCounter**
   - Plik: `src/components/ui/textarea-with-counter.tsx`.
   - Props: value, onChange, maxLength, label?, placeholder?, error?, disabled?, id?.
   - Licznik znaków, opcjonalnie ostrzeżenie przy zbliżaniu do limitu.

3. **PrioritySelector**
   - Plik: `src/components/dashboard/PrioritySelector.tsx`.
   - Props: value (TaskPriority | null), onChange, error?, disabled?.
   - RadioGroup z trzema opcjami, etykiety i kolory z PRIORITY_CONFIGS.

### Faza 3 – Logika formularza i AI

4. **useTaskForm**
   - Plik: `src/components/dashboard/hooks/useTaskForm.ts`.
   - Opcje: initialTask?: TaskDTO, listId: string, onSuccess?: (task: TaskDTO) => void.
   - Stan: title, description, priority. Walidacja pól (jak w §4.5).
   - Submit: jeśli `initialTask` – PATCH `/api/tasks/:id` (tylko zmienione pola lub pełny zestaw wg przyjętej konwencji), jeśli brak – POST `/api/lists/:listId/tasks`.
   - Zwracać: formState, setField, errors, validateField, validateForm, handleSubmit, isSubmitting, reset, isDirty, mode.

5. **Integracja useAISuggestion w TaskForm**
   - Upewnić się, że useAISuggestion w TaskForm otrzymuje taskId (w trybie edit) oraz że po akceptacji/modyfikacji wywoływane jest setField('priority', ...).
   - Nie zmieniać sygnatur useAISuggestion jeśli nie jest to konieczne.

### Faza 4 – Formularz i modal

6. **TaskForm**
   - Plik: `src/components/dashboard/TaskForm.tsx`.
   - Props: initialData?: TaskDTO, onSubmit, isSubmitting, onCancel.
   - Użycie: useTaskForm (initialData = initialTask), useAISuggestion, Input (title), TextareaWithCounter (description), PrioritySelector, AISuggestionButton, AISuggestionPanel, RejectionReasonInput (w panelu odrzucenia), FormErrorSummary, przyciski Anuluj / Zapisz.
   - Przy submit wywołać onSubmit z CreateTaskCommand lub UpdateTaskCommand w zależności od trybu.

7. **TaskFormDialog**
   - Plik: `src/components/dashboard/TaskFormDialog.tsx`.
   - Props: isOpen, onClose, onSuccess?, task?, listId.
   - Dialog z tytułem zależnym od task („Edytuj zadanie” / „Nowe zadanie”).
   - W środku TaskForm z initialData=task, onCancel=onClose, onSubmit wywołujący API (create/edit) i w razie sukcesu onSuccess + onClose.

### Faza 5 – API w useTasks i integracja w widoku

8. **updateTask w useTasks**
   - W `src/components/dashboard/hooks/useTasks.ts`: zaimportować `updateTask` z `dashboard.api`.
   - Dodać `updateTask: (taskId, command) => Promise<TaskDTO>` do UseTasksReturn.
   - Implementacja: wywołanie API, po sukcesie aktualizacja `tasks` (map po id), wyczyszczenie error; przy błędzie setError i ewentualny rollback.

9. **Przycisk edycji w TaskCard**
   - Dodać props `onEdit?: (task: TaskDTO) => void`.
   - Przycisk/ikona „Edytuj” (np. PencilIcon), widoczny na hover lub zawsze; onClick wywołuje onEdit(task).

10. **TaskList**
    - Dodać props `onEditTask?: (task: TaskDTO) => void` i przekazać go do każdego TaskCard.

11. **MainContent – stan modala i „Dodaj zadanie”**
    - Stan: `isTaskModalOpen`, `editingTask: TaskDTO | null`.
    - Handler otwarcia create: `editingTask = null`, `isTaskModalOpen = true`.
    - Handler otwarcia edit: `editingTask = task`, `isTaskModalOpen = true`.
    - Handler zamknięcia: `isTaskModalOpen = false`, `editingTask = null`.
    - handleTaskSuccess: zamknięcie modala, refreshTasks() (lub optimistic update).
    - Render TaskFormDialog z isOpen, onClose, onSuccess, task=editingTask, listId=activeList.id.
    - Przycisk „Dodaj zadanie” (np. obok nagłówka listy lub nad InlineTaskInput) otwierający modal w trybie create.

12. **Eksporty i typy**
    - W `src/components/dashboard/index.ts` dodać eksport TaskFormDialog, TaskForm, PrioritySelector.
    - Typy ViewModel (TaskFormState, TaskFormErrors, AISuggestionState, RejectionState itd.) – dodać w `src/components/dashboard/types.ts` lub w pliku typów formularza zadań, zgodnie z planem modala.

### Faza 6 – Testy i dopracowanie

13. **Testy ręczne / e2e**
    - Create: otwarcie modala, wypełnienie, zapis – zadanie na liście.
    - Edit: klik „Edytuj”, zmiana pól, zapis – lista odświeżona.
    - Walidacja: puste pole tytułu, przekroczenie limitów.
    - Błędy: 404 (np. usunięcie zadania w innej karcie), 400 – komunikaty przy polach.

14. **Dostępność i UX**
    - Focus trap w modalu, zamknięcie Escape, aria-labelledby na DialogTitle.
    - Przycisk „Edytuj” z aria-label.

---

## 6. Zależności między zadaniami

- Kroki 2–3 nie zależą od siebie.
- Krok 4 zależy od typów (TaskFormState, CreateTaskCommand, UpdateTaskCommand – już w types.ts).
- Krok 5 zależy od useAISuggestion (już jest).
- Krok 6 zależy od 2, 3, 4, 5.
- Krok 7 zależy od 6.
- Krok 8 można zrobić równolegle z 6–7.
- Kroki 9–10 zależą tylko od typów TaskDTO.
- Krok 11 zależy od 7, 8, 9, 10.
- Krok 12 w trakcie 6–11.

---

## 7. Kryteria ukończenia

- Użytkownik może otworzyć modal „Nowe zadanie”, wypełnić tytuł, opis, priorytet (w tym z sugestii AI), zapisać – zadanie pojawia się na liście.
- Użytkownik może kliknąć „Edytuj” przy zadaniu, zmienić dane w modalu, zapisać – lista odzwierciedla zmiany.
- Walidacja frontend i backend jest spójna (limity 500/5000).
- Błędy API (400, 404, 409, 503) są obsłużone z czytelnymi komunikatami.
- useTasks udostępnia updateTask i jest używany przy zapisie edycji.
- Kod zgodny z regułami projektu (struktura, early returns, brak zbędnych else, obsługa błędów).

---

## 8. Powiązane dokumenty

- Pełny opis modala i komponentów: `doc/view_implementation_plan/task-form-modal-view-implementation-plan.md`
- Reguły projektu: `.cursor/rules/shared.mdc`, `CLAUDE.md`
- Typy i API: `src/types.ts`, `src/lib/api/dashboard.api.ts`, `src/lib/schemas/task.schema.ts`
