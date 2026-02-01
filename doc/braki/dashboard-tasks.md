# Plan implementacji brakujących funkcjonalności Dashboard - Zadania

## 1. Przegląd

Dokument opisuje plan implementacji trzech brakujących funkcjonalności w dashboardzie:

1. **Edycja zadania** - komponent UI do edycji tytułu, opisu i priorytetu
2. **Integracja AI w edycji** - sugestie priorytetu dla istniejących zadań
3. **Drag & Drop** - zmiana kolejności zadań przez przeciąganie

**Stan obecny:**

- Backend API jest w pełni gotowy (PATCH /api/tasks/:id, POST /api/lists/:listId/tasks/reorder)
- Hook `useAISuggestion` obsługuje `taskId` dla istniejących zadań
- Brak komponentów UI do edycji i reorderingu

## 2. Architektura rozwiązania

### 2.1. Struktura komponentów

```
src/components/dashboard/
├── TaskCard.tsx                    # MODYFIKACJA - dodanie onClick do edycji
├── TaskEditDialog.tsx              # NOWY - dialog edycji zadania
├── TaskEditForm.tsx                # NOWY - formularz edycji (reużywalny)
├── TaskList.tsx                    # MODYFIKACJA - integracja DnD
├── SortableTaskCard.tsx            # NOWY - wrapper DnD dla TaskCard
├── hooks/
│   ├── useTasks.ts                 # MODYFIKACJA - dodanie updateTask, reorderTasks
│   └── useTaskReorder.ts           # NOWY - logika drag & drop
└── types.ts                        # MODYFIKACJA - nowe typy
```

### 2.2. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MainContent                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                        TaskList                              │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │    │
│  │  │ SortableTaskCard│  │ SortableTaskCard│  ...              │    │
│  │  │  └─TaskCard─────┤  │  └─TaskCard─────┤                   │    │
│  │  │    onClick ─────┼──┼──────────────────┼───┐              │    │
│  │  └─────────────────┘  └─────────────────┘   │              │    │
│  └─────────────────────────────────────────────│──────────────┘    │
│                                                │                    │
│  ┌─────────────────────────────────────────────▼──────────────┐    │
│  │                    TaskEditDialog                           │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │                  TaskEditForm                        │   │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  │   │    │
│  │  │  │ Title Input │ │ Description │ │ Priority +    │  │   │    │
│  │  │  └─────────────┘ └─────────────┘ │ AISuggestion  │  │   │    │
│  │  │                                  └───────────────┘  │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Szczegóły implementacji

### 3.1. TaskEditDialog.tsx

**Opis:** Dialog modalny do edycji zadania, opakowuje TaskEditForm w komponent Dialog z shadcn/ui.

**Propsy:**

```typescript
interface TaskEditDialogProps {
  task: TaskDTO | null; // null = zamknięty dialog
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, command: UpdateTaskCommand) => Promise<void>;
  isSaving: boolean;
}
```

**Główne elementy:**

- `Dialog` z shadcn/ui z kontrolowanym stanem `open`
- `DialogHeader` z tytułem "Edytuj zadanie"
- `DialogContent` zawierający `TaskEditForm`
- Obsługa klawisza `Escape` do zamknięcia

**Wymagania dostępności:**

- `aria-labelledby` dla tytułu dialogu
- Focus trap wewnątrz dialogu
- Przywrócenie focusu po zamknięciu

---

### 3.2. TaskEditForm.tsx

**Opis:** Formularz edycji zadania z integracją sugestii AI. Reużywalny komponent (może być użyty w dialogu lub inline).

**Propsy:**

```typescript
interface TaskEditFormProps {
  task: TaskDTO;
  onSubmit: (command: UpdateTaskCommand) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

**Stan lokalny:**

```typescript
const [title, setTitle] = useState(task.title);
const [description, setDescription] = useState(task.description ?? "");
const [priority, setPriority] = useState<TaskPriority>(task.priority);
const [errors, setErrors] = useState<FormErrors>({});
```

**Integracja AI:**

```typescript
const {
  suggestion,
  isLoading: isSuggesting,
  isProcessingDecision,
  requestSuggestion,
  acceptSuggestion,
  modifySuggestion,
  rejectSuggestion,
  clearSuggestion,
} = useAISuggestion({
  taskId: task.id, // <-- klucz: przekazujemy ID istniejącego zadania
  onPriorityUpdate: setPriority,
});
```

**Główne elementy:**

- Input tytułu z walidacją (wymagany, max 200 znaków)
- Textarea opisu (opcjonalny, max 2000 znaków)
- Select priorytetu z `PRIORITY_CONFIGS`
- `AISuggestionButton` obok selectora priorytetu
- `AISuggestionPanel` gdy sugestia dostępna
- Przyciski "Zapisz" i "Anuluj"

**Walidacja:**

```typescript
interface FormErrors {
  title?: string;
  description?: string;
}

function validateForm(title: string, description: string): FormErrors {
  const errors: FormErrors = {};

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    errors.title = "Tytuł jest wymagany";
  } else if (trimmedTitle.length > 200) {
    errors.title = "Tytuł może mieć max 200 znaków";
  }

  if (description.length > 2000) {
    errors.description = "Opis może mieć max 2000 znaków";
  }

  return errors;
}
```

**Obsługiwane interakcje:**

- Zmiana pól → aktualizacja stanu, czyszczenie błędów
- Kliknięcie "Zasugeruj priorytet" → `requestSuggestion(title, description)`
- Akceptacja/modyfikacja/odrzucenie sugestii → delegacja do hooka
- Submit → walidacja → `onSubmit({ title, description, priority })`
- Anuluj → `onCancel()`
- Enter (bez Shift) → submit
- Escape → anuluj

---

### 3.3. Modyfikacja TaskCard.tsx

**Zmiany:**

1. Dodanie propsa `onEdit`:

```typescript
interface TaskCardProps {
  task: TaskDTO;
  onStatusChange: (status: TaskStatus) => void;
  onEdit?: (task: TaskDTO) => void; // NOWE
}
```

2. Dodanie przycisku edycji lub kliknięcia na kartę:

```typescript
// Opcja A: Ikona edycji
<button
  onClick={() => onEdit?.(task)}
  className="opacity-0 group-hover:opacity-100 transition-opacity"
  aria-label={`Edytuj zadanie "${task.title}"`}
>
  <PencilIcon className="h-4 w-4" />
</button>

// Opcja B: Kliknięcie na kartę (poza checkboxem)
<article
  onClick={(e) => {
    // Nie otwieraj edycji jeśli kliknięto checkbox
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
    onEdit?.(task);
  }}
  className="cursor-pointer ..."
>
```

**Rekomendacja:** Opcja A (ikona) jest lepsza dla dostępności i jasności UX.

---

### 3.4. Modyfikacja useTasks.ts

**Nowe akcje:**

```typescript
export interface UseTasksReturn {
  // ... istniejące

  // NOWE
  updateTask: (taskId: string, command: UpdateTaskCommand) => Promise<TaskDTO>;
  reorderTasks: (taskOrders: TaskOrderItem[]) => Promise<void>;
}
```

**Implementacja updateTask:**

```typescript
const updateTaskAction = useCallback(
  async (taskId: string, command: UpdateTaskCommand): Promise<TaskDTO> => {
    // Optimistic update
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...command,
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    );

    try {
      const updatedTask = await apiUpdateTask(taskId, command);

      // Zastąp optimistic update rzeczywistymi danymi
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)));

      setError(null);
      return updatedTask;
    } catch (err) {
      // Rollback
      setTasks(previousTasks);
      handleError(err);
      throw err;
    }
  },
  [tasks, handleError]
);
```

**Implementacja reorderTasks:**

```typescript
const reorderTasksAction = useCallback(
  async (taskOrders: TaskOrderItem[]): Promise<void> => {
    if (!listId) return;

    // Optimistic update
    const previousTasks = tasks;
    const orderMap = new Map(taskOrders.map((o) => [o.id, o.sortOrder]));

    setTasks((prev) =>
      prev
        .map((task) => ({
          ...task,
          sortOrder: orderMap.get(task.id) ?? task.sortOrder,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );

    try {
      await apiReorderTasks(listId, { taskOrders });
      setError(null);
    } catch (err) {
      // Rollback
      setTasks(previousTasks);
      handleError(err);
      throw err;
    }
  },
  [listId, tasks, handleError]
);
```

---

### 3.5. Nowa funkcja w dashboard.api.ts

```typescript
/**
 * Reorders tasks in a list
 */
export async function reorderTasks(listId: string, command: ReorderTasksCommand): Promise<ReorderTasksResponseDTO> {
  const response = await safeFetch(`/api/lists/${listId}/tasks/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<ReorderTasksResponseDTO>(response);
}
```

---

### 3.6. useTaskReorder.ts (Drag & Drop)

**Opis:** Hook zarządzający logiką drag & drop z użyciem `@dnd-kit/core`.

**Zależności do instalacji:**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Implementacja:**

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface UseTaskReorderOptions {
  tasks: TaskDTO[];
  onReorder: (taskOrders: TaskOrderItem[]) => Promise<void>;
  enabled: boolean;
}

interface UseTaskReorderReturn {
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => void;
  sortableItems: string[];
}

export function useTaskReorder({ tasks, onReorder, enabled }: UseTaskReorderOptions): UseTaskReorderReturn {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimalna odległość przed aktywacją
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableItems = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!enabled) return;

      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Oblicz nowe sortOrder dla wszystkich zadań
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      const taskOrders: TaskOrderItem[] = reorderedTasks.map((task, index) => ({
        id: task.id,
        sortOrder: index + 1,
      }));

      await onReorder(taskOrders);
    },
    [tasks, onReorder, enabled]
  );

  return {
    sensors,
    handleDragEnd,
    sortableItems,
  };
}
```

---

### 3.7. SortableTaskCard.tsx

**Opis:** Wrapper dla TaskCard dodający funkcjonalność drag & drop.

```typescript
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableTaskCardProps {
  task: TaskDTO;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
  disabled?: boolean;
}

export function SortableTaskCard({
  task,
  onStatusChange,
  onEdit,
  disabled = false,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
            aria-label="Przeciągnij aby zmienić kolejność"
          >
            <GripVerticalIcon className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1">
          <TaskCard
            task={task}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### 3.8. Modyfikacja TaskList.tsx

**Zmiany:**

```typescript
interface TaskListProps {
  tasksByPriority: TasksByPriority;
  isLoading: boolean;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskEdit: (task: TaskDTO) => void;           // NOWE
  onTasksReorder: (taskOrders: TaskOrderItem[]) => Promise<void>;  // NOWE
  sortField: TaskSortField;                       // NOWE - do kontroli DnD
}

export function TaskList({
  tasksByPriority,
  isLoading,
  onTaskStatusChange,
  onTaskEdit,
  onTasksReorder,
  sortField,
}: TaskListProps) {
  // DnD aktywne tylko gdy sortowanie po sort_order
  const isDndEnabled = sortField === "sort_order";

  // Płaska lista wszystkich zadań dla DnD
  const allTasks = useMemo(
    () => [
      ...tasksByPriority.high,
      ...tasksByPriority.medium,
      ...tasksByPriority.low,
    ],
    [tasksByPriority]
  );

  const { sensors, handleDragEnd, sortableItems } = useTaskReorder({
    tasks: allTasks,
    onReorder: onTasksReorder,
    enabled: isDndEnabled,
  });

  // Render z DnD Context
  if (isDndEnabled) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="space-y-2" role="list" aria-label="Lista zadań">
            {allTasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onStatusChange={(status) => onTaskStatusChange(task.id, status)}
                onEdit={onTaskEdit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // Render bez DnD (grupowanie po priorytetach)
  return (
    <div className="space-y-6" role="list" aria-label="Lista zadań">
      {/* ... istniejący kod z PriorityGroup */}
    </div>
  );
}
```

---

### 3.9. Modyfikacja MainContent.tsx

**Zmiany:**

```typescript
export function MainContent({ activeList, onStartCreateList }: MainContentProps) {
  // ... istniejący kod

  // NOWE: Stan dla edycji zadania
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // NOWE: Handler edycji
  const handleEditTask = useCallback((task: TaskDTO) => {
    setEditingTask(task);
  }, []);

  const handleSaveTask = useCallback(
    async (taskId: string, command: UpdateTaskCommand) => {
      setIsSavingTask(true);
      try {
        await updateTask(taskId, command);
        toast.success("Zadanie zostało zaktualizowane");
        setEditingTask(null);
      } catch {
        // Error handled by hook
      } finally {
        setIsSavingTask(false);
      }
    },
    [updateTask]
  );

  const handleCloseEdit = useCallback(() => {
    setEditingTask(null);
  }, []);

  // NOWE: Handler reorderingu
  const handleReorderTasks = useCallback(
    async (taskOrders: TaskOrderItem[]) => {
      try {
        await reorderTasks(taskOrders);
      } catch {
        toast.error("Nie udało się zmienić kolejności zadań");
      }
    },
    [reorderTasks]
  );

  return (
    <div className="flex flex-col h-full">
      {/* ... istniejący kod */}

      <TaskList
        tasksByPriority={tasksByPriority}
        isLoading={isLoading}
        onTaskStatusChange={handleTaskStatusChange}
        onTaskEdit={handleEditTask}           // NOWE
        onTasksReorder={handleReorderTasks}   // NOWE
        sortField={filters.sort}              // NOWE
      />

      {/* ... istniejący kod */}

      {/* NOWE: Dialog edycji */}
      <TaskEditDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={handleCloseEdit}
        onSave={handleSaveTask}
        isSaving={isSavingTask}
      />
    </div>
  );
}
```

---

## 4. Nowe typy (types.ts)

```typescript
// Dodać do src/components/dashboard/types.ts

/**
 * Props for task editing
 */
export interface TaskEditState {
  task: TaskDTO | null;
  isOpen: boolean;
  isSaving: boolean;
}

/**
 * Form errors for task edit form
 */
export interface TaskEditFormErrors {
  title?: string;
  description?: string;
}
```

---

## 5. Warunki i walidacja

### 5.1. Walidacja formularza edycji

| Pole        | Warunek         | Komunikat błędu                  | Wpływ na UI                       |
| ----------- | --------------- | -------------------------------- | --------------------------------- |
| title       | Wymagane        | "Tytuł jest wymagany"            | Czerwona ramka, tekst pod inputem |
| title       | Max 200 znaków  | "Tytuł może mieć max 200 znaków" | j.w.                              |
| description | Max 2000 znaków | "Opis może mieć max 2000 znaków" | Czerwona ramka textarea           |

### 5.2. Warunki drag & drop

| Warunek                         | Zachowanie                                   |
| ------------------------------- | -------------------------------------------- |
| `filters.sort !== "sort_order"` | DnD wyłączone, ukryj uchwyty                 |
| `isLoading === true`            | DnD wyłączone                                |
| Zadanie w trakcie przeciągania  | Opacity 50%, placeholder w miejscu docelowym |

---

## 6. Obsługa błędów

### 6.1. Błędy edycji zadania

| Kod | Przyczyna                   | Akcja                           |
| --- | --------------------------- | ------------------------------- |
| 400 | Walidacja (np. pusty tytuł) | Wyświetl błędy przy polach      |
| 401 | Sesja wygasła               | Przekierowanie do `/login`      |
| 404 | Zadanie usunięte            | Toast + zamknij dialog          |
| 409 | Konflikt sortOrder          | Toast z informacją              |
| 500 | Błąd serwera                | Toast + zachowaj dialog otwarty |

### 6.2. Błędy reorderingu

| Kod | Przyczyna                  | Akcja                 |
| --- | -------------------------- | --------------------- |
| 400 | Nieprawidłowe dane         | Rollback + toast      |
| 404 | Lista/zadania nie istnieją | Refresh listy + toast |
| 500 | Błąd serwera               | Rollback + toast      |

---

## 7. Dostępność

### 7.1. Dialog edycji

- Focus trap wewnątrz dialogu
- `aria-labelledby` wskazujący na tytuł
- `aria-describedby` dla instrukcji (opcjonalne)
- Escape zamyka dialog
- Focus wraca do elementu wywołującego po zamknięciu

### 7.2. Drag & drop

- Obsługa klawiatury (Space/Enter aktywuje, strzałki przesuwają)
- `aria-label` na uchwytach: "Przeciągnij aby zmienić kolejność"
- `aria-describedby` z instrukcjami dla screen readerów
- Live region (`aria-live="polite"`) informujący o zmianach pozycji

### 7.3. Przycisk edycji

- `aria-label`: `Edytuj zadanie "${task.title}"`
- Widoczny focus ring
- Kontrast kolorów zgodny z WCAG 2.1 AA

---

## 8. Instalacja zależności

```bash
# Drag & Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 9. Kroki implementacji

### Faza 1: Edycja zadania (bez AI)

1. Utworzenie `TaskEditForm.tsx` z podstawową walidacją
2. Utworzenie `TaskEditDialog.tsx` z shadcn/ui Dialog
3. Modyfikacja `TaskCard.tsx` - dodanie przycisku/ikony edycji
4. Modyfikacja `useTasks.ts` - dodanie `updateTask`
5. Modyfikacja `MainContent.tsx` - integracja dialogu
6. Testy manualne flow edycji

### Faza 2: Integracja AI w edycji

7. Integracja `useAISuggestion` w `TaskEditForm.tsx` z `taskId`
8. Dodanie `AISuggestionButton` i `AISuggestionPanel` do formularza
9. Testy flow AI: request → accept/modify/reject
10. Weryfikacja zapisywania decyzji w bazie

### Faza 3: Drag & Drop

11. Instalacja `@dnd-kit/*`
12. Utworzenie `useTaskReorder.ts`
13. Utworzenie `SortableTaskCard.tsx`
14. Modyfikacja `TaskList.tsx` - warunkowy render z DnD
15. Dodanie `reorderTasks` do `useTasks.ts` i `dashboard.api.ts`
16. Modyfikacja `MainContent.tsx` - przekazanie handlerów
17. Testy manualne: sortowanie "Własna kolejność" + drag & drop

### Faza 4: Dostępność i UX

18. Audyt ARIA dla dialogu edycji
19. Implementacja obsługi klawiatury dla DnD
20. Dodanie live regions dla zmian pozycji
21. Testy z VoiceOver/NVDA

### Faza 5: Testy i dokumentacja

22. Testy jednostkowe dla hooków
23. Testy integracyjne dla komponentów
24. Aktualizacja planu implementacji dashboard (dashboard-view-implementation-plan.md)

---

## 10. Podsumowanie zmian w plikach

| Plik                       | Typ zmiany  | Opis                         |
| -------------------------- | ----------- | ---------------------------- |
| `TaskEditDialog.tsx`       | NOWY        | Dialog modalny edycji        |
| `TaskEditForm.tsx`         | NOWY        | Formularz edycji z AI        |
| `SortableTaskCard.tsx`     | NOWY        | Wrapper DnD dla TaskCard     |
| `hooks/useTaskReorder.ts`  | NOWY        | Logika drag & drop           |
| `TaskCard.tsx`             | MODYFIKACJA | Dodanie onEdit, ikona edycji |
| `TaskList.tsx`             | MODYFIKACJA | Integracja DnD               |
| `MainContent.tsx`          | MODYFIKACJA | Stan edycji, handlery        |
| `hooks/useTasks.ts`        | MODYFIKACJA | updateTask, reorderTasks     |
| `types.ts`                 | MODYFIKACJA | Nowe typy                    |
| `lib/api/dashboard.api.ts` | MODYFIKACJA | reorderTasks()               |
| `package.json`             | MODYFIKACJA | @dnd-kit/\*                  |
