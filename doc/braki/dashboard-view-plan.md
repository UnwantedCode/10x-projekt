# Plan wdrożenia: usuwanie zadania

## 1. Wprowadzenie

Dokument opisuje **plan wdrożenia** funkcjonalności usuwania zadania z potwierdzeniem w widoku Dashboard aplikacji AI Task Manager (**US-011**).

Odniesienia: **PRD** `doc/prd.md`, **Plan widoku Dashboard** `doc/view_implementation_plan/dashboard-view-implementation-plan.md`.

---

## 2. US-011 — Usunięcie zadania

**Źródło:** PRD 3.3 (Usuwanie zadania), US-011.

**Kryteria akceptacji (PRD):**

- Użytkownik może usunąć zadanie po potwierdzeniu.
- Usunięte zadanie znika z listy i nie jest dostępne w filtrach.
- System nie usuwa innych zadań ani nie zmienia kolejności poza konsekwencją usunięcia.

**Stan w planie widoku:** TaskCard ma tylko checkbox statusu i „klik → (przyszłe: edycja)”. Brak akcji „Usuń” i dialogu potwierdzenia.

### 2.1. Miejsce w UI

- **Opcja A (zalecana):** Przycisk „Usuń” w **dialogu edycji zadania** (TaskEditDialog). Po potwierdzeniu w drugim kroku (dialog „Czy na pewno?”) wywołanie `DELETE /api/tasks/:id` i zamknięcie dialogu.
- **Opcja B:** Ikona kosza na TaskCard (np. widoczna po hover). Klik → dialog potwierdzenia → DELETE. Alternatywa, gdy dialog edycji nie istnieje.

Rekomendacja: **Opcja A** — usuwanie w dialogu edycji. Jeśli dialog edycji nie jest jeszcze wdrożony, można tymczasowo zastosować Opcję B (ikona na karcie + AlertDialog + DELETE).

### 2.2. Przepływ

1. Użytkownik otwiera edycję zadania (klik w TaskCard → TaskEditDialog) **lub** klika ikonę usuwania na TaskCard (Opcja B).
2. W stopce dialogu edycji: przycisk „Usuń zadanie” (wariant destrukcyjny, np. outline/danger).
3. Klik „Usuń zadanie” → otwarcie **AlertDialog** (shadcn/ui): „Czy na pewno chcesz usunąć to zadanie? Tej operacji nie można cofnąć.”
4. Przyciski: „Anuluj” (zamknięcie AlertDialog) oraz „Usuń” (potwierdzenie).
5. Po „Usuń”: wywołanie `DELETE /api/tasks/:id`, zamknięcie TaskEditDialog (jeśli otwarty) i AlertDialog, usunięcie zadania ze stanu (optimistic: usunięcie z listy od razu; przy błędzie — rollback + toast).
6. Toast sukcesu: „Zadanie zostało usunięte” (opcjonalnie).

### 2.3. Zmiany w komponentach i API

| Element | Zmiana |
|--------|--------|
| `TaskEditDialog` (lub równoważny) | Przycisk „Usuń zadanie” w stopce, stan `isDeleteConfirmOpen`, AlertDialog potwierdzenia, callback `onDelete(taskId)`. Przy Opcji B: przycisk/ikona na `TaskCard`. |
| `useTasks` (lub hook zarządzający zadaniami) | Metoda `deleteTask(taskId: string): Promise<void>` wywołująca `DELETE /api/tasks/:id`, aktualizacja lokalnego stanu listy zadań (usunięcie elementu). |
| Klient API (`dashboard.api.ts` lub inny) | Funkcja `deleteTask(taskId: string): Promise<void>` z obsługą 401/404/5xx (np. przekierowanie przy 401, toast przy 404/5xx). |

### 2.4. Walidacja i edge cases

- **Brak aktywnej listy:** Nie pokazywać MainContent z zadaniami — usuwanie nie dotyczy.
- **404 po DELETE:** Traktować jako „zadanie już usunięte” — usunąć z lokalnego stanu, opcjonalnie toast „Zadanie nie istnieje”.
- **Optymistic update:** Przy błędzie przywrócić zadanie na listę i pokazać toast błędu.

---

## 3. Podsumowanie

- **US-011 (usuwanie zadania):** przycisk „Usuń zadanie” w dialogu edycji (lub ikona na karcie), AlertDialog potwierdzenia, `deleteTask` w hooku i kliencie API, `DELETE /api/tasks/:id`, optimistic update z rollback przy błędzie.
