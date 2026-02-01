# Plan wdrożenia: Modal potwierdzenia usunięcia (zadanie i lista)

## 1. Wprowadzenie

Dokument opisuje **plan wdrożenia** modala potwierdzenia usunięcia dla zadań i list w aplikacji AI Task Manager (PRD US-008, US-011).

Odniesienia: **PRD** `doc/prd.md`, **Plan widoku** `doc/view_implementation_plan/delete-confirmation-modal-view-implementation-plan.md`.

---

## 2. Zakres

Modal potwierdzenia usunięcia ma obsługiwać:

| Kontekst | Obecny stan | Do zrobienia |
|----------|-------------|--------------|
| **Zadanie** | AlertDialog w `TaskEditDialog` | Uzupełnić komunikat o nazwę, błędy w modalu, styl przycisku |
| **Lista** | `window.confirm` w `ListItem` | Zastąpić modalem AlertDialog z ostrzeżeniem o kaskadzie |

---

## 3. Zadanie: Modal usuwania zadania

**Lokalizacja:** `src/components/dashboard/TaskEditDialog.tsx`

### 3.1. Komunikat z nazwą

- **Obecnie:** „Czy na pewno chcesz usunąć to zadanie? Tej operacji nie można cofnąć.”
- **Docelowo:** „Czy na pewno chcesz usunąć zadanie „{task.title}"?”
- Fallback dla pustego tytułu: „(bez tytułu)” lub „to zadanie”.

### 3.2. Błędy wewnątrz modala

- Przekazać `deleteError: string | null` z rodzica.
- Wyświetlać komunikat w modalu (`role="alert"`) poniżej opisu.
- Przy błędzie modal pozostaje otwarty, użytkownik może spróbować ponownie lub anulować.

### 3.3. Styl przycisku „Usuń”

- Użyć `variant="destructive"` (Button/buttonVariants) zamiast własnych klas.
- Dla `AlertDialogAction`: `className={cn(buttonVariants({ variant: "destructive" }))}`.

### 3.4. Focus na „Anuluj”

- Upewnić się, że focus domyślnie pada na przycisk Anuluj.
- W razie potrzeby użyć `autoFocus` na `AlertDialogCancel`.

---

## 4. Zadanie: Modal usuwania listy

**Lokalizacja:** `src/components/dashboard/ListItem.tsx`

### 4.1. Zastąpienie window.confirm

- Usunąć `window.confirm()`.
- Dodać AlertDialog (lub reużywalny DeleteConfirmationDialog) z pełnym komunikatem.

### 4.2. Treść modala

- Tytuł: „Potwierdzenie usunięcia”.
- Opis: „Czy na pewno chcesz usunąć listę „{list.name}"? Wszystkie zadania na tej liście również zostaną usunięte.”
- Fallback dla pustej nazwy: „(bez nazwy)” lub „tę listę”.

### 4.3. Przyciski i stany

- „Anuluj” (outline) – zamyka modal, bez akcji.
- „Usuń” (destructive) – wywołuje `onDelete`, stan „Usuwanie...”.
- Blokada przycisków podczas `isDeleting`.
- Obsługa błędów – wyświetlenie komunikatu w modalu lub toast (spójnie z zadaniem).

### 4.4. Zachowanie rodzica

- Zachować `onDelete` z `Sidebar` / `Dashboard`.
- Logika wyboru innej listy po usunięciu aktywnej jest już w `useDashboard.deleteListAction`.

---

## 5. Reużywalny komponent (opcjonalnie)

Dla spójności i DRY można wdrożyć `DeleteConfirmationDialog` + `useDeleteConfirmation`:

- Jeden komponent dla obu kontekstów (zadanie, lista).
- Props: `open`, `onOpenChange`, `itemType`, `itemName`, `onConfirm`, `isDeleting`, `error`.
- Hook obsługujący stan i wywołania API.

Szczegóły w `doc/view_implementation_plan/delete-confirmation-modal-view-implementation-plan.md`.

---

## 6. Kolejność wdrożenia

1. **Lista** – AlertDialog w `ListItem` (window.confirm → modal).
2. **Zadanie** – dopracowanie modala w `TaskEditDialog` (nazwa, błędy, styl).
3. **Opcjonalnie** – wyodrębnienie `DeleteConfirmationDialog` i zastąpienie obu implementacji.

---

## 7. Uwagi

- API `DELETE /api/tasks/[id]` i `DELETE /api/lists/[id]` działa poprawnie.
- AlertDialog (Shadcn) jest już w projekcie: `src/components/ui/alert-dialog.tsx`.
- Przekierowanie przy 401 – `handleUnauthorizedError` w `lib/api/errors.ts`.
