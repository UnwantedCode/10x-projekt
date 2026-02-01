# Plan wdrożenia braków: Modal formularza zadania (tworzenie/edycja)

## 1. Wprowadzenie

Dokument opisuje **braki i doprecyzowania** dla widoku modala tworzenia/edycji zadania w aplikacji AI Task Manager. Obejmuje wyłącznie elementy brakujące, niespójne lub niedookreślone względem PRD i planu implementacji widoku. Nie powiela kroków ani opisu z `doc/view_implementation_plan/task-form-modal-view-implementation-plan.md`.

**Odniesienia:**

- **PRD:** `doc/prd.md` (wymagania 3.3, 3.6, 3.9; historyjki US-009, US-010, US-019–US-022, US-027, US-028)
- **Plan widoku:** `doc/view_implementation_plan/task-form-modal-view-implementation-plan.md`
- **Usuwanie zadania (US-011):** `doc/braki/dashboard-view-plan.md` (Opcja A — przycisk w dialogu edycji)

---

## 2. Zestawienie: co zrobione, co nie, czego brakuje

Stan na podstawie kodu w `src/components/dashboard/` oraz `src/lib/schemas/task.schema.ts`.

### 2.A. Zrobione

| Element | Stan w kodzie |
|--------|----------------|
| **TaskEditDialog** | Jest: modal edycji z `Dialog`, `DialogTitle`, `DialogDescription`, `TaskEditForm`. |
| **TaskEditForm** | Jest: pola tytuł, opis (textarea), priorytet (Select), sekcja AI, walidacja, Zapisz/Anuluj. |
| **InlineTaskInput** | Jest: formularz tworzenia zadania (tytuł, opis, priorytet, AI), bez modala. |
| **AISuggestionButton** | Jest: przycisk „Zasugeruj”, stan ładowania, disabled gdy brak tytułu. |
| **AISuggestionPanel** | Jest: badge priorytetu, uzasadnienie, Akceptuj / Modyfikuj (dropdown) / Odrzuć, RejectionReasonInput. |
| **justificationTags** | Jest: w `AISuggestionPanel` wyświetlane jako `flex-wrap` spanów obok badge’a (linie 67–76). |
| **RejectionReasonInput** | Jest: pole powodu, licznik, Potwierdź/Anuluj, walidacja. |
| **useAISuggestion** | Jest: requestSuggestion, accept/modify/reject, rejestracja decyzji w API, `error` w stanie. |
| **Dropdown „Modyfikuj”** | Jest: tylko 2 priorytety (bez sugerowanego) — `otherPriorities = PRIORITIES.filter(p => p !== suggestedPriority)`. |
| **Walidacja pól** | Jest: tytuł wymagany, limity w formularzach (obecnie 200/2000), błędy inline przy polach. |
| **ARIA w formularzu** | Częściowo: `aria-label`, `aria-describedby`, `aria-invalid` na polach w TaskEditForm i InlineTaskInput. |
| **Dialog ARIA** | Jest: `aria-describedby="edit-task-description"` na `DialogContent`. |

### 2.B. Nie zrobione / niezgodne z planem lub PRD

| Element | Stan | Czego brakuje |
|--------|------|----------------|
| **Limity znaków (3.1)** | Niespójne | Backend: create 500/5000, update 200; frontend 200/2000. Brak ujednolicenia: w `task.schema.ts` (update na 500/5000) i w `TaskEditForm` / `InlineTaskInput` (500/5000) oraz spójnych komunikatów. |
| **Potwierdzenie przy zamknięciu (3.2)** | Brak | W `TaskEditDialog`: `onOpenChange` od razu wywołuje `onClose()` — brak `isDirty`, brak AlertDialog „Masz niezapisane zmiany. Zamknąć?” przy Escape i Anuluj. |
| **Przycisk „Usuń zadanie” (3.3)** | Brak | W `TaskEditDialog` / `TaskEditForm` brak przycisku „Usuń zadanie”, AlertDialog potwierdzenia oraz wywołania `DELETE /api/tasks/:id`. |
| **Błąd AI inline (3.4)** | Tylko toast | `useAISuggestion` ustawia `error` i wywołuje `toast.error()`. W formularzach nie ma wyświetlania `error` inline w sekcji AI ani disabled przycisku „Zasugeruj” z tooltipem po 503. |
| **FormErrorSummary (3.8)** | Brak | Brak osobnego bloku dla `errors.general` (np. błąd sieci/500) nad formularzem; błędy tylko przy polach. |
| **Modal tworzenia (3.10)** | Inline zamiast modala | Tworzenie tylko przez `InlineTaskInput`. Brak modala „Nowe zadanie” z tym samym formularzem co edycja (jeśli plan wymaga modala dla obu trybów). |
| **Draft przy 401 (3.11)** | Brak | Brak zapisu/odczytu draftu w sessionStorage przy 401 i po powrocie na dashboard. |

### 2.C. Zaimplementowane inaczej niż w planie (bez braku funkcji)

| W planie | W kodzie | Uwaga |
|----------|----------|--------|
| **useTaskForm** (hook) | Stan formularza w komponentach (`useState` w TaskEditForm, InlineTaskInput) | Logika w komponentach zamiast wspólnego hooka; funkcjonalnie pokryte. |
| **PrioritySelector** (osobny komponent) | `Select` z Shadcn inline w formularzach | Wybór priorytetu działa; brak osobnego komponentu. |
| **TextareaWithCounter** | Zwykły `<textarea>` z `maxLength` | Brak licznika znaków przy opisie; limity są. |
| **listId w edycji** | TaskEditDialog nie przyjmuje `listId`; edycja po `task.id` | listId nie jest potrzebny w UI edycji; ewentualnie doprecyzować w planie. |

### 2.D. Podsumowanie tabelaryczne

| # | Brak (punkt w dokumencie) | Zrobione? | Czego brakuje (krótko) |
|---|---------------------------|-----------|------------------------|
| 3.1 | Limity tytuł/opis | Nie | Ujednolicenie backend (update 500/5000) i frontend (500/5000). |
| 3.2 | Potwierdzenie przy zamknięciu | Nie | `isDirty` + AlertDialog przy Escape i Anuluj. |
| 3.3 | Usuń zadanie w modalu | Nie | Przycisk „Usuń zadanie”, AlertDialog, DELETE API. |
| 3.4 | Błąd AI (503) inline | Nie | Komunikat inline w sekcji AI + disabled przycisk z tooltipem (obecnie tylko toast). |
| 3.5 | justificationTags | Tak | — |
| 3.6 | Dropdown Modyfikuj (2 vs 3 opcje) | Tak (2 opcje) | Opcjonalnie doprecyzować w planie wariant. |
| 3.7 | listId w trybie edycji | Nie dotyczy | Edycja bez listId w propsach; doprecyzować w planie. |
| 3.8 | FormErrorSummary | Nie | Alert z `errors.general` nad formularzem. |
| 3.9 | a11y (ARIA, focus) | Częściowo | Pełna lista ARIA/focus w planie; ewentualnie aria-busy, zwrot focusu po zamknięciu. |
| 3.10 | Modal create vs inline | Inline | Modal tworzenia tylko jeśli produkt wymaga; inaczej doprecyzować plan. |
| 3.11 | Draft przy 401 | Nie | Zapis/odczyt sessionStorage (opcjonalne). |

---

## 3. Braki i rekomendacje wdrożenia

### 3.1. Niespójność limitów znaków (tytuł, opis)

**Źródło:** PRD nie definiuje limitów; plan widoku podaje tytuł max 500 znaków, opis max 5000; backend i frontend są niespójne.

**Stan:**

- **Backend** (`src/lib/schemas/task.schema.ts`): `createTaskSchema` — tytuł max **500**, opis max **5000**; `updateTaskSchema` — tytuł max **200**, opis bez limitu.
- **Frontend** (np. `TaskEditForm`, `InlineTaskInput`): tytuł max **200**, opis max **2000** (stale).
- **Plan widoku:** walidacja tytułu max 500, opisu max 5000.

**Brak:** Jednolita decyzja co do limitów oraz ich spójne zastosowanie w API, schematach i formularzach.

**Rekomendacja wdrożenia:**

1. **Ustalić docelowe limity** (np. tytuł 500, opis 5000 w całej aplikacji).
2. **Backend:** W `updateTaskSchema` ustawić `title.max(500)` (i ewentualnie `description.max(5000)` jeśli ma być walidacja) tak jak w `createTaskSchema`, aby create i update były zgodne.
3. **Frontend:** W modalu/formularzu zadania (oraz w InlineTaskInput, jeśli używany do tworzenia) ustawić `MAX_TITLE_LENGTH = 500` i `MAX_DESCRIPTION_LENGTH = 5000` oraz te same komunikaty walidacji co w planie widoku.
4. **API AI suggest:** Jeśli endpoint przyjmuje/zwraca tytuł z limitem (np. 200), dopasować do wybranej wartości (500) albo udokumentować celowe obcięcie tylko na wejściu do AI.

Efekt: jeden zestaw limitów w PRD/specyfikacji i ten sam w backendzie oraz we wszystkich formularzach zadania.

---

### 3.2. Potwierdzenie przy zamknięciu z niezapisanymi zmianami

**Źródło:** Plan widoku, sekcja „Interakcje klawiszowe”: „Escape: Zamyka modal (potwierdza jeśli są niezapisane zmiany)” — brak opisu zachowania i UI.

**Brak:** Nie jest określone: (1) kiedy uznawać formularz za „zmieniony” (np. `isDirty`), (2) czy przy Escape i przycisku „Anuluj” pokazywać ten sam dialog potwierdzenia, (3) treść i przyciski dialogu.

**Rekomendacja wdrożenia:**

1. **Wykrywanie zmian:** W hooku formularza (np. `useTaskForm`) porównywać bieżący stan z początkowym (create: pusty formularz; edit: dane z `task`). Flaga `isDirty` = true, gdy tytuł, opis lub priorytet się różnią.
2. **Escape:** Przy `onOpenChange(false)` (lub równoważnym) — jeśli `isDirty`, nie zamykać od razu; pokazać `AlertDialog`: np. „Masz niezapisane zmiany. Zamknąć bez zapisywania?” z przyciskami „Zostań” / „Odrzuć zmiany”. Dopiero po „Odrzuć zmiany” wywołać `onClose()`.
3. **Przycisk „Anuluj”:** To samo zachowanie co przy Escape: przy `isDirty` najpierw dialog potwierdzenia, potem `onClose()` po potwierdzeniu.
4. **Brak zmian:** Przy `!isDirty` zamykać modal bez pytania (Escape i Anuluj).

Doprecyzować w planie widoku lub w tym dokumencie: treść komunikatów (np. po polsku) i które przyciski są primary/secondary.

---

### 3.3. Przycisk „Usuń zadanie” w modalu edycji

**Źródło:** PRD US-011 (usunięcie zadania po potwierdzeniu); `doc/braki/dashboard-view-plan.md` zaleca Opcję A — przycisk w dialogu edycji zadania.

**Brak:** W planie implementacji modala formularza zadania nie ma przycisku „Usuń zadanie” ani przepływu potwierdzenia (AlertDialog) i wywołania `DELETE /api/tasks/:id`.

**Rekomendacja wdrożenia:**

1. W **TaskFormDialog** (lub równoważnym komponencie modala edycji) w trybie **edycja** dodać w stopce przycisk „Usuń zadanie” (wariant destrukcyjny, np. outline/danger), obok „Anuluj” i „Zapisz”.
2. Klik „Usuń zadanie” → otwarcie **AlertDialog** (shadcn/ui) z pytaniem typu: „Czy na pewno chcesz usunąć to zadanie? Tej operacji nie można cofnąć.” oraz przyciski „Anuluj” i „Usuń”.
3. Po „Usuń”: wywołanie `DELETE /api/tasks/:id` (np. z `dashboard.api` lub hooka `useTasks`), zamknięcie modala i AlertDialog, callback `onSuccess` lub odświeżenie listy zadań (szczegóły w `doc/braki/dashboard-view-plan.md`).
4. Obsługa 404/401/5xx zgodnie z planem widoku (toast, ewentualnie przekierowanie przy 401).

Nie powielać tutaj pełnego opisu US-011 — pozostaje w `dashboard-view-plan.md`; tu tylko brak w **widoku modala**: brak przycisku i przepływu usuwania.

---

### 3.4. Miejsce i forma wyświetlania błędu AI (np. 503)

**Źródło:** Plan widoku, sekcja „Obsługa błędów”: przy 503 wyświetlić komunikat i ukryć lub zablokować przycisk „Zasugeruj” z tooltipem.

**Brak:** Nie jest określone, **gdzie** pokazać komunikat (inline pod przyciskiem, Alert w sekcji AI, toast) ani czy po 503 przycisk ma być ukryty, czy zablokowany z tooltipem.

**Rekomendacja wdrożenia:**

1. **Komunikat 503:** Wyświetlać **inline** w sekcji AI (np. pod przyciskiem „Zasugeruj priorytet”) w formie `Alert` (shadcn) lub krótkiego tekstu błędu, np.: „Usługa AI jest chwilowo niedostępna. Możesz ustawić priorytet ręcznie.”
2. **Przycisk „Zasugeruj priorytet”:** Po wystąpieniu błędu 503 pozostawić przycisk widoczny, ale **disabled** z `title`/`aria-label` (tooltip): np. „Usługa AI jest niedostępna”.
3. Po ponownym udanym żądaniu AI (np. po odświeżeniu) czyścić błąd i odblokować przycisk.

Doprecyzować w planie widoku: „błąd AI wyświetlany inline w sekcji AISuggestionSection”.

---

### 3.5. Wyświetlanie tagów uzasadnienia (justificationTags)

**Źródło:** Plan widoku i typ `AISuggestionDTO` — pole `justificationTags: string[]`; w planie: „Tagi uzasadnienia (opcjonalne)” w AISuggestionPanel bez opisu prezentacji.

**Brak:** Nie jest określone, jak renderować tagi (badge, chip, lista, kolejność).

**Rekomendacja wdrożenia:**

1. W **AISuggestionPanel** pod lub obok tekstu uzasadnienia wyświetlać `justificationTags` jako listę **badge’y** (shadcn Badge) lub chipów w jednej linii z zawijaniem.
2. Jeśli `justificationTags` jest puste lub undefined, nie renderować sekcji tagów.
3. Zachować dostępność: np. `aria-label="Tagi uzasadnienia"` dla kontenera, pojedyncze tagi jako tekst.

Opcjonalnie doprecyzować w planie widoku: „Tagi jako badge’y pod uzasadnieniem, jedna linia z zawijaniem”.

---

### 3.6. Dropdown „Modyfikuj” w panelu sugestii AI

**Źródło:** Plan widoku: „Rozwija się dropdown z priorytetami (bez sugerowanego)”.

**Brak:** Nie jest jasne, czy użytkownik wybiera **tylko** dwa pozostałe priorytety (bez sugerowanego), czy wszystkie trzy z wizualnym wyróżnieniem sugerowanego.

**Rekomendacja wdrożenia:**

1. **Wariant zalecany:** Dropdown pokazuje **wszystkie trzy** priorytety (Niski, Średni, Wysoki). Sugerowany priorytet jest już widoczny w panelu (Badge); wybór w dropdownie „Modyfikuj” oznacza świadomą **modyfikację** na inny niż sugerowany. Nie trzeba ukrywać sugerowanego w liście — użytkownik i tak wybiera inny.
2. **Alternatywa:** W dropdownie pokazać tylko **dwa** priorytety (te różne od sugerowanego), aby uprościć wybór. Wymaga mapowania `suggestedPriority` na brakujące opcje.
3. W planie widoku doprecyzować wybrany wariant (np. „dropdown z trzema opcjami; sugerowany już wyświetlony w panelu”).

---

### 3.7. Wymagany parametr listId w trybie edycji

**Źródło:** Plan widoku — `TaskFormDialogProps` zawiera `listId: string` jako wymagane.

**Brak:** W trybie edycji zadanie (`task`) już zawiera `listId`; nie jest opisane, że w trybie edycji `listId` może być pochodne z `task.listId`, aby uniknąć zbędnego przekazywania z zewnątrz.

**Rekomendacja wdrożenia:**

1. W **TaskFormDialog** (lub równoważnym): jeśli `task` jest podane (tryb edycja), używać `listId = task.listId` do wywołań API (np. kontekst listy). Prop `listId` pozostawić wymagany tylko w trybie **tworzenia** (gdy brak `task`).
2. Typ propsy: `listId: string` gdy `task` undefined; przy `task` — `listId` opcjonalny (wewnętrznie `listId ?? task.listId`). Albo zawsze wymagany `listId` z parenta, a w edycji parent przekazuje `listId` z wybranego zadania — wtedy doprecyzować w planie: „w trybie edycji przekazać `listId` z `task.listId`”.

Doprecyzować w planie widoku jednoznacznie: skąd bierzemy `listId` w trybie edycji.

---

### 3.8. Komponent FormErrorSummary

**Źródło:** Plan widoku — w strukturze komponentów występuje „FormErrorSummary” (podsumowanie błędów); brak osobnej sekcji opisu.

**Brak:** Nie jest określone, czy to osobny komponent, gdzie jest umieszczony (np. nad formularzem, pod polami), czy wyświetla tylko błąd `general`, czy także zestaw błędów pól.

**Rekomendacja wdrożenia:**

1. **Opcja A:** Jeden blok nad lub pod formularzem: jeśli `errors.general` — wyświetlić `Alert` z tym komunikatem; opcjonalnie lista błędów pól (title, description, priority) jako tekst.
2. **Opcja B:** Błędy pól tylko przy polach (inline); FormErrorSummary tylko dla `errors.general` (np. błąd sieci, 500) w formie jednego Alertu na górze formularza.
3. W planie widoku doprecyzować: „FormErrorSummary — Alert z `errors.general`, umieszczony pod nagłówkiem dialogu / nad polami; błędy pól wyłącznie inline przy polach” (lub wybrana wersja).

---

### 3.9. Dostępność (a11y) — doprecyzowanie

**Źródło:** Plan widoku — testy dostępności (focus trap, ARIA, klawiatura); brak szczegółów dla modala i sekcji AI.

**Brak:** Brak listy atrybutów ARIA i zachowań dla przycisków AI („Zasugeruj”, „Akceptuj”, „Modyfikuj”, „Odrzuć”), pól formularza oraz przycisku „Usuń zadanie”.

**Rekomendacja wdrożenia:**

1. **Dialog:** `aria-labelledby` na tytuł, `aria-describedby` na opcjonalny opis; focus trap wewnątrz modala; po zamknięciu zwrot focusu do elementu otwierającego (np. przycisk „Dodaj zadanie” lub karta zadania).
2. **Przyciski:** „Zasugeruj priorytet” — `aria-busy` gdy `isLoading`, `aria-label="Zasugeruj priorytet na podstawie opisu"`. W panelu AI: „Akceptuj” / „Modyfikuj” / „Odrzuć” z czytelnymi `aria-label` w kontekście (np. „Akceptuj sugerowany priorytet”).
3. **Pola:** Każde pole z `id`, powiązane `Label` z `htmlFor`; błędy walidacji powiązane przez `aria-describedby` lub `aria-errormessage` (React 19 / ARIA 1.2).
4. **Usuń zadanie:** Przycisk z `aria-label="Usuń zadanie"` oraz w AlertDialog — tytuł i opis czytelne dla czytników ekranu.

Doprecyzować w planie widoku krótką listę wymaganych atrybutów ARIA i zachowań focusu dla tego modala.

---

### 3.10. Tryb tworzenia: modal vs inline

**Źródło:** Plan widoku — modal otwierany przyciskiem „Dodaj zadanie” (tryb tworzenia) oraz przy edycji (tryb edycji). Obecna implementacja: **TaskEditDialog** tylko dla edycji; **InlineTaskInput** do dodawania zadań (bez modala).

**Brak:** Rozbieżność między planem (modal dla obu trybów) a możliwą implementacją (tworzenie inline). Nie jest ustalone, czy wymagany jest **modal tworzenia** zgodny z planem.

**Rekomendacja wdrożenia:**

1. **Jeśli produkt ma mieć modal także do tworzenia** (zgodnie z planem widoku):
   - Wprowadzić **TaskFormDialog** (lub rozszerzyć istniejący) z trybem create: `task === undefined`, `listId` wymagany, tytuł dialogu „Nowe zadanie”.
   - Przycisk „Dodaj zadanie” na liście otwiera ten modal zamiast (lub oprócz) InlineTaskInput.
   - Formularz w modalu — ten sam zestaw pól i AI co w edycji (zgodnie z planem).
2. **Jeśli tworzenie ma pozostawać inline** (InlineTaskInput):
   - Zaktualizować plan widoku: „Tworzenie zadania odbywa się w formularzu inline (InlineTaskInput); modal służy wyłącznie do edycji.” oraz upewnić się, że InlineTaskInput spełnia US-009 i limit znaków (patrz 3.1).

W dokumencie braków: **uznać za brak** brak modala tworzenia tylko wtedy, gdy decyzja produktowa jest „modal dla obu trybów”. W przeciwnym razie — doprecyzować w planie widoku wybór „inline create / modal edit”.

---

### 3.11. Zachowanie danych formularza przy 401 (opcjonalne)

**Źródło:** Plan widoku — „Opcjonalnie: zachowaj dane formularza w sessionStorage do przywrócenia po zalogowaniu”.

**Brak:** Brak opisu, kiedy zapisywać (przed przekierowaniem?), kiedy czytać i czyść (po powrocie na stronę dashboardu?), oraz formatu danych.

**Rekomendacja wdrożenia (opcjonalna):**

1. Przy odpowiedzi 401 w trakcie submit lub żądania AI: przed przekierowaniem do logowania zapisać w `sessionStorage` klucz np. `taskFormDraft` z wartością `JSON.stringify({ listId, title, description, priority, mode: 'create' | 'edit', taskId? })`.
2. Po powrocie na stronę z listą zadań (po zalogowaniu): w komponencie nadrzędnym sprawdzić `sessionStorage.taskFormDraft`; jeśli istnieje, opcjonalnie otworzyć modal tworzenia/edycji z uzupełnionymi polami i wyczyścić klucz.
3. Ograniczenie: nie trzymać draftu w nieskończoność (np. tylko do pierwszej udanej akcji lub do zamknięcia karty).

Jeśli ta funkcja nie jest w scope MVP, w planie widoku doprecyzować: „Przy 401 nie zachowujemy draftu; tylko przekierowanie do logowania.”

---

## 4. Podsumowanie priorytetów

| Punkt | Skrót braku | Priorytet |
|-------|-------------|-----------|
| 3.1 | Niespójność limitów tytułu/opisu (backend vs frontend vs plan) | Wysoki |
| 3.2 | Potwierdzenie przy zamknięciu (Escape/Anuluj) z niezapisanymi zmianami | Średni |
| 3.3 | Przycisk „Usuń zadanie” i przepływ potwierdzenia w modalu edycji | Wysoki (US-011) |
| 3.4 | Miejsce i forma błędu AI (503) | Niski |
| 3.5 | Wyświetlanie justificationTags | Niski |
| 3.6 | Zachowanie dropdownu „Modyfikuj” (2 vs 3 opcje) | Niski |
| 3.7 | listId w trybie edycji (skąd brać) | Niski |
| 3.8 | FormErrorSummary — rola i umieszczenie | Niski |
| 3.9 | Doprecyzowanie a11y (ARIA, focus) | Średni |
| 3.10 | Spójność: modal create vs inline create | Średni (decyzja produktowa) |
| 3.11 | Draft w sessionStorage przy 401 (opcjonalne) | Opcjonalny |

Wdrożenie punktów 3.1 i 3.3 jest niezbędne dla zgodności z PRD (limity i US-011). Pozostałe usprawniają spójność z planem widoku i UX.
