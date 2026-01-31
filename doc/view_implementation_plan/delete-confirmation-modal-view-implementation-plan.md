# Plan implementacji widoku Modal potwierdzenia usunięcia

## 1. Przegląd

Modal potwierdzenia usunięcia to reużywalny komponent typu overlay (AlertDialog) służący do potwierdzania destrukcyjnych akcji w aplikacji. Jego głównym celem jest ochrona użytkownika przed przypadkowym usunięciem danych poprzez wymaganie jawnego potwierdzenia. Modal obsługuje dwa scenariusze: usunięcie zadania oraz usunięcie listy (wraz z kaskadowym usunięciem wszystkich zadań na tej liście).

Komponent zapewnia:
- Jasny komunikat o konsekwencjach usunięcia
- Bezpieczną opcję anulowania (domyślny focus)
- Przycisk destrukcyjnej akcji wyraźnie oznaczony
- Pełną dostępność zgodną z WCAG (role="alertdialog")

## 2. Routing widoku

Modal nie posiada własnej ścieżki routingu - jest komponentem nakładkowym (overlay) wywoływanym z innych widoków:
- Z widoku listy zadań przy usuwaniu pojedynczego zadania
- Z panelu bocznego lub widoku list przy usuwaniu całej listy

Modal jest renderowany warunkowo na podstawie stanu rodzica i może być używany na dowolnej stronie aplikacji.

## 3. Struktura komponentów

```
DeleteConfirmationDialog (React)
├── AlertDialog (Shadcn/ui - @radix-ui/react-alert-dialog)
│   └── AlertDialogContent
│       ├── AlertDialogHeader
│       │   ├── AlertDialogTitle
│       │   │   └── "Potwierdzenie usunięcia"
│       │   └── AlertDialogDescription
│       │       └── [Dynamiczny komunikat zależny od typu]
│       └── AlertDialogFooter
│           ├── AlertDialogCancel (Button variant="outline")
│           │   └── "Anuluj"
│           └── AlertDialogAction (Button variant="destructive")
│               └── "Usuń" / "Usuwanie..."
```

## 4. Szczegóły komponentów

### DeleteConfirmationDialog

- **Opis komponentu**: Główny komponent modala odpowiedzialny za wyświetlanie dialogu potwierdzenia usunięcia. Wykorzystuje AlertDialog z Shadcn/ui jako bazę. Komponent jest w pełni kontrolowany przez rodzica (controlled component) i obsługuje dwa typy usunięcia: zadanie i lista.

- **Główne elementy**:
  - `AlertDialog` - kontener modala z Radix UI
  - `AlertDialogContent` - zawartość modala z odpowiednim stylowaniem
  - `AlertDialogHeader` - nagłówek zawierający tytuł i opis
  - `AlertDialogTitle` - tytuł "Potwierdzenie usunięcia"
  - `AlertDialogDescription` - dynamiczny komunikat zależny od `itemType`
  - `AlertDialogFooter` - stopka z przyciskami akcji
  - `AlertDialogCancel` - przycisk anulowania (Button variant="outline")
  - `AlertDialogAction` - przycisk usunięcia (Button variant="destructive")

- **Obsługiwane interakcje**:
  - Kliknięcie "Anuluj" lub klawisz Escape → zamknięcie modala bez akcji
  - Kliknięcie poza modalem → zamknięcie modala bez akcji
  - Kliknięcie "Usuń" → wywołanie `onConfirm`, pokazanie stanu ładowania
  - Klawisz Enter na przycisku "Usuń" → jak kliknięcie

- **Obsługiwana walidacja**:
  - Brak walidacji formularza (modal nie przyjmuje danych wejściowych)
  - Walidacja stanu: przyciski są zablokowane podczas `isDeleting`

- **Typy**:
  - `DeleteDialogProps` (props komponentu)
  - `DeleteItemType` ('task' | 'list')

- **Propsy**:
  ```typescript
  interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemType: DeleteItemType;
    itemName: string;
    onConfirm: () => void;
    isDeleting: boolean;
  }
  ```

### AlertDialog (Shadcn/ui)

- **Opis komponentu**: Bazowy komponent z biblioteki Shadcn/ui oparty na @radix-ui/react-alert-dialog. Wymaga instalacji jako zależność projektu.

- **Główne elementy**: Zestaw prymitywów AlertDialog*, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel

- **Obsługiwane interakcje**: Wbudowana obsługa klawiatury (Escape, Tab, Enter), fokus trap, kliknięcie poza modalem

- **Typy**: Typy z @radix-ui/react-alert-dialog

## 5. Typy

### Nowe typy do zdefiniowania

```typescript
// src/components/DeleteConfirmationDialog/types.ts

/**
 * Typ elementu do usunięcia
 */
export type DeleteItemType = 'task' | 'list';

/**
 * Props dla komponentu DeleteConfirmationDialog
 */
export interface DeleteDialogProps {
  /** Czy modal jest otwarty */
  open: boolean;
  /** Callback wywoływany przy zmianie stanu otwarcia */
  onOpenChange: (open: boolean) => void;
  /** Typ usuwanego elementu */
  itemType: DeleteItemType;
  /** Nazwa usuwanego elementu (do wyświetlenia w komunikacie) */
  itemName: string;
  /** Callback wywoływany po potwierdzeniu usunięcia */
  onConfirm: () => void;
  /** Czy trwa operacja usuwania */
  isDeleting: boolean;
}

/**
 * Stan hooka useDeleteConfirmation
 */
export interface DeleteConfirmationState {
  /** Czy modal jest otwarty */
  isOpen: boolean;
  /** Typ elementu do usunięcia */
  itemType: DeleteItemType | null;
  /** ID elementu do usunięcia */
  itemId: string | null;
  /** Nazwa elementu do usunięcia */
  itemName: string;
  /** Czy trwa operacja usuwania */
  isDeleting: boolean;
  /** Komunikat błędu */
  error: string | null;
}

/**
 * Akcje hooka useDeleteConfirmation
 */
export interface DeleteConfirmationActions {
  /** Otwiera modal z danymi elementu */
  openDialog: (type: DeleteItemType, id: string, name: string) => void;
  /** Zamyka modal */
  closeDialog: () => void;
  /** Potwierdza usunięcie - wywołuje API */
  confirmDelete: () => Promise<boolean>;
  /** Czyści błąd */
  clearError: () => void;
}

/**
 * Zwracany typ hooka useDeleteConfirmation
 */
export type UseDeleteConfirmationReturn = DeleteConfirmationState & DeleteConfirmationActions;
```

### Istniejące typy z src/types.ts

```typescript
// Wykorzystywane typy odpowiedzi API
export interface SuccessResponseDTO {
  success: boolean;
}

export interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

## 6. Zarządzanie stanem

### Custom Hook: useDeleteConfirmation

Hook zarządza całym stanem modala oraz komunikacją z API. Zapewnia enkapsulację logiki usuwania i może być współdzielony między różnymi komponentami wywołującymi modal.

```typescript
// src/components/hooks/useDeleteConfirmation.ts

import { useState, useCallback } from 'react';
import type {
  DeleteItemType,
  UseDeleteConfirmationReturn
} from '../DeleteConfirmationDialog/types';

export function useDeleteConfirmation(): UseDeleteConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [itemType, setItemType] = useState<DeleteItemType | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = useCallback((
    type: DeleteItemType,
    id: string,
    name: string
  ) => {
    setItemType(type);
    setItemId(id);
    setItemName(name);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (!isDeleting) {
      setIsOpen(false);
      // Reset state after animation
      setTimeout(() => {
        setItemType(null);
        setItemId(null);
        setItemName('');
        setError(null);
      }, 150);
    }
  }, [isDeleting]);

  const confirmDelete = useCallback(async (): Promise<boolean> => {
    if (!itemType || !itemId) return false;

    setIsDeleting(true);
    setError(null);

    try {
      const endpoint = itemType === 'task'
        ? `/api/tasks/${itemId}`
        : `/api/lists/${itemId}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 401) {
          // Session expired - redirect to login
          window.location.href = '/login';
          return false;
        }

        if (response.status === 404) {
          setError('Element nie został znaleziony. Mógł zostać już usunięty.');
          return false;
        }

        setError(errorData.message || 'Wystąpił błąd podczas usuwania.');
        return false;
      }

      setIsOpen(false);
      return true;
    } catch {
      setError('Błąd połączenia. Sprawdź połączenie internetowe i spróbuj ponownie.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [itemType, itemId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isOpen,
    itemType,
    itemId,
    itemName,
    isDeleting,
    error,
    openDialog,
    closeDialog,
    confirmDelete,
    clearError,
  };
}
```

### Użycie w komponencie rodzica

```typescript
// Przykład użycia w komponencie listy zadań
const deleteConfirmation = useDeleteConfirmation();

const handleDeleteTask = (task: TaskDTO) => {
  deleteConfirmation.openDialog('task', task.id, task.title);
};

const handleConfirmDelete = async () => {
  const success = await deleteConfirmation.confirmDelete();
  if (success) {
    // Odśwież listę zadań
    await refreshTasks();
  }
};
```

## 7. Integracja API

### Endpoint usuwania zadania

| Właściwość | Wartość |
|------------|---------|
| Metoda | DELETE |
| URL | `/api/tasks/:id` |
| Parametry ścieżki | `id` - UUID zadania |
| Ciało żądania | Brak |
| Typ odpowiedzi sukcesu | `SuccessResponseDTO` |
| Typ odpowiedzi błędu | `ErrorResponseDTO` |

**Kody odpowiedzi**:
- `200 OK` - Zadanie usunięte pomyślnie
- `401 Unauthorized` - Użytkownik niezalogowany
- `404 Not Found` - Zadanie nie istnieje lub nie należy do użytkownika

### Endpoint usuwania listy

| Właściwość | Wartość |
|------------|---------|
| Metoda | DELETE |
| URL | `/api/lists/:id` |
| Parametry ścieżki | `id` - UUID listy |
| Ciało żądania | Brak |
| Typ odpowiedzi sukcesu | `SuccessResponseDTO` |
| Typ odpowiedzi błędu | `ErrorResponseDTO` |

**Kody odpowiedzi**:
- `200 OK` - Lista usunięta pomyślnie (kaskadowo usuwa wszystkie zadania)
- `401 Unauthorized` - Użytkownik niezalogowany
- `404 Not Found` - Lista nie istnieje lub nie należy do użytkownika

### Przykład wywołania API

```typescript
// Usunięcie zadania
const response = await fetch(`/api/tasks/${taskId}`, {
  method: 'DELETE',
});

if (response.ok) {
  const data: SuccessResponseDTO = await response.json();
  // data.success === true
}

// Usunięcie listy
const response = await fetch(`/api/lists/${listId}`, {
  method: 'DELETE',
});

if (response.ok) {
  const data: SuccessResponseDTO = await response.json();
  // data.success === true
}
```

## 8. Interakcje użytkownika

### Scenariusz 1: Usunięcie zadania

1. Użytkownik klika przycisk usunięcia przy zadaniu
2. Rodzic wywołuje `openDialog('task', taskId, taskTitle)`
3. Modal otwiera się z komunikatem: "Czy na pewno chcesz usunąć zadanie „{nazwa}"?"
4. Focus automatycznie przenosi się na przycisk "Anuluj"
5. Użytkownik może:
   - Kliknąć "Anuluj" → modal się zamyka, brak akcji
   - Nacisnąć Escape → modal się zamyka, brak akcji
   - Kliknąć poza modalem → modal się zamyka, brak akcji
   - Kliknąć "Usuń" → przejście do kroku 6
6. Przycisk "Usuń" zmienia tekst na "Usuwanie...", oba przyciski zostają zablokowane
7. API DELETE /api/tasks/:id jest wywoływane
8. Po sukcesie: modal się zamyka, rodzic odświeża listę zadań
9. Po błędzie: wyświetlany jest komunikat błędu, modal pozostaje otwarty

### Scenariusz 2: Usunięcie listy

1. Użytkownik klika przycisk usunięcia przy liście
2. Rodzic wywołuje `openDialog('list', listId, listName)`
3. Modal otwiera się z komunikatem: "Czy na pewno chcesz usunąć listę „{nazwa}"? Wszystkie zadania na tej liście również zostaną usunięte."
4. Focus automatycznie przenosi się na przycisk "Anuluj"
5. Proces dalszy jak w scenariuszu 1 (kroki 5-9)
6. Po sukcesie: jeśli usunięta lista była aktywna, rodzic musi wybrać inną listę jako aktywną lub pokazać stan pusty

### Interakcje klawiaturowe

| Klawisz | Akcja |
|---------|-------|
| Escape | Zamknięcie modala (jeśli nie trwa usuwanie) |
| Tab | Nawigacja między przyciskami |
| Shift+Tab | Nawigacja wsteczna |
| Enter | Aktywacja zaznaczonego przycisku |
| Space | Aktywacja zaznaczonego przycisku |

## 9. Warunki i walidacja

### Warunki wyświetlania modala

| Warunek | Weryfikacja | Efekt |
|---------|-------------|-------|
| `open === true` | Stan w rodzicu | Modal jest widoczny |
| `itemType` jest zdefiniowany | Props | Wyświetlany odpowiedni komunikat |
| `itemName` jest niepusty | Props | Nazwa elementu w komunikacie |

### Warunki blokowania interakcji

| Warunek | Komponent | Efekt |
|---------|-----------|-------|
| `isDeleting === true` | AlertDialogCancel | Przycisk zablokowany (disabled) |
| `isDeleting === true` | AlertDialogAction | Przycisk zablokowany, tekst "Usuwanie..." |
| `isDeleting === true` | Kliknięcie poza modalem | Ignorowane |
| `isDeleting === true` | Klawisz Escape | Ignorowany |

### Warunki walidacji API (server-side)

| Warunek | Kod błędu | Komunikat dla użytkownika |
|---------|-----------|---------------------------|
| Brak sesji | 401 | Przekierowanie na /login |
| Nieprawidłowy format ID | 400 | "Nieprawidłowy format identyfikatora" |
| Element nie istnieje | 404 | "Element nie został znaleziony" |
| Element należy do innego użytkownika | 404 | "Element nie został znaleziony" |

## 10. Obsługa błędów

### Błąd 401 Unauthorized

**Przyczyna**: Sesja użytkownika wygasła lub użytkownik nie jest zalogowany.

**Obsługa**:
1. Wykrycie kodu 401 w odpowiedzi
2. Automatyczne przekierowanie na stronę logowania (`/login`)
3. Po zalogowaniu użytkownik wraca do poprzedniego widoku

```typescript
if (response.status === 401) {
  window.location.href = '/login';
  return false;
}
```

### Błąd 404 Not Found

**Przyczyna**: Element został już usunięty lub nie należy do użytkownika.

**Obsługa**:
1. Wyświetlenie komunikatu: "Element nie został znaleziony. Mógł zostać już usunięty."
2. Modal pozostaje otwarty, użytkownik może kliknąć "Anuluj"
3. Po zamknięciu modala rodzic powinien odświeżyć widok

```typescript
if (response.status === 404) {
  setError('Element nie został znaleziony. Mógł zostać już usunięty.');
  return false;
}
```

### Błąd sieci

**Przyczyna**: Brak połączenia internetowego lub timeout.

**Obsługa**:
1. Przechwycenie wyjątku w bloku catch
2. Wyświetlenie komunikatu: "Błąd połączenia. Sprawdź połączenie internetowe i spróbuj ponownie."
3. Modal pozostaje otwarty, użytkownik może spróbować ponownie

```typescript
catch {
  setError('Błąd połączenia. Sprawdź połączenie internetowe i spróbuj ponownie.');
  return false;
}
```

### Błąd 500 Internal Server Error

**Przyczyna**: Nieoczekiwany błąd po stronie serwera.

**Obsługa**:
1. Wyświetlenie komunikatu z API lub domyślnego: "Wystąpił błąd podczas usuwania."
2. Modal pozostaje otwarty
3. Użytkownik może spróbować ponownie lub anulować

### Wyświetlanie błędów w UI

Błędy są wyświetlane wewnątrz modala, poniżej opisu, w formie alertu:

```tsx
{error && (
  <div
    role="alert"
    className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm"
  >
    {error}
  </div>
)}
```

## 11. Kroki implementacji

### Krok 1: Instalacja zależności

Dodanie pakietu @radix-ui/react-alert-dialog do projektu:

```bash
npm install @radix-ui/react-alert-dialog
```

### Krok 2: Utworzenie komponentu AlertDialog z Shadcn/ui

Utworzenie pliku `src/components/ui/alert-dialog.tsx` z konfiguracją Shadcn/ui:

```typescript
// Implementacja bazowego AlertDialog zgodna z Shadcn/ui
// Wykorzystanie @radix-ui/react-alert-dialog
// Stylowanie z Tailwind CSS
```

### Krok 3: Utworzenie typów

Utworzenie pliku `src/components/DeleteConfirmationDialog/types.ts`:
- `DeleteItemType`
- `DeleteDialogProps`
- `DeleteConfirmationState`
- `DeleteConfirmationActions`
- `UseDeleteConfirmationReturn`

### Krok 4: Utworzenie custom hooka

Utworzenie pliku `src/components/hooks/useDeleteConfirmation.ts`:
- Implementacja zarządzania stanem modala
- Implementacja logiki wywołań API
- Obsługa błędów i stanów ładowania

### Krok 5: Utworzenie komponentu DeleteConfirmationDialog

Utworzenie pliku `src/components/DeleteConfirmationDialog/DeleteConfirmationDialog.tsx`:
- Wykorzystanie AlertDialog z Shadcn/ui
- Dynamiczny komunikat zależny od `itemType`
- Obsługa stanu ładowania
- Wyświetlanie błędów
- Pełna dostępność (ARIA)

### Krok 6: Utworzenie pliku eksportującego

Utworzenie pliku `src/components/DeleteConfirmationDialog/index.ts`:
- Eksport komponentu
- Eksport typów
- Eksport hooka

### Krok 7: Integracja z komponentami rodzicielskimi

Aktualizacja komponentów wywołujących modal:
- Widok listy zadań - usuwanie zadań
- Panel boczny/widok list - usuwanie list
- Podłączenie hooka `useDeleteConfirmation`
- Obsługa callbacka sukcesu (odświeżanie danych)

### Krok 8: Testy manualne

Weryfikacja scenariuszy:
- Usunięcie zadania - sukces
- Usunięcie zadania - błąd 404
- Usunięcie listy - sukces
- Usunięcie listy - kaskadowe usunięcie zadań
- Usunięcie aktywnej listy - zmiana aktywnej listy
- Anulowanie operacji
- Obsługa klawiatury (Escape, Tab, Enter)
- Dostępność (screen reader)
- Błąd sieci

### Krok 9: Testy dostępności

Weryfikacja z narzędziami:
- Sprawdzenie `role="alertdialog"`
- Sprawdzenie `aria-labelledby` i `aria-describedby`
- Weryfikacja fokus trap
- Testowanie z czytnikiem ekranu